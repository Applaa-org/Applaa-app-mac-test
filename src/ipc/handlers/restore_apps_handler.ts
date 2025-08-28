import { createLoggedHandler } from "./safe_handle";
import log from "electron-log";
import { db } from "../../db";
import { apps } from "../../db/schema";
import fs from "fs";
import path from "path";
import os from "os";

const logger = log.scope("restore_apps_handler");
const handle = createLoggedHandler(logger);

export function registerRestoreAppsHandler() {
  handle("restore-apps-from-filesystem", async () => {
    try {
      logger.info("Starting apps restoration from filesystem...");
      
      // Get the apps directory
      const appsDir = path.join(os.homedir(), 'applaa-apps');
      
      if (!fs.existsSync(appsDir)) {
        throw new Error(`Apps directory not found: ${appsDir}`);
      }
      
      // List all directories in the apps folder (excluding Flutter mobile folders)
      const appFolders = fs.readdirSync(appsDir).filter(item => {
        const itemPath = path.join(appsDir, item);
        const isDirectory = fs.statSync(itemPath).isDirectory();
        const isFlutterMobile = item.includes('_flutter_mobile');
        return isDirectory && !isFlutterMobile;
      });
      
      logger.info(`Found ${appFolders.length} app folders to restore`);
      
      const now = Math.floor(Date.now() / 1000);
      const restoredApps = [];
      
      for (const folder of appFolders) {
        try {
          // Check if app already exists
          const existingApp = await db.query.apps.findFirst({
            where: (apps, { eq }) => eq(apps.name, folder)
          });
          
          if (existingApp) {
            logger.info(`App ${folder} already exists, skipping`);
            restoredApps.push(existingApp);
            continue;
          }
          
          // Insert new app
          const [newApp] = await db.insert(apps).values({
            name: folder,
            path: folder,
            created_at: now,
            updated_at: now
          }).returning();
          
          logger.info(`Restored app: ${folder} (ID: ${newApp.id})`);
          restoredApps.push(newApp);
          
        } catch (error) {
          logger.error(`Failed to restore app ${folder}:`, error);
        }
      }
      
      logger.info(`Successfully restored ${restoredApps.length} apps`);
      return { 
        success: true, 
        restoredCount: restoredApps.length,
        apps: restoredApps 
      };
      
    } catch (error) {
      logger.error("Failed to restore apps:", error);
      throw new Error(`Failed to restore apps: ${error.message}`);
    }
  });
  
  logger.info("Registered restore apps handler");
}




