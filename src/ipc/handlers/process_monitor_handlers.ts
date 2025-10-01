import { ipcMain } from "electron";
import log from "electron-log";
import { 
  getProcessStats, 
  emergencyKillAll, 
  validateProcessStart 
} from "../utils/process_manager";
import { createLoggedHandler } from "./safe_handle";

const logger = log.scope("process-monitor-handlers");
const handle = createLoggedHandler(logger);

/**
 * Register IPC handlers for process monitoring and emergency controls
 */
export function registerProcessMonitorHandlers() {
  // Get current process statistics
  ipcMain.handle("process-monitor:stats", async () => {
    try {
      const stats = getProcessStats();
      logger.info("Process stats requested:", stats);
      return stats;
    } catch (error) {
      logger.error("Failed to get process stats:", error);
      throw error;
    }
  });

  // Emergency kill all processes
  ipcMain.handle("process-monitor:emergency-kill-all", async () => {
    try {
      logger.warn("Emergency kill all processes requested");
      await emergencyKillAll();
      return { success: true };
    } catch (error) {
      logger.error("Failed to emergency kill all processes:", error);
      throw error;
    }
  });

  // Validate if a process can be started
  ipcMain.handle("process-monitor:validate-start", async (_, appId: number, command: string) => {
    try {
      const validation = validateProcessStart(appId, command);
      logger.info(`Process validation for app ${appId}:`, validation);
      return validation;
    } catch (error) {
      logger.error("Failed to validate process start:", error);
      throw error;
    }
  });

  logger.info("Process monitor handlers registered");
}