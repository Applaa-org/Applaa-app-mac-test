import { ipcMain } from "electron";
import { backendAPI } from "../../lib/backend-api";
import log from "electron-log";
import { createLoggedHandler } from "./safe_handle";

const logger = log.scope("database-handlers");

/**
 * Register IPC handlers for database operations (export, credentials)
 */
export function registerDatabaseHandlers() {

  // Get database credentials for an app
  ipcMain.handle(
    "database:get-credentials",
    createLoggedHandler(
      "database:get-credentials",
      async (_, { appId }: { appId: number }) => {
        if (!appId || typeof appId !== "number") {
          throw new Error("Invalid app ID");
        }

        logger.info(`Fetching database credentials for app ${appId}`);
        const credentials = await backendAPI.getAppCredentials(appId);
        logger.info(`✅ Credentials fetched successfully for app ${appId}`);
        return { success: true, credentials };
      },
    ),
  );

  // Export database as SQL dump
  ipcMain.handle(
    "database:export",
    createLoggedHandler(
      "database:export",
      async (_, { appId }: { appId: number }) => {
        if (!appId || typeof appId !== "number") {
          throw new Error("Invalid app ID");
        }

        logger.info(`Exporting database for app ${appId}`);
        
        try {
          const blob = await backendAPI.exportAppDatabase(appId);
          
          // Convert Blob to Buffer for Electron IPC
          const arrayBuffer = await blob.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          
          logger.info(`✅ Database exported successfully for app ${appId}, size: ${buffer.length} bytes`);
          
          return {
            success: true,
            data: buffer,
            filename: `app_${appId}_backup_${Date.now()}.sql`,
            mimeType: blob.type || "application/sql",
          };
        } catch (error: any) {
          logger.error(`❌ Failed to export database for app ${appId}:`, error);
          throw new Error(error.message || "Failed to export database");
        }
      },
    ),
  );
}

