import { ipcMain } from 'electron';
import { getBuddyBrowser } from '../../services/buddy-browser';
import log from 'electron-log';

const logger = log.scope('buddy-handlers');

/**
 * Buddy Browser IPC Handlers
 * Handles launching and managing the Buddy browser with Superpowers extension
 */
export function registerBuddyHandlers() {
    try {
        const buddyBrowser = getBuddyBrowser();

        ipcMain.handle('buddy:launch', async () => {
            try {
                const result = await buddyBrowser.launch();
                if (!result.success) {
                    logger.error('Buddy browser launch failed:', result.error);
                }
                return result;
            } catch (error: any) {
                logger.error('Error in buddy:launch:', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('buddy:close', async () => {
            try {
                await buddyBrowser.close();
                return { success: true };
            } catch (error: any) {
                logger.error('Error in buddy:close:', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('buddy:status', async () => {
            try {
                return { success: true, isRunning: buddyBrowser.isRunning() };
            } catch (error: any) {
                logger.error('Error in buddy:status:', error);
                return { success: false, error: error.message };
            }
        });
    } catch (error: any) {
        logger.error('💥 [BUDDY] FATAL ERROR during handler registration:', error);
        logger.error('💥 [BUDDY] Error stack:', error.stack);
    }
}
