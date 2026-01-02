/**
 * Simplified Minecraft Mod IPC Handlers
 * Only handles prerequisites checking and opening in MCreator
 */

import { ipcMain } from 'electron';
import log from 'electron-log';
import { checkMinecraftPrerequisites, openInMCreator } from '../../lib/minecraft/prerequisites';

const logger = log.scope('minecraft-handlers');

export function registerMinecraftHandlers() {
    logger.info('Registering simplified Minecraft mod IPC handlers...');

    // Check prerequisites (MCreator and Java)
    ipcMain.handle('minecraft:check-prerequisites', async () => {
        try {
            logger.info('Checking Minecraft mod prerequisites...');
            const prerequisites = await checkMinecraftPrerequisites();
            logger.info('Prerequisites check result:', prerequisites);
            return prerequisites;
        } catch (error) {
            logger.error('Failed to check prerequisites:', error);
            throw error;
        }
    });

    // Open project in MCreator
    ipcMain.handle('minecraft:open-in-mcreator', async (_, { appPath, mcreatorPath }) => {
        try {
            logger.info(`Opening Minecraft mod in MCreator: ${appPath}`);
            await openInMCreator(appPath, mcreatorPath);
            return { success: true };
        } catch (error) {
            logger.error('Failed to open in MCreator:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    });

    logger.info('✅ Simplified Minecraft mod IPC handlers registered successfully');
}
