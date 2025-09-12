import { ipcMain } from 'electron';
import log from 'electron-log';
import { initializeR2, getR2Storage, R2Config } from '../../lib/r2Storage';
import { readSettings, writeSettings } from '../../main/settings';
import { db } from '../../db';
import { apps } from '../../db/schema';
import { eq } from 'drizzle-orm';
import * as path from 'path';
import * as fs from 'fs';

// R2 state management
let isInitialized = false;

export interface SyncResult {
  success: boolean;
  uploaded: number;
  skipped: number;
  errors: string[];
  message?: string;
}

export interface AppSyncOptions {
  appId: number;
  includePatterns?: string[];
  excludePatterns?: string[];
  dryRun?: boolean;
}

export function registerR2StorageHandlers() {
  // Initialize R2
  ipcMain.handle('r2:initialize', async (_, config: R2Config) => {
    try {
      if (isInitialized) {
        return { success: true, message: 'Already initialized' };
      }

      const client = initializeR2(config);
      
      // Test connection by listing objects
      const storage = getR2Storage();
      await storage.listFiles('', 1);

      isInitialized = true;
      log.info('R2 storage initialized successfully');
      return { success: true, message: 'Initialized successfully' };
    } catch (error) {
      log.error('Failed to initialize R2:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // Initialize from stored credentials
  ipcMain.handle('r2:initialize-from-settings', async () => {
    try {
      const settings = readSettings();
      
      if (!settings.cloudflareR2?.accountId || 
          !settings.cloudflareR2?.accessKeyId || 
          !settings.cloudflareR2?.secretAccessKey ||
          !settings.cloudflareR2?.bucketName) {
        return { success: false, error: 'R2 credentials not configured' };
      }

      const config: R2Config = {
        accountId: settings.cloudflareR2.accountId,
        accessKeyId: settings.cloudflareR2.accessKeyId,
        secretAccessKey: settings.cloudflareR2.secretAccessKey,
        bucketName: settings.cloudflareR2.bucketName,
        region: settings.cloudflareR2.region || 'auto',
      };

      // Call the initialize handler directly
      try {
        if (isInitialized) {
          return { success: true, message: 'Already initialized' };
        }

        const client = initializeR2(config);
        
        // Test connection by listing objects
        const storage = getR2Storage();
        await storage.listFiles('', 1);

        isInitialized = true;
        log.info('R2 storage initialized successfully');
        return { success: true, message: 'Initialized successfully' };
      } catch (initError) {
        log.error('Failed to initialize R2:', initError);
        return { success: false, error: initError instanceof Error ? initError.message : String(initError) };
      }
    } catch (error) {
      log.error('Failed to initialize R2 from settings:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // Save R2 credentials to settings
  ipcMain.handle('r2:save-credentials', async (_, credentials: {
    accountId: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucketName: string;
    region?: string;
  }) => {
    try {
      const settings = readSettings();
      settings.cloudflareR2 = {
        ...settings.cloudflareR2,
        accountId: credentials.accountId,
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        bucketName: credentials.bucketName,
        region: credentials.region || 'auto',
      };
      
      writeSettings(settings);
      log.info('R2 credentials saved to settings');
      return { success: true, message: 'Credentials saved successfully' };
    } catch (error) {
      log.error('Failed to save R2 credentials:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // Upload file
  ipcMain.handle('r2:upload-file', async (_, params: {
    localPath: string;
    r2Key: string;
  }) => {
    try {
      if (!isInitialized) {
        throw new Error('R2 not initialized');
      }

      const storage = getR2Storage();
      await storage.uploadFile(params.localPath, params.r2Key);
      
      log.info(`File uploaded: ${params.localPath} -> ${params.r2Key}`);
      return { success: true, message: 'File uploaded successfully' };
    } catch (error) {
      log.error('Upload file failed:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // Download file
  ipcMain.handle('r2:download-file', async (_, params: {
    r2Key: string;
    localPath: string;
  }) => {
    try {
      if (!isInitialized) {
        throw new Error('R2 not initialized');
      }

      const storage = getR2Storage();
      await storage.downloadFile(params.r2Key, params.localPath);
      
      log.info(`File downloaded: ${params.r2Key} -> ${params.localPath}`);
      return { success: true, message: 'File downloaded successfully' };
    } catch (error) {
      log.error('Download file failed:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // Delete file
  ipcMain.handle('r2:delete-file', async (_, params: {
    r2Key: string;
  }) => {
    try {
      if (!isInitialized) {
        throw new Error('R2 not initialized');
      }

      const storage = getR2Storage();
      await storage.deleteFile(params.r2Key);
      
      log.info(`File deleted: ${params.r2Key}`);
      return { success: true, message: 'File deleted successfully' };
    } catch (error) {
      log.error('Delete file failed:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // List files
  ipcMain.handle('r2:list-files', async (_, params: {
    prefix?: string;
    maxKeys?: number;
  }) => {
    try {
      if (!isInitialized) {
        throw new Error('R2 not initialized');
      }

      const storage = getR2Storage();
      const files = await storage.listFiles(params.prefix, params.maxKeys);
      
      return { success: true, files };
    } catch (error) {
      log.error('List files failed:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // Check if file exists
  ipcMain.handle('r2:file-exists', async (_, params: {
    r2Key: string;
  }) => {
    try {
      if (!isInitialized) {
        throw new Error('R2 not initialized');
      }

      const storage = getR2Storage();
      const exists = await storage.fileExists(params.r2Key);
      
      return { success: true, exists };
    } catch (error) {
      log.error('File exists check failed:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // Sync app to R2
  ipcMain.handle('r2:sync-app', async (_, options: AppSyncOptions) => {
    try {
      if (!isInitialized) {
        throw new Error('R2 not initialized');
      }

      // Get app data
      const appResult = await db.select().from(apps).where(eq(apps.id, options.appId)).limit(1);
      const app = appResult[0];
      
      if (!app) {
        throw new Error('App not found');
      }

      if (!app.path) {
        throw new Error('App path not set');
      }

      // Check if app directory exists
      if (!fs.existsSync(app.path)) {
        throw new Error(`App directory does not exist: ${app.path}`);
      }

      const storage = getR2Storage();
      
      // Default sync patterns for source code
      const defaultIncludePatterns = [
        '**/*.js',
        '**/*.ts',
        '**/*.jsx',
        '**/*.tsx',
        '**/*.json',
        '**/*.md',
        '**/*.css',
        '**/*.scss',
        '**/*.html',
        '**/*.vue',
        '**/*.dart',
        '**/package.json',
        '**/pubspec.yaml',
        '**/app.json',
        '**/expo.json',
        '**/*.config.js',
        '**/*.config.ts',
      ];

      const defaultExcludePatterns = [
        '**/node_modules/**',
        '**/build/**',
        '**/dist/**',
        '**/.next/**',
        '**/android/build/**',
        '**/ios/build/**',
        '**/.git/**',
        '**/.vscode/**',
        '**/*.log',
        '**/*.tmp',
        '**/coverage/**',
        '**/.nyc_output/**',
        '**/tmp/**',
        '**/temp/**',
      ];

      const syncOptions = {
        includePatterns: options.includePatterns || defaultIncludePatterns,
        excludePatterns: options.excludePatterns || defaultExcludePatterns,
        dryRun: options.dryRun || false,
      };

      // Create R2 prefix for this app
      const r2Prefix = `apps/${app.id}/${app.name}/source`;
      
      log.info(`Starting sync for app ${app.name} (${app.id})`);
      const result = await storage.syncDirectory(app.path, r2Prefix, syncOptions);
      
      // Update app with R2 storage path
      if (!options.dryRun && result.uploaded > 0) {
        await db.update(apps)
          .set({ 
            // Add r2StoragePath field to schema if not exists
            updatedAt: new Date(),
          })
          .where(eq(apps.id, options.appId));
      }

      const syncResult: SyncResult = {
        success: true,
        uploaded: result.uploaded,
        skipped: result.skipped,
        errors: result.errors,
        message: `Sync completed: ${result.uploaded} uploaded, ${result.skipped} skipped`,
      };

      log.info(`App sync completed: ${JSON.stringify(syncResult)}`);
      return syncResult;
    } catch (error) {
      log.error('App sync failed:', error);
      return {
        success: false,
        uploaded: 0,
        skipped: 0,
        errors: [error instanceof Error ? error.message : String(error)],
        message: `Sync failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  });

  // Restore app from R2
  ipcMain.handle('r2:restore-app', async (_, params: {
    appId: number;
    targetPath: string;
  }) => {
    try {
      if (!isInitialized) {
        throw new Error('R2 not initialized');
      }

      // Get app data
      const appResult = await db.select().from(apps).where(eq(apps.id, params.appId)).limit(1);
      const app = appResult[0];
      
      if (!app) {
        throw new Error('App not found');
      }

      const storage = getR2Storage();
      const r2Prefix = `apps/${app.id}/${app.name}/source/`;
      
      // List all files for this app
      const files = await storage.listFiles(r2Prefix);
      
      if (files.length === 0) {
        throw new Error('No files found in R2 for this app');
      }

      // Create target directory
      if (!fs.existsSync(params.targetPath)) {
        fs.mkdirSync(params.targetPath, { recursive: true });
      }

      let downloaded = 0;
      const errors: string[] = [];

      for (const file of files) {
        try {
          // Remove the prefix to get the relative path
          const relativePath = file.key.substring(r2Prefix.length);
          const localPath = path.join(params.targetPath, relativePath);
          
          await storage.downloadFile(file.key, localPath);
          downloaded++;
        } catch (error) {
          const errorMsg = `Failed to download ${file.key}: ${error instanceof Error ? error.message : String(error)}`;
          log.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      const result: SyncResult = {
        success: errors.length === 0,
        uploaded: 0,
        skipped: downloaded,
        errors,
        message: `Restore completed: ${downloaded} files downloaded`,
      };

      log.info(`App restore completed: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      log.error('App restore failed:', error);
      return {
        success: false,
        uploaded: 0,
        skipped: 0,
        errors: [error instanceof Error ? error.message : String(error)],
        message: `Restore failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  });

  // Get sync status for app
  ipcMain.handle('r2:get-app-sync-status', async (_, params: {
    appId: number;
  }) => {
    try {
      if (!isInitialized) {
        return { success: false, error: 'R2 not initialized' };
      }

      // Get app data
      const appResult = await db.select().from(apps).where(eq(apps.id, params.appId)).limit(1);
      const app = appResult[0];
      
      if (!app) {
        throw new Error('App not found');
      }

      const storage = getR2Storage();
      const r2Prefix = `apps/${app.id}/${app.name}/source/`;
      
      // List files in R2
      const remoteFiles = await storage.listFiles(r2Prefix);
      
      // Calculate total size
      const totalSize = remoteFiles.reduce((sum, file) => sum + file.size, 0);
      const lastSync = remoteFiles.length > 0 
        ? Math.max(...remoteFiles.map(f => f.lastModified.getTime()))
        : null;

      return {
        success: true,
        status: {
          fileCount: remoteFiles.length,
          totalSize,
          lastSync: lastSync ? new Date(lastSync) : null,
          hasRemoteFiles: remoteFiles.length > 0,
        },
      };
    } catch (error) {
      log.error('Get sync status failed:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // Test R2 connection
  ipcMain.handle('r2:test-connection', async () => {
    try {
      if (!isInitialized) {
        throw new Error('R2 not initialized');
      }

      const storage = getR2Storage();
      await storage.listFiles('', 1);
      
      return { success: true, message: 'Connection successful' };
    } catch (error) {
      log.error('R2 connection test failed:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });
}

