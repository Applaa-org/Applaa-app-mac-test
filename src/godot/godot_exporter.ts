/**
 * Godot HTML5 Exporter
 * Handles exporting Godot projects to HTML5/WebAssembly format
 */

import * as fs from "node:fs";
import * as path from "node:path";
import log from "electron-log";
import { execAsync, commandExists } from "../ipc/utils/runShellCommand";
import { findAvailablePort } from "../ipc/utils/port_utils";

const logger = log.scope("godot_exporter");

export interface ExportOptions {
  projectPath: string;
  exportPath: string;
  projectName: string;
  presetName?: string;
  debug?: boolean;
  appPath?: string; // App root path for creating vercel.json at root
}

export interface ExportResult {
  success: boolean;
  exportPath?: string;
  error?: string;
  files?: string[];
}

/**
 * Export Godot project to HTML5/WebAssembly
 */
export async function exportGodotToHTML5(
  options: ExportOptions
): Promise<ExportResult> {
  const { projectPath, exportPath, projectName, presetName = "Web", debug = false } = options;

  logger.info(`Exporting Godot project to HTML5: ${projectName}`);

  // 1. Detect Godot engine
  const godot = await detectGodotEngine();
  if (!godot.installed || !godot.path) {
    return {
      success: false,
      error: "Godot engine not found. Please install Godot 4.x and add it to your PATH.",
    };
  }

  // 2. Ensure export directory exists
  if (!fs.existsSync(exportPath)) {
    fs.mkdirSync(exportPath, { recursive: true });
  }

  // 3. Check if export preset exists, create if needed
  await ensureExportPreset(projectPath, presetName);

  // 4. Run export command
  try {
    const exportMode = debug ? "debug" : "release";
    const exportCommand = buildExportCommand(godot.path, projectPath, exportPath, presetName, exportMode);

    logger.info(`Running export command: ${exportCommand}`);

    const result = await execAsync(exportCommand, {
      timeout: 120000, // 2 minute timeout
      cwd: projectPath,
    });

    // 5. Verify export files
    const requiredFiles = ["index.html", "game.js"];
    const optionalFiles = ["game.wasm", "game.pck"];

    const missingFiles: string[] = [];
    const exportedFiles: string[] = [];

    for (const file of requiredFiles) {
      const filePath = path.join(exportPath, file);
      if (fs.existsSync(filePath)) {
        exportedFiles.push(file);
      } else {
        missingFiles.push(file);
      }
    }

    for (const file of optionalFiles) {
      const filePath = path.join(exportPath, file);
      if (fs.existsSync(filePath)) {
        exportedFiles.push(file);
      }
    }

    if (missingFiles.length > 0) {
      return {
        success: false,
        error: `Export completed but required files are missing: ${missingFiles.join(", ")}`,
        files: exportedFiles,
      };
    }

    logger.info(`✅ Successfully exported to ${exportPath}`);
    logger.info(`Exported files: ${exportedFiles.join(", ")}`);

    // 6. Create vercel.json for Vercel deployment at app root
    try {
      const appPath = options.appPath || path.dirname(exportPath);
      createVercelConfig(exportPath, appPath);
    } catch (vercelError: any) {
      logger.warn(`Failed to create vercel.json: ${vercelError.message}`);
      // Don't fail the export if vercel.json creation fails
    }

    return {
      success: true,
      exportPath,
      files: exportedFiles,
    };
  } catch (error: any) {
    logger.error(`Export failed: ${error.message}`);
    return {
      success: false,
      error: error.message || "Unknown export error",
    };
  }
}

/**
 * Detect Godot engine installation
 */
async function detectGodotEngine(): Promise<{ installed: boolean; path?: string; version?: string }> {
  const godotCommands = ["godot", "godot4", "godot-headless", "godot4-headless"];

  for (const cmd of godotCommands) {
    try {
      const exists = await commandExists(cmd);
      if (exists) {
        try {
          const result = await execAsync(`${cmd} --version`, { timeout: 5000 });
          const version = result.stdout?.trim() || "unknown";
          logger.info(`Godot engine detected: ${cmd}, version: ${version}`);
          return { installed: true, path: cmd, version };
        } catch {
          return { installed: true, path: cmd };
        }
      }
    } catch {
      continue;
    }
  }

  // Check common installation paths
  const commonPaths: string[] = [];
  if (process.platform === "win32") {
    commonPaths.push(
      "C:\\Program Files\\Godot\\Godot_v4.x.x_win64.exe",
      "C:\\Program Files (x86)\\Godot\\Godot_v4.x.x_win64.exe",
      path.join(process.env.USERPROFILE || "", "AppData", "Local", "Programs", "Godot", "Godot.exe")
    );
  } else if (process.platform === "darwin") {
    commonPaths.push(
      "/Applications/Godot.app/Contents/MacOS/Godot",
      path.join(process.env.HOME || "", "Applications", "Godot.app", "Contents", "MacOS", "Godot")
    );
  } else {
    commonPaths.push("/usr/bin/godot", "/usr/local/bin/godot", path.join(process.env.HOME || "", ".local", "bin", "godot"));
  }

  for (const godotPath of commonPaths) {
    if (fs.existsSync(godotPath)) {
      logger.info(`Godot engine found at: ${godotPath}`);
      return { installed: true, path: godotPath };
    }
  }

  return { installed: false };
}

