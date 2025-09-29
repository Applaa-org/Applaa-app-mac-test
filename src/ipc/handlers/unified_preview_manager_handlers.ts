/**
 * IPC Handlers for UnifiedPreviewManager
 * Forwards events from main process to renderer process
 */

import { ipcMain, BrowserWindow } from 'electron';
import { unifiedPreviewManager } from '../../preview/UnifiedPreviewManager';
import log from 'electron-log';

const logger = log.scope('unified-preview-ipc');

export function registerUnifiedPreviewManagerHandlers() {
  console.log('🚀🚀🚀 [UNIFIED-PREVIEW] HANDLER REGISTRATION STARTING 🚀🚀🚀');
  console.error('🚀🚀🚀 [UNIFIED-PREVIEW] HANDLER REGISTRATION STARTING 🚀🚀🚀');
  
  // Initialize handler
  ipcMain.handle('unified-preview:initialize', async (_, config) => {
    console.log('🎯 [UNIFIED-PREVIEW] Initialize handler called with config:', config);
    console.error('🎯 [UNIFIED-PREVIEW] Initialize handler called with config:', config);
    try {
      await unifiedPreviewManager.initialize(config);
      return { success: true };
    } catch (error) {
      logger.error('❌ Failed to initialize UnifiedPreviewManager:', error);
      return { success: false, error: error.message };
    }
  });

  // Start preview
  ipcMain.handle('unified-preview:start', async (_, request) => {
    try {
      const result = await unifiedPreviewManager.startPreview(request);
      return result;
    } catch (error) {
      logger.error('❌ Failed to start preview:', error);
      return { success: false, error: error.message };
    }
  });

  // Stop preview
  ipcMain.handle('unified-preview:stop', async (_, request) => {
    try {
      const result = await unifiedPreviewManager.stopPreview(request);
      return result;
    } catch (error) {
      logger.error('❌ Failed to stop preview:', error);
      return { success: false, error: error.message };
    }
  });

  // Suspend preview
  ipcMain.handle('unified-preview:suspend', async (_, appId) => {
    try {
      const result = await unifiedPreviewManager.suspendPreview(appId);
      return result;
    } catch (error) {
      logger.error('❌ Failed to suspend preview:', error);
      return { success: false, error: error.message };
    }
  });

  // Resume preview
  ipcMain.handle('unified-preview:resume', async (_, appId) => {
    try {
      const result = await unifiedPreviewManager.resumePreview(appId);
      return result;
    } catch (error) {
      logger.error('❌ Failed to resume preview:', error);
      return { success: false, error: error.message };
    }
  });

  // Get preview state
  ipcMain.handle('unified-preview:get-state', async (_, appId) => {
    try {
      const state = unifiedPreviewManager.getPreviewState(appId);
      return { success: true, state };
    } catch (error) {
      logger.error('❌ Failed to get preview state:', error);
      return { success: false, error: error.message };
    }
  });

  // Get system metrics
  ipcMain.handle('unified-preview:get-metrics', async () => {
    try {
      const metrics = unifiedPreviewManager.getSystemMetrics();
      return { success: true, metrics };
    } catch (error) {
      logger.error('❌ Failed to get system metrics:', error);
      return { success: false, error: error.message };
    }
  });

  // Get system status
  ipcMain.handle('unified-preview:get-status', async () => {
    try {
      const status = unifiedPreviewManager.getSystemStatus();
      return { success: true, status };
    } catch (error) {
      logger.error('❌ Failed to get system status:', error);
      return { success: false, error: error.message };
    }
  });

  // Shutdown
  ipcMain.handle('unified-preview:shutdown', async () => {
    try {
      await unifiedPreviewManager.shutdown();
      return { success: true };
    } catch (error) {
      logger.error('❌ Failed to shutdown UnifiedPreviewManager:', error);
      return { success: false, error: error.message };
    }
  });

  // List active previews
  ipcMain.handle('unified-preview:list-active', async () => {
    try {
      const apps = unifiedPreviewManager.getActiveApps();
      return { success: true, apps };
    } catch (error) {
      logger.error('❌ Failed to list active previews:', error);
      return { success: false, error: error.message };
    }
  });

  // Invalidate cache
  ipcMain.handle('unified-preview:invalidate-cache', async (_, appType, version) => {
    try {
      const count = await unifiedPreviewManager.invalidateTemplateCache(appType, version);
      return count;
    } catch (error) {
      logger.error('❌ Failed to invalidate cache:', error);
      return 0;
    }
  });

  // Setup event forwarding from main process to renderer process
  setupEventForwarding();
  
  // Debug: Verify handlers are registered
  console.log('✅ [DEBUG] UnifiedPreviewManager IPC handlers registration completed');
  console.log('🔍 [DEBUG] Checking if unified-preview:initialize is registered:', require('electron').ipcMain.listenerCount('unified-preview:initialize'));
}

/**
 * Setup event forwarding from UnifiedPreviewManager to renderer processes
 */
function setupEventForwarding() {
  // Forward preview events to all renderer processes
  unifiedPreviewManager.onPreviewEvent((event) => {
    const allWindows = BrowserWindow.getAllWindows();
    allWindows.forEach(window => {
      if (!window.isDestroyed()) {
        window.webContents.send('preview:event', event);
      }
    });
  });

  // Forward state changes to all renderer processes
  unifiedPreviewManager.onStateChange((appId, state) => {
    const allWindows = BrowserWindow.getAllWindows();
    allWindows.forEach(window => {
      if (!window.isDestroyed()) {
        window.webContents.send('preview:state-changed', appId, state);
      }
    });
  });

  // Forward errors to all renderer processes
  unifiedPreviewManager.onError((appId, error) => {
    const allWindows = BrowserWindow.getAllWindows();
    allWindows.forEach(window => {
      if (!window.isDestroyed()) {
        window.webContents.send('preview:error', appId, error);
      }
    });
  });

  logger.info('✅ Event forwarding setup complete');
}