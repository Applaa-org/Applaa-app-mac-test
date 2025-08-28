import path from "path";
import fs from "fs-extra";
import git from "isomorphic-git";
import http from "isomorphic-git/http/node";
import { app } from "electron";
import { spawn } from "child_process";
import { copyDirectoryRecursive } from "../utils/file_utils";
import { readSettings } from "@/main/settings";
import { getTemplateOrThrow } from "../utils/template_utils";
import log from "electron-log";

const logger = log.scope("createFromTemplate");

export async function createFromTemplate({
  fullAppPath,
}: {
  fullAppPath: string;
}) {
  const settings = readSettings();
  const templateId = settings.selectedTemplateId;

  if (templateId === "react") {
    await copyDirectoryRecursive(
      path.join(__dirname, "..", "..", "scaffold"),
      fullAppPath,
    );
    return;
  }

  if (templateId === "expo-base-master") {
    // Use the minimal Expo Router example to avoid extra files and keep a clean base
    await scaffoldExpoApp({ fullAppPath, example: "with-router" });
    return;
  }

  const template = await getTemplateOrThrow(templateId);
  if (!template.githubUrl) {
    throw new Error(`Template ${templateId} has no GitHub URL`);
  }
  const repoCachePath = await cloneRepo(template.githubUrl);
  await copyRepoToApp(repoCachePath, fullAppPath);
}

/**
 * Scaffolds an Expo app using the official create-expo-app with an example/template.
 * Defaults to the stable "with-typescript" example for a solid TS foundation.
 * Runs non-interactively and installs dependencies.
 */
