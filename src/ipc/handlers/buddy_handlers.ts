import { ipcMain } from 'electron';
import { getBuddyBrowser } from '../../services/buddy-browser';
import log from 'electron-log';

const logger = log.scope('buddy-handlers');

/**
 * Buddy Browser IPC Handlers
 * Handles launching and managing the Buddy browser with Superpowers extension
 */
export function registerBuddyHandlers() {
    logger.info('🔧 [BUDDY] Starting to register Buddy browser handlers...');

    try {
        const buddyBrowser = getBuddyBrowser();
        logger.info('🔧 [BUDDY] BuddyBrowser instance created successfully');

        // Launch Buddy browser
        logger.info('🔧 [BUDDY] Registering buddy:launch handler...');
        ipcMain.handle('buddy:launch', async () => {
            try {
                logger.info('📞 [BUDDY] IPC: buddy:launch called');
                const result = await buddyBrowser.launch();

                if (result.success) {
                    logger.info('✅ [BUDDY] Buddy browser launched successfully');
                } else {
                    logger.error('❌ [BUDDY] Buddy browser launch failed:', result.error);
                }

                return result;
            } catch (error: any) {
                logger.error('❌ [BUDDY] Error in buddy:launch handler:', error);
                return {
                    success: false,
                    error: error.message,
                };
            }
        });
        logger.info('✅ [BUDDY] buddy:launch handler registered');

        // Close Buddy browser
        logger.info('🔧 [BUDDY] Registering buddy:close handler...');
        ipcMain.handle('buddy:close', async () => {
            try {
                logger.info('📞 [BUDDY] IPC: buddy:close called');
                await buddyBrowser.close();
                return { success: true };
            } catch (error: any) {
                logger.error('❌ [BUDDY] Error in buddy:close handler:', error);
                return {
                    success: false,
                    error: error.message,
                };
            }
        });
        logger.info('✅ [BUDDY] buddy:close handler registered');

        // Get Buddy browser status
        logger.info('🔧 [BUDDY] Registering buddy:status handler...');
        ipcMain.handle('buddy:status', async () => {
            try {
                const isRunning = buddyBrowser.isRunning();
                return {
                    success: true,
                    isRunning,
                };
            } catch (error: any) {
                logger.error('❌ [BUDDY] Error in buddy:status handler:', error);
                return {
                    success: false,
                    error: error.message,
                };
            }
        });
        logger.info('✅ [BUDDY] buddy:status handler registered');

        logger.info('🎉 [BUDDY] ✅ All Buddy browser handlers registered successfully!');
    } catch (error: any) {
        logger.error('💥 [BUDDY] FATAL ERROR during handler registration:', error);
        logger.error('💥 [BUDDY] Error stack:', error.stack);
    }
}
