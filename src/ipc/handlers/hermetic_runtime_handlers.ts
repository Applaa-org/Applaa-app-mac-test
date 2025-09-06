import { ipcMain } from "electron";
import log from "electron-log";
import { 
  verifyHermeticRuntime, 
  getBestPackageManager, 
  ensurePnpmAvailable,
  verifyGlobalCompatibility,
  setupHermeticGlobal,
  getHermeticStatus
} from "../../lib/hermetic-runtime";

const logger = log.scope("hermetic-runtime-handlers");

export function registerHermeticRuntimeHandlers() {
  // Verify hermetic runtime status
  ipcMain.handle("hermetic-runtime:verify", async () => {
    try {
      logger.info("Verifying hermetic runtime status...");
      const status = await verifyHermeticRuntime();
      logger.info("Hermetic runtime verification completed:", status);
      return status;
    } catch (error) {
      logger.error("Failed to verify hermetic runtime:", error);
      throw error;
    }
  });

  // Get best package manager for a directory
  ipcMain.handle("hermetic-runtime:get-package-manager", async (_, cwd?: string) => {
    try {
      logger.info(`Getting best package manager for: ${cwd || "system"}`);
      const packageManager = await getBestPackageManager(cwd);
      logger.info(`Best package manager: ${packageManager}`);
      return packageManager;
    } catch (error) {
      logger.error("Failed to get package manager:", error);
      throw error;
    }
  });

  // Ensure PNPM is available
  ipcMain.handle("hermetic-runtime:ensure-pnpm", async () => {
    try {
      logger.info("Ensuring PNPM is available...");
      const success = await ensurePnpmAvailable();
      logger.info(`PNPM availability: ${success ? "✅ Available" : "❌ Not available"}`);
      return success;
    } catch (error) {
      logger.error("Failed to ensure PNPM availability:", error);
      throw error;
    }
  });

  // Transformers.js initialization removed for MVP

  // 🌍 Verify global compatibility
  ipcMain.handle("hermetic-runtime:verify-global", async () => {
    try {
      logger.info("🌍 Verifying global compatibility...");
      const compatibility = await verifyGlobalCompatibility();
      logger.info("Global compatibility status:", compatibility);
      return compatibility;
    } catch (error) {
      logger.error("Failed to verify global compatibility:", error);
      throw error;
    }
  });

  // 🚀 Setup complete Hermetic Runtime with global coverage
  ipcMain.handle("hermetic-runtime:setup-global", async () => {
    try {
      logger.info("🚀 Setting up Hermetic Runtime with global coverage...");
      const result = await setupHermeticGlobal();
      logger.info("Hermetic global setup result:", result);
      return result;
    } catch (error) {
      logger.error("Failed to setup Hermetic Runtime globally:", error);
      throw error;
    }
  });

  // 🔧 Get comprehensive Hermetic Runtime status
  ipcMain.handle("hermetic-runtime:status", async () => {
    try {
      logger.info("🔧 Getting comprehensive Hermetic Runtime status...");
      const status = await getHermeticStatus();
      logger.info("Hermetic Runtime status:", status);
      return status;
    } catch (error) {
      logger.error("Failed to get Hermetic Runtime status:", error);
      throw error;
    }
  });
}