async function scaffoldExpoApp({
  fullAppPath,
  template,
  example,
}: {
  fullAppPath: string;
  template?: string; // preferred modern path (e.g., "tabs")
  example?: string; // fallback legacy examples (e.g., "with-typescript")
}): Promise<void> {
  const dirName = path.dirname(fullAppPath);
  const appFolderName = path.basename(fullAppPath);

  logger.info(
    `Creating Expo app using create-expo-app (example=${example}) at ${fullAppPath}`,
  );

  await fs.ensureDir(dirName);

  // Run: npx create-expo-app@latest <appFolderName> -t <template> --yes
  // We set cwd to the parent so the folder is created with the desired name.
  await new Promise<void>((resolve, reject) => {
    const args = ["create-expo-app@latest", appFolderName];
    if (template) {
      args.push("-t", template);
    } else if (example) {
      args.push("--example", example);
    } else {
      args.push("-t", "tabs");
    }
    args.push("--yes");

    const child = spawn(
      "npx",
      args,
      {
        cwd: dirName,
        shell: true,
        stdio: ["ignore", "pipe", "pipe"],
        env: {
          ...process.env,
          // Make scaffolding deterministic and skip doctor/update checks
          EXPO_NO_DOCTOR: "1",
          EXPO_NO_UPDATE_CHECK: "1",
          CI: "1",
        },
      },
    );

    child.stdout?.on("data", (data) => {
      logger.debug(`[create-expo-app] ${data.toString()}`);
    });
    child.stderr?.on("data", (data) => {
      logger.warn(`[create-expo-app:err] ${data.toString()}`);
    });
    child.on("error", (err) => {
      logger.error("Failed to launch create-expo-app:", err);
      reject(err);
    });
    child.on("close", (code) => {
      if (code === 0) {
        logger.info("create-expo-app finished successfully");
        resolve();
      } else {
        reject(new Error(`create-expo-app exited with code ${code}`));
      }
    });
  });

  // Ensure .gitignore exists (it should by default)
  const gitignorePath = path.join(fullAppPath, ".gitignore");
  if (!(await fs.pathExists(gitignorePath))) {
    await fs.writeFile(
      gitignorePath,
      ["node_modules", ".expo", "dist", "web-build"].join("\n"),
    );
  }

  // Ensure TypeScript is available for our TSC worker even if the template didn't add it
  try {
    const pkgPath = path.join(fullAppPath, "package.json");
    const pkg = JSON.parse(await fs.readFile(pkgPath, "utf8"));
    const hasTs = Boolean(pkg.devDependencies?.typescript || pkg.dependencies?.typescript);

    if (!hasTs) {
      logger.info("Adding devDependency: typescript (required by problem checker)");

      // Pick package manager based on lockfiles; default to npm
      let manager: "npm" | "pnpm" | "yarn" = "npm";
      const hasPackageLock = await fs.pathExists(path.join(fullAppPath, "package-lock.json"));
      const hasPnpmLock = await fs.pathExists(path.join(fullAppPath, "pnpm-lock.yaml"));
      const hasYarnLock = await fs.pathExists(path.join(fullAppPath, "yarn.lock"));
      if (hasPackageLock) manager = "npm"; else if (hasPnpmLock) manager = "pnpm"; else if (hasYarnLock) manager = "yarn";

      await new Promise<void>((resolve, reject) => {
        const args = manager === "npm"
          ? ["install", "-D", "typescript"]
          : manager === "pnpm"
          ? ["add", "-D", "typescript"]
          : ["add", "-D", "typescript"]; // yarn

        const child = spawn(manager, args, {
          cwd: fullAppPath,
          shell: true,
          stdio: ["ignore", "pipe", "pipe"],
        });
        child.on("error", reject);
        child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`${manager} exited ${code}`))));
      });
    }

    // Ensure a tsconfig.json exists so our TypeScript problem checker can run
    const tsconfigPath = path.join(fullAppPath, "tsconfig.json");
    if (!(await fs.pathExists(tsconfigPath))) {
      logger.info("Creating minimal tsconfig.json for Expo");
      const tsconfig = {
        extends: "expo/tsconfig.base",
        compilerOptions: {
          jsx: "react-jsx",
          strict: true,
          noFallthroughCasesInSwitch: true,
        },
        include: ["**/*.ts", "**/*.tsx"],
        exclude: ["node_modules", "dist", "web-build"],
      } as any;
      await fs.writeFile(tsconfigPath, JSON.stringify(tsconfig, null, 2));
    }

    // Expo on web requires @types/react for TS projects
    const hasTypesReact = Boolean(
      pkg.devDependencies?.["@types/react"] || pkg.dependencies?.["@types/react"],
    );
    if (!hasTypesReact) {
      logger.info("Installing @types/react for Expo TS support");
      let manager: "npm" | "pnpm" | "yarn" = "npm";
      const hasPackageLock = await fs.pathExists(path.join(fullAppPath, "package-lock.json"));
      const hasPnpmLock = await fs.pathExists(path.join(fullAppPath, "pnpm-lock.yaml"));
      const hasYarnLock = await fs.pathExists(path.join(fullAppPath, "yarn.lock"));
      if (hasPackageLock) manager = "npm"; else if (hasPnpmLock) manager = "pnpm"; else if (hasYarnLock) manager = "yarn";

      // Pin to a React 19 compatible minor per Expo guidance
      const args = manager === "npm"
        ? ["install", "-D", "@types/react@~19.0.10"]
        : manager === "pnpm"
        ? ["add", "-D", "@types/react@~19.0.10"]
        : ["add", "-D", "@types/react@~19.0.10"]; // yarn

      await new Promise<void>((resolve, reject) => {
        const child = spawn(manager, args, {
          cwd: fullAppPath,
          shell: true,
          stdio: ["ignore", "pipe", "pipe"],
        });
        child.on("error", reject);
        child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`${manager} exited ${code}`))));
      });
    }
  } catch (e) {
    logger.warn("Failed ensuring TypeScript is installed:", e);
  }
}

