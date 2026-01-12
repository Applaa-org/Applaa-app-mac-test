import { ipcMain } from 'electron';
import log from 'electron-log';
import { browserPlanner } from '../../services/browser-planner';
import { browserExecutor } from '../../services/browser-executor';
import { BrowserLifecycle } from '../../services/browser-lifecycle';

const logger = log.scope('browser-automation-handlers');

export function registerBrowserAutomationHandlers() {
    logger.info('🌐 Registering Browser Automation IPC handlers...');

    /**
     * Create a browser automation plan
     */
    ipcMain.handle('browser:create-plan', async (event, goal: string) => {
        try {
            logger.info(`📋 Creating plan for: ${goal}`);
            const plan = await browserPlanner.createPlan(goal);
            return { success: true, plan };
        } catch (error: any) {
            logger.error('❌ Failed to create plan:', error);
            return { success: false, error: error.message };
        }
    });

    /**
     * Execute a browser automation plan
     */
    ipcMain.handle('browser:execute-plan', async (event, plan: any) => {
        try {
            logger.info(`🚀 Executing plan: ${plan.goal}`);

            // Send progress updates
            const result = await browserExecutor.executePlan(plan, (progress) => {
                event.sender.send('browser:progress', progress);
            });

            return result;
        } catch (error: any) {
            logger.error('❌ Failed to execute plan:', error);
            return { success: false, error: error.message };
        }
    });

    /**
     * Get browser status
     */
    ipcMain.handle('browser:status', async () => {
        try {
            const isRunning = BrowserLifecycle.isRunning();
            return { success: true, isRunning };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    /**
     * Close browser
     */
    ipcMain.handle('browser:close', async () => {
        try {
            await BrowserLifecycle.closeBrowser();
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    logger.info('✅ Browser Automation handlers registered');
}
