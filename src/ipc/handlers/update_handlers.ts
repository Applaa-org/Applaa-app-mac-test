import { ipcMain } from "electron";
import { autoUpdater } from "electron-updater";
import log from "electron-log";

const logger = log.scope("update-handlers");

export function registerUpdateHandlers() {
  // Handler to restart and install update
  ipcMain.handle("update:restart-and-install", async () => {
    try {
      logger.info("User requested to restart and install update");
      autoUpdater.quitAndInstall(false, true); // isSilent=false, isForceRunAfter=true
      return { success: true };
    } catch (error) {
      logger.error("Failed to restart and install update:", error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // Handler to check for updates manually
  ipcMain.handle("update:check", async () => {
    try {
      logger.info("Manual update check requested");
      const result = await autoUpdater.checkForUpdates();
      return { success: true, updateInfo: result?.updateInfo };
    } catch (error) {
      logger.error("Failed to check for updates:", error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });
}
