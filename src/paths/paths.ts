import path from "node:path";
import os from "node:os";
import { IS_TEST_BUILD } from "../ipc/utils/test_utils";
import { readSettings } from "../main/settings";

export function getDyadAppPath(appPath: string): string {
  if (IS_TEST_BUILD) {
    const electron = getElectron();
    return path.join(electron!.app.getPath("userData"), "applaa-apps", appPath);
  }
  
  // Get custom apps directory from settings or use default
  const settings = readSettings();
  const customAppsDirectory = settings.customAppsDirectory || path.join(os.homedir(), "applaa-apps");
  
  return path.join(customAppsDirectory, appPath);
}

export function getTypeScriptCachePath(): string {
  const electron = getElectron();
  return path.join(electron!.app.getPath("sessionData"), "typescript-cache");
}

/**
 * Gets the user data path, handling both Electron and non-Electron environments
 * In Electron: returns the app's userData directory
 * In non-Electron: returns "./userData" in the current directory
 */

export function getUserDataPath(): string {
  const electron = getElectron();

  // When running in Electron (packaged app or development)
  if (electron && electron.app) {
    // Always use Electron's userData path when available
    const userDataPath = electron.app.getPath("userData");
    console.log(`[getUserDataPath] Using Electron userData path: ${userDataPath}`);
    console.log(`[getUserDataPath] Environment: NODE_ENV=${process.env.NODE_ENV}, resourcesPath=${process.resourcesPath}, defaultApp=${process.defaultApp}`);
    return userDataPath;
  }

  // Fallback for non-Electron environments (tests, etc.)
  const fallbackPath = path.resolve("./userData");
  console.log(`[getUserDataPath] Using fallback path: ${fallbackPath}`);
  return fallbackPath;
}

/**
 * Get a reference to electron in a way that won't break in non-electron environments
 */
export function getElectron(): typeof import("electron") | undefined {
  let electron: typeof import("electron") | undefined;
  try {
    // Check if we're in an Electron environment
    if (process.versions.electron) {
      electron = require("electron");
    }
  } catch {
    // Not in Electron environment
  }
  return electron;
}
