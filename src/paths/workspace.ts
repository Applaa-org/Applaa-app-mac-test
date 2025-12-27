import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import log from "electron-log";
import { readSettings } from "../main/settings";

const logger = log.scope("workspace");

export type AppKind = "web" | "mobile" | "godot" | "blockly" | "arcade" | "microbit" | "minecraft";

/**
 * Returns the workspace root directory where all apps/packages live.
 * Uses settings.customAppsDirectory if provided, otherwise defaults to
 * %USERPROFILE%/applaa-workspace for clarity (distinct from legacy applaa-apps).
 */
export function getWorkspaceRoot(): string {
  const settings = readSettings();
  const base = settings.customAppsDirectory || path.join(os.homedir(), "applaa-workspace");
  return base;
}

/**
 * Sanitizes app name to remove invalid characters for file system paths
 * Windows: < > : " | ? * \ /
 * Unix: / and null bytes
 */
function sanitizeAppName(name: string): string {
  // Replace invalid characters with hyphens
  // Windows invalid chars: < > : " | ? * \ /
  // Also handle leading/trailing spaces and dots
  let sanitized = name
    .replace(/[<>:"|?*\\/]/g, "-")  // Replace invalid chars with hyphens
    .replace(/\s+/g, "-")            // Replace spaces with hyphens
    .replace(/\.+$/, "")              // Remove trailing dots
    .replace(/^\.+/, "")             // Remove leading dots
    .replace(/-+/g, "-")             // Collapse multiple hyphens
    .replace(/^-+/, "")              // Remove leading hyphens
    .replace(/-+$/, "");             // Remove trailing hyphens

  // Ensure it's not empty
  if (!sanitized || sanitized.length === 0) {
    sanitized = "app";
  }

  // Limit length to avoid path issues
  if (sanitized.length > 100) {
    sanitized = sanitized.substring(0, 100);
  }

  return sanitized;
}

/**
 * Returns the relative path under the workspace for a given app name and kind
 * e.g. apps/web/my-app or apps/mobile/my-app
 * App name is sanitized to remove invalid file system characters
 */
export function getAppRelativePath(appName: string, kind: AppKind): string {
  const sanitizedName = sanitizeAppName(appName);
  return path.join("apps", kind, sanitizedName);
}

/**
 * Ensure the workspace is initialized with standard folders and pnpm workspace files.
 * Uses hermetic runtime for optimal package manager setup.
 * Idempotent and safe to call multiple times.
 */
export async function ensureWorkspaceInitialized(): Promise<void> {
  const root = getWorkspaceRoot();

  try {
    // Use hermetic runtime for workspace initialization
    const { initializeWorkspace } = await import("../lib/hermetic-runtime");
    const success = await initializeWorkspace(root);

    if (success) {
      logger.info(`✅ Workspace initialized with hermetic runtime at ${root}`);
    } else {
      logger.warn("⚠️ Hermetic workspace initialization failed, using fallback");
      // Fallback to basic initialization
      await fallbackWorkspaceInit(root);
    }
  } catch (error) {
    logger.error("Failed to initialize workspace with hermetic runtime:", error);
    // Fallback to basic initialization
    await fallbackWorkspaceInit(root);
  }
}

/**
 * Fallback workspace initialization without hermetic runtime
 */
async function fallbackWorkspaceInit(root: string): Promise<void> {
  fs.mkdirSync(root, { recursive: true });
  fs.mkdirSync(path.join(root, "apps", "web"), { recursive: true });
  fs.mkdirSync(path.join(root, "apps", "mobile"), { recursive: true });
  fs.mkdirSync(path.join(root, "apps", "godot"), { recursive: true });
  fs.mkdirSync(path.join(root, "apps", "blockly"), { recursive: true });
  fs.mkdirSync(path.join(root, "apps", "arcade"), { recursive: true });
  fs.mkdirSync(path.join(root, "apps", "microbit"), { recursive: true });
  fs.mkdirSync(path.join(root, "apps", "minecraft"), { recursive: true });
  fs.mkdirSync(path.join(root, "packages"), { recursive: true });

  // pnpm-workspace.yaml
  const workspaceYamlPath = path.join(root, "pnpm-workspace.yaml");
  if (!fs.existsSync(workspaceYamlPath)) {
    const yaml = [
      "packages:",
      "  - 'apps/web/*'",
      "  - 'apps/mobile/*'",
      "  - 'packages/*'",
      ""
    ].join("\n");
    fs.writeFileSync(workspaceYamlPath, yaml, "utf8");
    logger.info(`Created pnpm-workspace.yaml at ${workspaceYamlPath}`);
  }

  // .npmrc with React Native friendly settings
  const npmrcPath = path.join(root, ".npmrc");
  if (!fs.existsSync(npmrcPath)) {
    const npmrc = [
      "shamefully-hoist=true",
      "strict-peer-dependencies=false",
      "prefer-offline=true",
      "resolution-mode=highest",
      ""
    ].join("\n");
    fs.writeFileSync(npmrcPath, npmrc, "utf8");
    logger.info(`Created .npmrc at ${npmrcPath}`);
  }

  // Root package.json (private workspace)
  const rootPkgPath = path.join(root, "package.json");
  if (!fs.existsSync(rootPkgPath)) {
    const pkg = {
      name: "applaa-workspace",
      private: true,
      packageManager: "pnpm@9",
      devDependencies: {},
    } as const;
    fs.writeFileSync(rootPkgPath, JSON.stringify(pkg, null, 2), "utf8");
    logger.info(`Created workspace package.json at ${rootPkgPath}`);
  }
}


