import { ipcMain } from 'electron';
import log from 'electron-log';
import { jarvisAutomation } from '../../lib/automation/jarvis-automation';

const logger = log.scope('automation-handlers');

export function registerAutomationHandlers() {

    // Initialize Jarvis automation
    ipcMain.handle('automation:init', async () => {
        try {
            await jarvisAutomation.initialize();
            return { success: true };
        } catch (error) {
            logger.error('Failed to initialize automation:', error);
            return { success: false, error: String(error) };
        }
    });

    // Generate a plan
    ipcMain.handle('automation:plan', async (_event, { instruction, model }: { instruction: string; model?: string }) => {
        try {
            return await jarvisAutomation.generatePlan(instruction, model);
        } catch (error) {
            logger.error('Failed to generate plan:', error);
            return {
                success: false,
                plan: '',
                message: String(error)
            };
        }
    });

    ipcMain.handle('automation:transcribe', async (_event, { audioBase64, mimeType }: { audioBase64: string; mimeType: string }) => {
        try {
            return await jarvisAutomation.transcribeAudio(audioBase64, mimeType);
        } catch (error) {
            logger.error('Failed to transcribe audio:', error);
            return {
                success: false,
                text: '',
                message: String(error)
            };
        }
    });

    // Execute natural language command
    ipcMain.handle('automation:execute', async (_event, { instruction }: { instruction: string }) => {
        try {
            const result = await jarvisAutomation.execute(instruction);
            return result;
        } catch (error) {
            logger.error('Failed to execute automation command:', error);
            return {
                success: false,
                message: String(error)
            };
        }
    });

    // Extract data from page
    ipcMain.handle('automation:extract', async (_event, { instruction }: { instruction: string }) => {
        try {
            const result = await jarvisAutomation.extract(instruction);
            return result;
        } catch (error) {
            logger.error('Failed to extract data:', error);
            return {
                success: false,
                message: String(error)
            };
        }
    });

}