async function cloneRepo(repoUrl: string): Promise<string> {
  let orgName: string;
  let repoName: string;

  const url = new URL(repoUrl);
  if (url.protocol !== "https:") {
    throw new Error("Repository URL must use HTTPS.");
  }
  if (url.hostname !== "github.com") {
    throw new Error("Repository URL must be a github.com URL.");
  }

  // Pathname will be like "/org/repo" or "/org/repo.git"
  const pathParts = url.pathname.split("/").filter((part) => part.length > 0);

  if (pathParts.length !== 2) {
    throw new Error(
      "Invalid repository URL format. Expected 'https://github.com/org/repo'",
    );
  }

  orgName = pathParts[0];
  repoName = path.basename(pathParts[1], ".git"); // Remove .git suffix if present

  if (!orgName || !repoName) {
    // This case should ideally be caught by pathParts.length !== 2
    throw new Error(
      "Failed to parse organization or repository name from URL.",
    );
  }
  logger.info(`Parsed org: ${orgName}, repo: ${repoName} from ${repoUrl}`);

  const cachePath = path.join(
    app.getPath("userData"),
    "templates",
    orgName,
    repoName,
  );

  if (fs.existsSync(cachePath)) {
    try {
      logger.info(
        `Repo ${repoName} already exists in cache at ${cachePath}. Checking for updates.`,
      );

      // Construct GitHub API URL
      const apiUrl = `https://api.github.com/repos/${orgName}/${repoName}/commits/HEAD`;
      logger.info(`Fetching remote SHA from ${apiUrl}`);

      let remoteSha: string | undefined;

      const response = await http.request({
        url: apiUrl,
        method: "GET",
        headers: {
          "User-Agent": "Dyad", // GitHub API requires a User-Agent
          Accept: "application/vnd.github.v3+json",
        },
      });

      if (response.statusCode === 200 && response.body) {
        // Convert AsyncIterableIterator<Uint8Array> to string
        const chunks: Uint8Array[] = [];
        for await (const chunk of response.body) {
          chunks.push(chunk);
        }
        const responseBodyStr = Buffer.concat(chunks).toString("utf8");
        const commitData = JSON.parse(responseBodyStr);
        remoteSha = commitData.sha;
        if (!remoteSha) {
          throw new Error("SHA not found in GitHub API response.");
        }
        logger.info(`Successfully fetched remote SHA: ${remoteSha}`);
      } else {
        throw new Error(
          `GitHub API request failed with status ${response.statusCode}: ${response.statusMessage}`,
        );
      }

      const localSha = await git.resolveRef({
        fs,
        dir: cachePath,
        ref: "HEAD",
      });

      if (remoteSha === localSha) {
        logger.info(
          `Local cache for ${repoName} is up to date (SHA: ${localSha}). Skipping clone.`,
        );
        return cachePath;
      } else {
        logger.info(
          `Local cache for ${repoName} (SHA: ${localSha}) is outdated (Remote SHA: ${remoteSha}). Removing and re-cloning.`,
        );
        fs.rmSync(cachePath, { recursive: true, force: true });
        // Proceed to clone
      }
    } catch (err) {
      logger.warn(
        `Error checking for updates or comparing SHAs for ${repoName} at ${cachePath}. Will attempt to re-clone. Error: `,
        err,
      );
      return cachePath;
    }
  }

  fs.ensureDirSync(path.dirname(cachePath));

  logger.info(`Cloning ${repoUrl} to ${cachePath}`);
  try {
    await git.clone({
      fs,
      http,
      dir: cachePath,
      url: repoUrl,
      singleBranch: true,
      depth: 1,
    });
    logger.info(`Successfully cloned ${repoUrl} to ${cachePath}`);
  } catch (err) {
    logger.error(`Failed to clone ${repoUrl} to ${cachePath}: `, err);
    throw err; // Re-throw the error after logging
  }
  return cachePath;
}

async function copyRepoToApp(repoCachePath: string, appPath: string) {
  logger.info(`Copying from ${repoCachePath} to ${appPath}`);
  try {
    await fs.copy(repoCachePath, appPath, {
      filter: (src, _dest) => {
        const excludedDirs = ["node_modules", ".git"];
        const relativeSrc = path.relative(repoCachePath, src);
        if (excludedDirs.includes(path.basename(relativeSrc))) {
          logger.info(`Excluding ${src} from copy`);
          return false;
        }
        return true;
      },
    });
    logger.info("Finished copying repository contents.");
  } catch (err) {
    logger.error(
      `Error copying repository from ${repoCachePath} to ${appPath}: `,
      err,
    );
    throw err; // Re-throw the error after logging
  }
}
