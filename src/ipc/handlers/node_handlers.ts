import { ipcMain } from "electron";
import { execSync } from "child_process";
import { platform, arch } from "os";
import { NodeSystemInfo } from "../ipc_types";
import fixPath from "fix-path";
import { execAsync } from "../utils/runShellCommand";
import log from "electron-log";

const logger = log.scope("node_handlers");

export function registerNodeHandlers() {
  ipcMain.handle("nodejs-status", async (): Promise<NodeSystemInfo> => {
    logger.log(
      "handling ipc: nodejs-status for platform:",
      platform(),
      "and arch:",
      arch(),
    );
    // Try primary detection via PATH
    let nodeVersion = "";
    let nodeVersionResult;
    try {
      nodeVersionResult = await execAsync("node --version");
      nodeVersion = (nodeVersionResult.stdout || "").trim();
    } catch (err) {
      logger.warn("node --version failed (likely PATH issue)", err);
    }

    // Fallback: locate absolute path to node (Windows: where, POSIX: which)
    if (!nodeVersion) {
      try {
        const whichCmd = platform() === "win32" ? "where node" : "which node";
        const whichRes = await execAsync(whichCmd);
        const nodePath = (whichRes.stdout || "").split(/\r?\n/).filter(Boolean)[0];
        if (nodePath) {
          const verRes = await execAsync(`"${nodePath}" --version`);
          nodeVersion = (verRes.stdout || "").trim();
        }
      } catch (e) {
        logger.warn("Fallback node path resolution failed", e);
      }
    }

    // pnpm is optional; attempt best‑effort detection only
    let pnpmVersion = "";
    try {
      const pnpmVersionResult = await execAsync(
        "pnpm --version || (corepack enable pnpm && pnpm --version) || (npm install -g pnpm@latest-10 && pnpm --version)",
      );
      pnpmVersion = (pnpmVersionResult.stdout || "").trim();
    } catch (e) {
      logger.debug("pnpm detection failed (ok):", e);
    }
    // Default to mac download url.
    let nodeDownloadUrl = "https://nodejs.org/dist/v22.14.0/node-v22.14.0.pkg";
    if (platform() == "win32") {
      if (arch() === "arm64" || arch() === "arm") {
        nodeDownloadUrl =
          "https://nodejs.org/dist/v22.14.0/node-v22.14.0-arm64.msi";
      } else {
        // x64 is the most common architecture for Windows so it's the
        // default download url.
        nodeDownloadUrl =
          "https://nodejs.org/dist/v22.14.0/node-v22.14.0-x64.msi";
      }
    }
    return { nodeVersion, pnpmVersion, nodeDownloadUrl };
  });

  ipcMain.handle("reload-env-path", async (): Promise<void> => {
    logger.debug("Reloading env path, previously:", process.env.PATH);
    if (platform() === "win32") {
      const newPath = execSync("cmd /c echo %PATH%", {
        encoding: "utf8",
      }).trim();
      process.env.PATH = newPath;
    } else {
      fixPath();
    }
    logger.debug("Reloaded env path, now:", process.env.PATH);
  });
}
