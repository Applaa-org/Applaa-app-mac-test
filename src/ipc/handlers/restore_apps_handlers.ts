import { ipcMain } from "electron";
import { createLoggedHandler } from "./safe_handle";
import { db } from "../../db";
import { apps } from "../../db/schema";
import fs from "fs";
import path from "path";
import os from "os";
import log from "electron-log";

const logger = log.scope("restore_apps_handlers");

export function registerRestoreAppsHandlers() {
  // Handler to restore apps from filesystem
  ipcMain.handle(
    "restore-apps-from-filesystem",
    createLoggedHandler("restore-apps-from-filesystem", async () => {
      try {
        // Get the apps directory
        const appsDir = path.join(os.homedir(), "applaa-apps");
        
        if (!fs.existsSync(appsDir)) {
          throw new Error(`Apps directory not found: ${appsDir}`);
        }

        // List all directories in the apps folder
        const appFolders = fs.readdirSync(appsDir).filter(item => {
          const itemPath = path.join(appsDir, item);
          return fs.statSync(itemPath).isDirectory() && !item.includes('_flutter_mobile');
        });

        logger.info(`Found ${appFolders.length} app folders to restore`);

        // Check if apps already exist in database
        const existingApps = await db.select().from(apps);
        
        if (existingApps.length > 0) {
          logger.info(`Database already has ${existingApps.length} apps. Skipping restore.`);
          return {
            success: true,
            message: `Database already has ${existingApps.length} apps`,
            appsRestored: 0
          };
        }

        // Insert apps into database
        const now = Math.floor(Date.now() / 1000);
        let restoredCount = 0;

        for (const folder of appFolders) {
          try {
            await db.insert(apps).values({
              name: folder,
              path: folder,
              createdAt: new Date(now * 1000),
              updatedAt: new Date(now * 1000)
            });
            restoredCount++;
            logger.info(`Restored app: ${folder}`);
          } catch (error) {
            logger.error(`Failed to restore app ${folder}:`, error);
          }
        }

        logger.info(`Successfully restored ${restoredCount} apps`);
        
        return {
          success: true,
          message: `Restored ${restoredCount} apps from filesystem`,
          appsRestored: restoredCount
        };

      } catch (error) {
        logger.error("Failed to restore apps from filesystem:", error);
        throw new Error(`Failed to restore apps: ${error.message}`);
      }
    })
  );

  // Handler to check if apps need to be restored
  ipcMain.handle(
    "check-apps-need-restore",
    createLoggedHandler("check-apps-need-restore", async () => {
      try {
        const existingApps = await db.select().from(apps);
        const appsDir = path.join(os.homedir(), "applaa-apps");
        
        const needsRestore = existingApps.length === 0 && fs.existsSync(appsDir);
        
        return {
          needsRestore,
          existingAppsCount: existingApps.length,
          appsDirectoryExists: fs.existsSync(appsDir)
        };
      } catch (error) {
        logger.error("Failed to check if apps need restore:", error);
        return {
          needsRestore: false,
          existingAppsCount: 0,
          appsDirectoryExists: false,
          error: error.message
        };
      }
    })
  );
}




