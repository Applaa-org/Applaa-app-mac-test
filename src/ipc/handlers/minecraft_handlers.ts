/**
 * Minecraft Mod IPC Handlers
 * Handles building and downloading Minecraft mods
 */

import { ipcMain } from 'electron';
import log from 'electron-log';
import path from 'path';
import { app } from 'electron';
import { buildMinecraftMod, checkBuildTools } from '../../lib/minecraft/mod-builder';
import { performHotReload } from '../../lib/minecraft/hot-reload';
import type { MinecraftModSpecification } from '../../lib/minecraft/mod-specification';

const logger = log.scope('minecraft-handlers');

export function registerMinecraftHandlers() {
    logger.info('Registering Minecraft mod IPC handlers...');

    // Build a Minecraft mod from specification
    ipcMain.handle('minecraft:build-mod', async (_, spec: MinecraftModSpecification) => {
        try {
            logger.info(`Building Minecraft mod: ${spec.modName}`);

            // Use a temp directory for building
            const tempDir = path.join(app.getPath('temp'), 'applaa-minecraft-builds');

            const result = await buildMinecraftMod(spec, tempDir);

            if (result.success) {
                logger.info(`Mod built successfully: ${result.jarPath}`);
            } else {
                logger.error(`Mod build failed: ${result.error}`);
            }

            return result;
        } catch (error) {
            logger.error('Failed to build Minecraft mod:', error);
            throw error;
        }
    });

    // Build and hot-reload mod into Minecraft
    ipcMain.handle('minecraft:build-and-test', async (_, spec: MinecraftModSpecification) => {
        try {
            logger.info(`Building and testing Minecraft mod: ${spec.modName}`);

            // Build the mod first
            const tempDir = path.join(app.getPath('temp'), 'applaa-minecraft-builds');
            const buildResult = await buildMinecraftMod(spec, tempDir);

            if (!buildResult.success) {
                return {
                    success: false,
                    error: buildResult.error,
                    logs: buildResult.logs,
                    restarted: false
                };
            }

            // Perform hot reload
            const hotReloadResult = await performHotReload(
                buildResult.jarPath!,
                spec.modId,
                true // Auto-restart Minecraft
            );

            return {
                success: hotReloadResult.success,
                message: hotReloadResult.message,
                logs: [...buildResult.logs, ...hotReloadResult.logs],
                restarted: hotReloadResult.restarted,
                jarPath: buildResult.jarPath
            };
        } catch (error) {
            logger.error('Failed to build and test mod:', error);
            throw error;
        }
    });

    // Check if build tools are installed
    ipcMain.handle('minecraft:check-tools', async () => {
        try {
            const tools = await checkBuildTools();
            logger.info('Build tools check:', tools);
            return tools;
        } catch (error) {
            logger.error('Failed to check build tools:', error);
            throw error;
        }
    });

    // Install build tools
    ipcMain.handle('minecraft:install-tools', async (event) => {
        try {
            logger.info('Starting tools installation...');
            const { installTools } = await import('../../lib/minecraft/tool-installer');

            const success = await installTools((log) => {
                // Send progress updates to renderer
                event.sender.send('minecraft:install-progress', log);
            });

            return { success };
        } catch (error) {
            logger.error('Failed to install tools:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    });

    // Extract assets from JAR
    ipcMain.handle('minecraft:extract-assets', async (_, jarPath: string) => {
        try {
            const { extractAssets } = await import('../../lib/minecraft/asset-extractor');
            const assets = await extractAssets(jarPath);
            return { success: true, assets };
        } catch (error) {
            logger.error('Failed to extract assets:', error);
            return {
                success: false,
                assets: [],
                error: error instanceof Error ? error.message : String(error)
            };
        }
    });

    logger.info('✅ Minecraft mod IPC handlers registered successfully');
}
