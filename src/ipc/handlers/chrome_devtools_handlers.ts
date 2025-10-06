import { ipcMain } from 'electron';
import log from 'electron-log';
import { chromeDevToolsMCP, DevToolsMessage, NetworkRequest } from '../../services/chrome-devtools-mcp';
import { createLoggedHandler } from './safe_handle';

const logger = log.scope("chrome_devtools_handlers");
const handle = createLoggedHandler(logger);

export function registerChromeDevToolsHandlers() {
  logger.info('🔧 Registering Chrome DevTools MCP handlers');

  // Start Chrome DevTools MCP server
  handle("chrome-devtools:start", async (): Promise<{ success: boolean; error?: string }> => {
    try {
      await chromeDevToolsMCP.start();
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
  handle("chrome-devtools:stop", async (): Promise<{ success: boolean; error?: string }> => {
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
  handle("chrome-devtools:navigate", async (
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
  handle("chrome-devtools:console-messages", async (): Promise<DevToolsMessage[]> => {
    try {
      return await chromeDevToolsMCP.getConsoleMessages();
    } catch (error) {
      logger.error('Failed to get console messages:', error);
      return [];
    }
  });

  // Get network requests
  handle("chrome-devtools:network-requests", async (): Promise<NetworkRequest[]> => {
    try {
      return await chromeDevToolsMCP.getNetworkRequests();
    } catch (error) {
      logger.error('Failed to get network requests:', error);
      return [];
    }
  });

  // Take screenshot
  handle("chrome-devtools:screenshot", async (): Promise<{ success: boolean; data?: string; error?: string }> => {
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
  handle("chrome-devtools:status", async (): Promise<{ connected: boolean }> => {
    return { connected: chromeDevToolsMCP.getConnected() };
  });

  logger.info('✅ Chrome DevTools MCP handlers registered');
}
