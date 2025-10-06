import { ipcMain } from 'electron';
import log from 'electron-log';
import { chromeDevToolsMCP, DevToolsMessage, NetworkRequest } from '../../services/chrome-devtools-mcp';

const logger = log.scope("chrome_devtools_handlers");

export function registerChromeDevToolsHandlers() {
  logger.info('🔧 Registering Chrome DevTools MCP handlers');

  // Start Chrome DevTools MCP server
  ipcMain.handle("chrome-devtools:start", async (): Promise<{ success: boolean; error?: string }> => {
    logger.info('🚀 chrome-devtools:start handler called');
    try {
      await chromeDevToolsMCP.start();
      logger.info('✅ Chrome DevTools MCP started successfully');
      return { success: true };
    } catch (error) {
      logger.error('Failed to start Chrome DevTools MCP:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  });

  // Stop Chrome DevTools MCP server
  ipcMain.handle("chrome-devtools:stop", async (): Promise<{ success: boolean; error?: string }> => {
    try {
      await chromeDevToolsMCP.stop();
      return { success: true };
    } catch (error) {
      logger.error('Failed to stop Chrome DevTools MCP:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  });

  // Navigate to preview URL
  ipcMain.handle("chrome-devtools:navigate", async (
    _, 
    params: { url: string }
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      await chromeDevToolsMCP.navigateToPreview(params.url);
      return { success: true };
    } catch (error) {
      logger.error('Failed to navigate to preview:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  });

  // Get console messages
  ipcMain.handle("chrome-devtools:console-messages", async (): Promise<DevToolsMessage[]> => {
    try {
      return await chromeDevToolsMCP.getConsoleMessages();
    } catch (error) {
      logger.error('Failed to get console messages:', error);
      return [];
    }
  });

  // Get network requests
  ipcMain.handle("chrome-devtools:network-requests", async (): Promise<NetworkRequest[]> => {
    try {
      return await chromeDevToolsMCP.getNetworkRequests();
    } catch (error) {
      logger.error('Failed to get network requests:', error);
      return [];
    }
  });

  // Take screenshot
  ipcMain.handle("chrome-devtools:screenshot", async (): Promise<{ success: boolean; data?: string; error?: string }> => {
    try {
      const screenshot = await chromeDevToolsMCP.takeScreenshot();
      return { success: true, data: screenshot };
    } catch (error) {
      logger.error('Failed to take screenshot:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  });

  // Check connection status
  ipcMain.handle("chrome-devtools:status", async (): Promise<{ connected: boolean }> => {
    return { connected: chromeDevToolsMCP.getConnected() };
  });

  logger.info('✅ Chrome DevTools MCP handlers registered');
}
