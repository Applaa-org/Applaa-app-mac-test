import { ipcMain } from 'electron';
import { getMinecraftSandbox } from '../../services/minecraft-sandbox';
import log from 'electron-log';

const logger = log.scope('minecraft-sandbox-handlers');

export interface StartSandboxParams {
    modPath?: string;
    port?: number;
}

export interface TestItemParams {
    itemName: string;
}

export function registerMinecraftSandboxHandlers() {
    // Start sandbox
    ipcMain.handle('minecraft-sandbox:start', async (_, params: StartSandboxParams) => {
        try {
            logger.info('Starting Minecraft sandbox with params:', params);
            const sandbox = getMinecraftSandbox();
            const result = await sandbox.start(params.modPath);
            logger.info('Sandbox started successfully:', result);
            return result;
        } catch (error) {
            logger.error('Failed to start sandbox:', error);
            throw error;
        }
    });

    // Stop sandbox
    ipcMain.handle('minecraft-sandbox:stop', async () => {
        try {
            logger.info('Stopping Minecraft sandbox');
            const sandbox = getMinecraftSandbox();
            await sandbox.stop();
            logger.info('Sandbox stopped successfully');
            return { success: true };
        } catch (error) {
            logger.error('Failed to stop sandbox:', error);
            throw error;
        }
    });

    // Get sandbox status
    ipcMain.handle('minecraft-sandbox:status', async () => {
        try {
            const sandbox = getMinecraftSandbox();
            const status = sandbox.getStatus();
            return status;
        } catch (error) {
            logger.error('Failed to get sandbox status:', error);
            throw error;
        }
    });

    // Load mod
    ipcMain.handle('minecraft-sandbox:load-mod', async (_, modPath: string) => {
        try {
            logger.info('Loading mod:', modPath);
            const sandbox = getMinecraftSandbox();
            await sandbox.loadMod(modPath);
            logger.info('Mod loaded successfully');
            return { success: true };
        } catch (error) {
            logger.error('Failed to load mod:', error);
            throw error;
        }
    });

    // Test item
    ipcMain.handle('minecraft-sandbox:test-item', async (_, params: TestItemParams) => {
        try {
            logger.info('Testing item:', params.itemName);
            const sandbox = getMinecraftSandbox();
            const result = await sandbox.testItem(params.itemName);
            logger.info('Item test result:', result);
            return result;
        } catch (error) {
            logger.error('Failed to test item:', error);
            throw error;
        }
    });

}
