import { ipcMain } from "electron";
import { db } from "../../db";
import { eq } from "drizzle-orm";
import log from "electron-log";
import * as fs from "fs";
import * as path from "path";
import { getDyadAppPath } from "../../paths/paths";

const logger = log.scope("asset-storage");

interface StoredAsset {
  id: string;
  appId: number;
  type: 'icon' | 'ui-design';
  name: string;
  description: string;
  prompt: string;
  model: string;
  localPath: string;
  url?: string;
  metadata: any;
  createdAt: number;
}

export function registerAssetStorageHandlers() {
  // Save generated asset to user's account
  ipcMain.handle("save-generated-asset", async (_, asset: StoredAsset): Promise<{ success: boolean; assetId: string }> => {
    try {
      logger.info(`💾 Saving asset: ${asset.type} - ${asset.name} for app ${asset.appId}`);
      
      // Create assets directory for the app
      const app = await db.query.apps.findFirst({
        where: eq(db.query.apps.id, asset.appId),
      });
      
      if (!app) {
        throw new Error(`App ${asset.appId} not found`);
      }
      
      const appPath = getDyadAppPath(app.path);
      const assetsDir = path.join(appPath, '.applaa', 'assets', asset.type);
      
      // Ensure directory exists
      fs.mkdirSync(assetsDir, { recursive: true });
      
      // Generate unique filename
      const timestamp = Date.now();
      const extension = asset.type === 'icon' ? 'png' : 'json';
      const filename = `${asset.id}_${timestamp}.${extension}`;
      const assetPath = path.join(assetsDir, filename);
      
      // Save asset metadata
      const assetMetadata = {
        ...asset,
        localPath: assetPath,
        savedAt: timestamp,
      };
      
      // Write metadata file
      const metadataPath = path.join(assetsDir, `${asset.id}_metadata.json`);
      fs.writeFileSync(metadataPath, JSON.stringify(assetMetadata, null, 2));
      
      // If it's an icon, copy the image file
      if (asset.type === 'icon' && asset.localPath && fs.existsSync(asset.localPath)) {
        fs.copyFileSync(asset.localPath, assetPath);
      }
      
      // If it's a UI design, save the design data
      if (asset.type === 'ui-design') {
        fs.writeFileSync(assetPath, JSON.stringify(asset.metadata, null, 2));
      }
      
      logger.info(`✅ Asset saved: ${assetPath}`);
      
      return {
        success: true,
        assetId: asset.id
      };
      
    } catch (error) {
      logger.error("Failed to save asset:", error);
      return {
        success: false,
        assetId: asset.id
      };
    }
  });

  // Get all saved assets for an app
  ipcMain.handle("get-app-assets", async (_, appId: number): Promise<StoredAsset[]> => {
    try {
      const app = await db.query.apps.findFirst({
        where: eq(db.query.apps.id, appId),
      });
      
      if (!app) {
        return [];
      }
      
      const appPath = getDyadAppPath(app.path);
      const assetsDir = path.join(appPath, '.applaa', 'assets');
      
      if (!fs.existsSync(assetsDir)) {
        return [];
      }
      
      const assets: StoredAsset[] = [];
      
      // Scan for icon assets
      const iconDir = path.join(assetsDir, 'icon');
      if (fs.existsSync(iconDir)) {
        const iconFiles = fs.readdirSync(iconDir).filter(f => f.endsWith('_metadata.json'));
        for (const file of iconFiles) {
          try {
            const metadataPath = path.join(iconDir, file);
            const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
            assets.push(metadata);
          } catch (error) {
            logger.warn(`Failed to load icon metadata: ${file}`, error);
          }
        }
      }
      
      // Scan for UI design assets
      const uiDir = path.join(assetsDir, 'ui-design');
      if (fs.existsSync(uiDir)) {
        const uiFiles = fs.readdirSync(uiDir).filter(f => f.endsWith('_metadata.json'));
        for (const file of uiFiles) {
          try {
            const metadataPath = path.join(uiDir, file);
            const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
            assets.push(metadata);
          } catch (error) {
            logger.warn(`Failed to load UI design metadata: ${file}`, error);
          }
        }
      }
      
      // Sort by creation date (newest first)
      assets.sort((a, b) => b.createdAt - a.createdAt);
      
      logger.info(`📁 Found ${assets.length} assets for app ${appId}`);
      return assets;
      
    } catch (error) {
      logger.error("Failed to get app assets:", error);
      return [];
    }
  });

  // Delete an asset
  ipcMain.handle("delete-asset", async (_, appId: number, assetId: string): Promise<{ success: boolean }> => {
    try {
      const app = await db.query.apps.findFirst({
        where: eq(db.query.apps.id, appId),
      });
      
      if (!app) {
        throw new Error(`App ${appId} not found`);
      }
      
      const appPath = getDyadAppPath(app.path);
      const assetsDir = path.join(appPath, '.applaa', 'assets');
      
      // Find and delete the asset files
      const types = ['icon', 'ui-design'];
      for (const type of types) {
        const typeDir = path.join(assetsDir, type);
        if (fs.existsSync(typeDir)) {
          const files = fs.readdirSync(typeDir);
          const assetFiles = files.filter(f => f.startsWith(assetId));
          
          for (const file of assetFiles) {
            const filePath = path.join(typeDir, file);
            fs.unlinkSync(filePath);
            logger.info(`🗑️ Deleted asset file: ${filePath}`);
          }
        }
      }
      
      return { success: true };
      
    } catch (error) {
      logger.error("Failed to delete asset:", error);
      return { success: false };
    }
  });

  // Get user's asset library (across all apps)
  ipcMain.handle("get-user-asset-library", async (_, userId?: number): Promise<StoredAsset[]> => {
    try {
      // For now, get assets from all apps
      // TODO: Implement proper user-based filtering when user system is ready
      const allApps = await db.query.apps.findMany();
      
      const allAssets: StoredAsset[] = [];
      
      for (const app of allApps) {
        const appAssets = await ipcMain.invoke("get-app-assets", app.id);
        allAssets.push(...appAssets);
      }
      
      // Sort by creation date (newest first)
      allAssets.sort((a, b) => b.createdAt - a.createdAt);
      
      logger.info(`📚 User asset library contains ${allAssets.length} assets`);
      return allAssets;
      
    } catch (error) {
      logger.error("Failed to get user asset library:", error);
      return [];
    }
  });
}