/**
 * Build export command
 */
function buildExportCommand(
  godotPath: string,
  projectPath: string,
  exportPath: string,
  presetName: string,
  mode: "debug" | "release"
): string {
  const exportType = mode === "debug" ? "export-debug" : "export-release";
  const normalizedProjectPath = path.resolve(projectPath).replace(/\\/g, "/");
  const normalizedExportPath = path.resolve(exportPath).replace(/\\/g, "/");

  if (process.platform === "win32") {
    return `"${godotPath}" --headless --path "${normalizedProjectPath}" --${exportType} "${presetName}" "${normalizedExportPath}/index.html"`;
  } else {
    return `"${godotPath}" --headless --path "${normalizedProjectPath}" --${exportType} "${presetName}" "${normalizedExportPath}/index.html"`;
  }
}

/**
 * Ensure export preset exists in project.godot
 */
async function ensureExportPreset(projectPath: string, presetName: string): Promise<void> {
  const projectFile = path.join(projectPath, "project.godot");

  if (!fs.existsSync(projectFile)) {
    logger.warn("project.godot not found, cannot ensure export preset");
    return;
  }

  const content = fs.readFileSync(projectFile, "utf-8");

  // Check if export preset already exists
  if (content.includes(`[export_presets.${presetName}]`)) {
    logger.info(`Export preset "${presetName}" already exists`);
    return;
  }

  // Add export preset configuration
  logger.info(`Adding export preset "${presetName}" to project.godot`);

  const exportPresetConfig = `
[export_presets.${presetName}]

name="${presetName}"
platform="Web"
runnable=true
dedicated_server=false
custom_features=""
export_filter="all_resources"
include_filter=""
exclude_filter=""
export_path=""
encryption_include_filters=""
encryption_exclude_filters=""
encrypt_pck=false
encrypt_directory=false

[export_presets.${presetName}.options]

custom_template/debug=""
custom_template/release=""
variant/extensions_support=false
variant/thread_support=false
variant/gdnative_libraries=""
`;

  fs.appendFileSync(projectFile, exportPresetConfig);
  logger.info(`✅ Export preset "${presetName}" added to project.godot`);
}

/**
 * Create vercel.json configuration for Godot exports
 * This ensures proper MIME types for WebAssembly and game files
 * IMPORTANT: vercel.json must be at the repo root (appPath), not in the export directory
 */
export function createVercelConfig(exportPath: string, appPath?: string): void {
  // Create vercel.json at the app root (where it will be committed to git)
  // If appPath is provided, use it; otherwise derive from exportPath (go up one level)
  const vercelJsonPath = appPath 
    ? path.join(appPath, "vercel.json")
    : path.join(path.dirname(exportPath), "vercel.json");
  
  const vercelConfig = {
    "$schema": "https://openapi.vercel.sh/vercel.json",
    "rewrites": [
      {
        "source": "/(.*)",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "/(.*)\\.wasm",
        "headers": [
          {
            "key": "Content-Type",
            "value": "application/wasm"
          },
          {
            "key": "Cross-Origin-Embedder-Policy",
            "value": "require-corp"
          },
          {
            "key": "Cross-Origin-Opener-Policy",
            "value": "same-origin"
          }
        ]
      },
      {
        "source": "/(.*)\\.pck",
        "headers": [
          {
            "key": "Content-Type",
            "value": "application/octet-stream"
          }
        ]
      },
      {
        "source": "/(.*)\\.js",
        "headers": [
          {
            "key": "Content-Type",
            "value": "application/javascript"
          }
        ]
      }
    ]
  };

  fs.writeFileSync(vercelJsonPath, JSON.stringify(vercelConfig, null, 2));
  
  // Verify the file was created
  if (fs.existsSync(vercelJsonPath)) {
    const stats = fs.statSync(vercelJsonPath);
    logger.info(`✅ Created vercel.json for Vercel deployment at ${vercelJsonPath} (${stats.size} bytes)`);
  } else {
    logger.error(`❌ Failed to create vercel.json at ${vercelJsonPath} - file does not exist after write`);
  }
}

/**
 * Check if export is up to date
 */
export function isExportUpToDate(
  projectPath: string,
  exportPath: string,
  specPath: string
): boolean {
  const indexHtmlPath = path.join(exportPath, "index.html");
  if (!fs.existsSync(indexHtmlPath)) {
    return false;
  }

  // Check if game_spec.json is newer than export
  if (fs.existsSync(specPath)) {
    const specStats = fs.statSync(specPath);
    const exportStats = fs.statSync(indexHtmlPath);

    if (specStats.mtime > exportStats.mtime) {
      return false;
    }
  }

  // Check if any scene files are newer
  const scenesPath = path.join(projectPath, "scenes");
  if (fs.existsSync(scenesPath)) {
    const sceneFiles = fs.readdirSync(scenesPath, { recursive: true });
    for (const file of sceneFiles) {
      const filePath = path.join(scenesPath, file);
      const stats = fs.statSync(filePath);
      if (stats.mtime > exportStats.mtime) {
        return false;
      }
    }
  }

  return true;
}

