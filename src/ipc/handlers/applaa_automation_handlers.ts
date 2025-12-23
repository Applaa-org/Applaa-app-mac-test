import { ipcMain, BrowserWindow } from 'electron';
import { ApplaaAIAutomation } from '../../services/applaa-ai-automation';
import log from 'electron-log/main';

const logger = log.scope("applaa-automation-handlers");

export function registerApplaaAutomationHandlers() {
  logger.info('🔧 Registering Applaa automation handlers');

  /**
   * Execute an automation task in the Applaa app
   */
  ipcMain.handle(
    "applaa-automation:execute-task",
    async (event, params: { task: string }): Promise<{
      success: boolean;
      task: string;
      actions?: any[];
      result?: string;
      error?: string;
    }> => {
      try {
        const window = BrowserWindow.fromWebContents(event.sender);
        if (!window) {
          throw new Error("Window not found");
        }

        logger.info(`Executing Applaa automation task: ${params.task}`);
        
        const automation = new ApplaaAIAutomation(window);
        const result = await automation.executeTask(params.task);
        
        logger.info(`Task completed: ${result.success ? 'success' : 'failed'}`);
        
        return {
          success: result.success,
          task: result.task,
          actions: result.actions,
          result: result.result,
          error: result.error,
        };
      } catch (error: any) {
        logger.error("Applaa automation failed:", error);
        return {
          success: false,
          task: params.task,
          error: error.message || "Automation failed",
        };
      }
    }
  );

  /**
   * Check if automation is available
   */
  ipcMain.handle("applaa-automation:status", async (): Promise<{
    available: boolean;
  }> => {
    return {
      available: true,
    };
  });

  logger.info('✅ Applaa automation handlers registered');
}

