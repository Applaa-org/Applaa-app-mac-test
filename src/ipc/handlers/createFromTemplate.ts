import path from "path";
import fs from "fs-extra";
import git from "isomorphic-git";
import http from "isomorphic-git/http/node";
import { app } from "electron";
import { spawn } from "child_process";
import { copyDirectoryRecursive } from "../utils/file_utils";
import { readSettings } from "../../main/settings";
import { getTemplateOrThrow } from "../utils/template_utils";
import log from "electron-log";
import { getEssentialPackages } from "../../config/expo-dependencies";

const logger = log.scope("createFromTemplate");

export async function createFromTemplate({
  fullAppPath,
  templateId: overrideTemplateId,
}: {
  fullAppPath: string;
  templateId?: string;
}) {
  const settings = readSettings();
  const templateId = overrideTemplateId || settings.selectedTemplateId;

  if (templateId === "react") {
    // Use local React template with Applaa branding
    // Try multiple path resolution strategies for development and production
    const appPath = app.getAppPath();
    const possiblePaths = [
      path.join(appPath, "webapp-templates", "react"),           // Production: bundled with app
      path.join(process.cwd(), "webapp-templates", "react"),     // Development: relative to cwd
      path.join(appPath, "scaffold"),                            // Legacy fallback: scaffold
      path.join(process.cwd(), "scaffold")                       // Legacy fallback: scaffold from cwd
    ];
    
    for (const templatePath of possiblePaths) {
      if (fs.existsSync(templatePath)) {
        logger.info(`Using React template from: ${templatePath}`);
        await copyDirectoryRecursive(templatePath, fullAppPath);
        return;
      }
    }
    
    throw new Error(`Local React template not found. Tried paths: ${possiblePaths.join(', ')}`);
  }

  if (templateId === "next") {
    // Use local Next.js template with Applaa branding (fallback to GitHub if not available)
    const appPath = app.getAppPath();
    const possiblePaths = [
      path.join(appPath, "webapp-templates", "nextjs"),
      path.join(process.cwd(), "webapp-templates", "nextjs")
    ];
    
    for (const templatePath of possiblePaths) {
      if (fs.existsSync(templatePath)) {
        logger.info(`Using Next.js template from: ${templatePath}`);
        await copyDirectoryRecursive(templatePath, fullAppPath);
        return;
      }
    }
    
    // Fallback to GitHub template for now
    const template = await getTemplateOrThrow("next");
    if (template.githubUrl) {
      const repoCachePath = await cloneRepo(template.githubUrl);
      await copyRepoToApp(repoCachePath, fullAppPath);
      return;
    }
    throw new Error(`Neither local nor GitHub Next.js template available. Tried paths: ${possiblePaths.join(', ')}`);
  }

  if (templateId === "portal-mini-store") {
    // Use local Portal Mini Store template with Applaa branding
    const appPath = app.getAppPath();
    const possiblePaths = [
      path.join(appPath, "webapp-templates", "portal-mini-store"),
      path.join(process.cwd(), "webapp-templates", "portal-mini-store")
    ];
    
    for (const templatePath of possiblePaths) {
      if (fs.existsSync(templatePath)) {
        logger.info(`Using Portal Mini Store template from: ${templatePath}`);
        await copyDirectoryRecursive(templatePath, fullAppPath);
        return;
      }
    }
    
    // Fallback to GitHub template for now
    const template = await getTemplateOrThrow("portal-mini-store");
    if (template.githubUrl) {
      const repoCachePath = await cloneRepo(template.githubUrl);
      await copyRepoToApp(repoCachePath, fullAppPath);
      return;
    }
    throw new Error(`Neither local nor GitHub Portal Mini Store template available. Tried paths: ${possiblePaths.join(', ')}`);
  }

        if (templateId === "expo-base-master") {
        // Use the working Expo Router example from the old codebase
        logger.info(`Creating Expo app with router example at: ${fullAppPath}`);
        await scaffoldExpoApp({ fullAppPath, example: "with-router" }); // Use working example from old code
        
        // Update app.json with proper app configuration
        const appJsonPath = path.join(fullAppPath, "app.json");
        if (fs.existsSync(appJsonPath)) {
          const appJson = await fs.readJson(appJsonPath);
          const appName = path.basename(fullAppPath);
          
          // Update basic app info
          appJson.expo.name = appName;
          appJson.expo.slug = appName;
          
          // Add bundle identifiers for app stores
          if (!appJson.expo.ios) appJson.expo.ios = {};
          if (!appJson.expo.android) appJson.expo.android = {};
          
          appJson.expo.ios.bundleIdentifier = `com.applaa.${appName.replace(/[^a-zA-Z0-9]/g, '')}`;
          appJson.expo.android.package = `com.applaa.${appName.replace(/[^a-zA-Z0-9]/g, '')}`;
          
          await fs.writeJson(appJsonPath, appJson, { spaces: 2 });
        }
        
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

  // Run: pnpm dlx create-expo-app@latest <appFolderName> --yes --no-install
  // Fallback to npx if pnpm is not available. We set cwd to the parent so
  // the folder is created with the desired name.
  const runScaffold = async (tool: "pnpm" | "npx") => new Promise<void>((resolve, reject) => {
    const baseArgs = tool === "pnpm" ? ["dlx", "create-expo-app@latest", appFolderName] : ["create-expo-app@latest", appFolderName];
    if (template) {
      baseArgs.push("-t", template);
    } else if (example) {
      baseArgs.push("--example", example);
    } else {
      baseArgs.push("-t", "tabs");
    }
    baseArgs.push("--yes", "--no-install");

    const child = spawn(tool, baseArgs, {
      cwd: dirName,
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        EXPO_NO_DOCTOR: "1",
        EXPO_NO_UPDATE_CHECK: "1",
        CI: "1",
      },
    });

    child.stdout?.on("data", (data) => logger.debug(`[create-expo-app:${tool}] ${data.toString()}`));
    child.stderr?.on("data", (data) => logger.warn(`[create-expo-app:${tool}:err] ${data.toString()}`));
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`${tool} create-expo-app exited with code ${code}`))));
  });

  try {
    await runScaffold("pnpm");
    logger.info("Scaffolded Expo app using pnpm dlx (no install)");
  } catch (e) {
    logger.warn("pnpm not available for scaffolding, falling back to npx:", e);
    await runScaffold("npx");
  }

  // Install dependencies using pnpm for global store + hard links (disk savings)
  const runInstall = async (tool: "pnpm" | "npm") => new Promise<void>((resolve, reject) => {
    const args = tool === "pnpm" ? ["install"] : ["install"];
    const child = spawn(tool, args, {
      cwd: fullAppPath,
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout?.on("data", (d) => logger.debug(`[${tool} install] ${d.toString()}`));
    child.stderr?.on("data", (d) => logger.warn(`[${tool} install:err] ${d.toString()}`));
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`${tool} install exited ${code}`))));
  });

  try {
    await runInstall("pnpm");
    logger.info("Installed dependencies with pnpm (shared store, hard links)");
  } catch (e) {
    logger.warn("pnpm install failed or unavailable, falling back to npm install:", e);
    await runInstall("npm");
  }

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

    // Add web dependencies for Expo web support
    logger.info("Installing web dependencies for Expo web support");
    try {
      await new Promise<void>((resolve, reject) => {
        // Use expo install for proper version compatibility
        const child = spawn("npx", ["expo", "install", "react-dom", "react-native-web", "@expo/metro-runtime"], {
          cwd: fullAppPath,
          shell: true,
          stdio: ["ignore", "pipe", "pipe"],
          env: {
            ...process.env,
            EXPO_NO_DOCTOR: "1",
            EXPO_NO_UPDATE_CHECK: "1",
          },
        });
        
        child.stdout?.on("data", (data) => {
          logger.debug(`[expo install web deps] ${data.toString()}`);
        });
        child.stderr?.on("data", (data) => {
          logger.warn(`[expo install web deps:err] ${data.toString()}`);
        });
        child.on("error", reject);
        child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`expo install web deps exited ${code}`))));
      });
      
      logger.info("Web dependencies installed successfully");
    } catch (err) {
      logger.warn("Failed to install web dependencies:", err);
    }

    // Add essential mobile dependencies for Applaa apps
    const essentialPackages = getEssentialPackages();
    logger.info(`Installing essential mobile dependencies: ${essentialPackages.join(", ")}`);
    try {
      await new Promise<void>((resolve, reject) => {
        // Use expo install for proper version compatibility
        const child = spawn("npx", ["expo", "install", ...essentialPackages], {
          cwd: fullAppPath,
          shell: true,
          stdio: ["ignore", "pipe", "pipe"],
          env: {
            ...process.env,
            EXPO_NO_DOCTOR: "1",
            EXPO_NO_UPDATE_CHECK: "1",
          },
        });
        
        child.stdout?.on("data", (data) => {
          logger.debug(`[expo install mobile deps] ${data.toString()}`);
        });
        child.stderr?.on("data", (data) => {
          logger.warn(`[expo install mobile deps:err] ${data.toString()}`);
        });
        child.on("error", reject);
        child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`expo install mobile deps exited ${code}`))));
      });
      
      logger.info("Essential mobile dependencies installed successfully");
    } catch (err) {
      logger.warn("Failed to install mobile dependencies:", err);
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
