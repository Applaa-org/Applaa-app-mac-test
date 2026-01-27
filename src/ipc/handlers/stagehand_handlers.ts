import { ipcMain } from 'electron';
import log from 'electron-log';
import { stagehandExecutor } from '../../lib/automation/stagehand-executor';
import { chromiumManager } from '../../lib/browser/chromium-manager';

const logger = log.scope('stagehand-handlers');

export function registerStagehandHandlers() {
    logger.info('Registering Stagehand AI Automation Handlers');

    // Initialize Stagehand with current page
    ipcMain.handle('stagehand:init', async () => {
        try {
            const page = chromiumManager.getActivePage();
            if (!page) {
                throw new Error('No active browser page. Please open a tab first.');
            }

            await stagehandExecutor.initialize(page);
            return { success: true };
        } catch (error) {
            logger.error('Failed to initialize Stagehand:', error);
            return { success: false, error: String(error) };
        }
    });

    // Execute natural language action
    ipcMain.handle('stagehand:act', async (_event, { instruction }: { instruction: string }) => {
        try {
            await stagehandExecutor.act(instruction);
            return { success: true };
        } catch (error) {
            logger.error('Failed to execute AI action:', error);
            return { success: false, error: String(error) };
        }
    });

    // Extract data from page
    ipcMain.handle('stagehand:extract', async (_event, { instruction, schema }: { instruction: string; schema: any }) => {
        try {
            // Re-wrap the schema object into a Zod schema if it's passed as a plain object
            // This is a simplification; in a real app you'd want more robust schema handling
            const result = await stagehandExecutor.extract(instruction, schema);
            return { success: true, data: result };
        } catch (error) {
            logger.error('Failed to extract data:', error);
            return { success: false, error: String(error) };
        }
    });

    // Observe page state
    ipcMain.handle('stagehand:observe', async () => {
        try {
            const observation = await stagehandExecutor.observe();
            return { success: true, observation };
        } catch (error) {
            logger.error('Failed to observe page:', error);
            return { success: false, error: String(error) };
        }
    });

    logger.info('✅ Stagehand handlers registered');
}
