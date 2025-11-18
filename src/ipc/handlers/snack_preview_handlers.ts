/**
 * 🚀 Snack Preview IPC Handlers
 * Connect the hot reload bridge with IPC system for Snack-powered preview
 */

import { ipcMain, BrowserWindow } from 'electron';
import { SnackHotReloadBridge } from '../../preview/SnackHotReloadBridge';
import { getDyadAppPath } from '../../paths/paths';
import { db } from '../../db';
import { apps } from '../../db/schema';
import { eq } from 'drizzle-orm';
import log from 'electron-log';

// Singleton instance
const hotReloadBridge = SnackHotReloadBridge.getInstance();

export function registerSnackPreviewHandlers() {
  log.info('🚀 Registering Snack Preview handlers');
  
  /**
   * Start hot reload watching for an app
   */
  ipcMain.handle(
    'snack:start-hot-reload',
    async (_, { appId }: { appId: number }) => {
      try {
        log.info(`🔥 Starting hot reload for app ${appId}`);
        
        // Get app data
        const [appData] = await db
          .select()
          .from(apps)
          .where(eq(apps.id, appId))
          .limit(1);
        
        if (!appData) {
          throw new Error(`App not found: ${appId}`);
        }
        
        const appPath = getDyadAppPath(appData.path);
        log.info(`📁 App path: ${appPath}`);
        
        // Start watching
        hotReloadBridge.startWatching(appId, appPath);
        
        return {
          success: true,
          message: 'Hot reload started'
        };
      } catch (error) {
        log.error('Failed to start hot reload:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  );
  
  /**
   * Stop hot reload watching for an app
   */
  ipcMain.handle(
    'snack:stop-hot-reload',
    async (_, { appId }: { appId: number }) => {
      try {
        log.info(`🛑 Stopping hot reload for app ${appId}`);
        hotReloadBridge.stopWatching(appId);
        
        return {
          success: true,
          message: 'Hot reload stopped'
        };
      } catch (error) {
        log.error('Failed to stop hot reload:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  );
  
  /**
   * Check if hot reload is active for an app
   */
  ipcMain.handle(
    'snack:is-watching',
    async (_, { appId }: { appId: number }) => {
      return {
        isWatching: hotReloadBridge.isWatching(appId)
      };
    }
  );
  
  /**
   * Get all watched apps
   */
  ipcMain.handle('snack:get-watched-apps', async () => {
    return {
      watchedApps: hotReloadBridge.getWatchedApps()
    };
  });
  
  /**
   * Manual trigger for testing
   */
  ipcMain.handle(
    'snack:manual-trigger',
    async (_, { appId, reason }: { appId: number; reason?: string }) => {
      try {
        hotReloadBridge.manualTrigger(appId, reason);
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  );
  
  /**
   * Update hot reload options
   */
  ipcMain.handle(
    'snack:update-options',
    async (_, { options }: { options: any }) => {
      try {
        hotReloadBridge.updateOptions(options);
        return {
          success: true,
          message: 'Options updated'
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  );
  
  /**
   * Get current options
   */
  ipcMain.handle('snack:get-options', async () => {
    return {
      options: hotReloadBridge.getOptions()
    };
  });
  
  // Forward hot reload events to all renderer processes
  hotReloadBridge.on('hot-reload', (event) => {
    log.info(`🔥 Broadcasting hot reload event:`, event);
    
    // Send to all windows
    BrowserWindow.getAllWindows().forEach((window) => {
      if (!window.isDestroyed()) {
        window.webContents.send('snack:hot-reload', event);
      }
    });
  });
  
  // Forward ready events
  hotReloadBridge.on('ready', ({ appId }) => {
    log.info(`✅ Hot reload ready for app ${appId}`);
    
    BrowserWindow.getAllWindows().forEach((window) => {
      if (!window.isDestroyed()) {
        window.webContents.send('snack:watcher-ready', { appId });
      }
    });
  });
  
  // Forward error events
  hotReloadBridge.on('error', ({ appId, error }) => {
    log.error(`❌ Hot reload error for app ${appId}:`, error);
    
    BrowserWindow.getAllWindows().forEach((window) => {
      if (!window.isDestroyed()) {
        window.webContents.send('snack:watcher-error', { 
          appId, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    });
  });
  
  // Forward stopped events
  hotReloadBridge.on('stopped', ({ appId }) => {
    log.info(`🛑 Hot reload stopped for app ${appId}`);
    
    BrowserWindow.getAllWindows().forEach((window) => {
      if (!window.isDestroyed()) {
        window.webContents.send('snack:watcher-stopped', { appId });
      }
    });
  });
  
  log.info('✅ Snack Preview handlers registered successfully');
}

// Cleanup on app quit
export function cleanupSnackHandlers() {
  log.info('🧹 Cleaning up Snack Preview handlers');
  hotReloadBridge.stopAll();
}

