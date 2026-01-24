/**
 * Roblox Asset Generation IPC Handlers
 * 
 * Handles AI-powered asset generation for Roblox projects.
 */

import { ipcMain } from 'electron';
import log from 'electron-log';
import { readSettings } from '../../main/settings';
import { AssetGenerationService } from '../../services/asset-generation/asset-service';
import path from 'path';
import fs from 'fs';

const logger = log.scope('roblox-asset-handlers');

export function registerRobloxAssetHandlers() {
    const { getAssetGenerationService } = require('../../services/asset-generation/asset-service');
    /**
     * Generate 3D mesh using Meshy.ai
     */
    ipcMain.handle('generate-roblox-mesh', async (_, params: {
        prompt: string;
        appId: number;
        appPath: string;
    }) => {
        try {
            logger.info(`Generating 3D mesh for app ${params.appId}: ${params.prompt}`);

            const settings = readSettings();
            if (!settings.providerSettings?.['meshy']?.apiKey?.value) {
                throw new Error('Meshy API key not configured');
            }

            const assetService = getAssetGenerationService();
            await assetService.init(settings);

            // Generate 3D model
            const result = await assetService.generateAsset({
                type: 'model',
                prompt: params.prompt,
                outputPath: path.join(params.appPath, 'assets', 'models')
            });

            logger.info(`✅ 3D mesh generated: ${result.path}`);

            return {
                success: true,
                path: result.path,
                url: result.url
            };
        } catch (error: any) {
            logger.error('Failed to generate 3D mesh:', error);
            return {
                success: false,
                error: error.message
            };
        }
    });

    /**
     * Generate texture using DALL-E
     */
    ipcMain.handle('generate-roblox-texture', async (_, params: {
        prompt: string;
        appId: number;
        appPath: string;
        size?: '256x256' | '512x512' | '1024x1024';
    }) => {
        try {
            logger.info(`Generating texture for app ${params.appId}: ${params.prompt}`);

            const settings = readSettings();
            if (!settings.providerSettings?.['openai']?.apiKey?.value) {
                throw new Error('OpenAI API key not configured');
            }

            const assetService = getAssetGenerationService();
            await assetService.init(settings);

            // Generate texture
            const result = await assetService.generateAsset({
                type: 'texture',
                prompt: params.prompt,
                outputPath: path.join(params.appPath, 'assets', 'textures'),
                options: {
                    size: params.size || '512x512'
                }
            });

            logger.info(`✅ Texture generated: ${result.path}`);

            return {
                success: true,
                path: result.path,
                url: result.url
            };
        } catch (error: any) {
            logger.error('Failed to generate texture:', error);
            return {
                success: false,
                error: error.message
            };
        }
    });

    /**
     * Generate sound effect using ElevenLabs
     */
    ipcMain.handle('generate-roblox-sound', async (_, params: {
        prompt: string;
        appId: number;
        appPath: string;
        duration?: number;
    }) => {
        try {
            logger.info(`Generating sound for app ${params.appId}: ${params.prompt}`);

            const settings = readSettings();
            if (!settings.providerSettings?.['elevenlabs']?.apiKey?.value) {
                throw new Error('ElevenLabs API key not configured');
            }

            const assetService = getAssetGenerationService();
            await assetService.init(settings);

            // Generate sound
            const result = await assetService.generateAsset({
                type: 'sound',
                prompt: params.prompt,
                outputPath: path.join(params.appPath, 'assets', 'sounds'),
                options: {
                    duration: params.duration || 5
                }
            });

            logger.info(`✅ Sound generated: ${result.path}`);

            return {
                success: true,
                path: result.path,
                url: result.url
            };
        } catch (error: any) {
            logger.error('Failed to generate sound:', error);
            return {
                success: false,
                error: error.message
            };
        }
    });

    /**
     * Get all available templates
     */
    ipcMain.handle('get-roblox-templates', async (_, searchOptions?: any) => {
        try {
            const templateLoaderPath = path.join(__dirname, '../../services/roblox/template-loader');
            const { searchTemplates } = require(templateLoaderPath);

            const templates = searchTemplates(searchOptions || {});

            return {
                success: true,
                templates: templates.map((t: any) => ({
                    id: t.metadata.id,
                    name: t.metadata.name,
                    description: t.metadata.description,
                    category: t.metadata.category,
                    difficulty: t.metadata.difficulty,
                    tags: t.metadata.tags,
                    gameType: t.metadata.gameType,
                    estimatedTime: t.metadata.estimatedTime
                }))
            };
        } catch (error: any) {
            logger.error('Failed to get templates:', error);
            return {
                success: false,
                error: error.message,
                templates: []
            };
        }
    });

    /**
     * Get template by ID
     */
    ipcMain.handle('get-roblox-template', async (_, templateId: string) => {
        try {
            const templateLoaderPath = path.join(__dirname, '../../services/roblox/template-loader');
            const { loadTemplate } = require(templateLoaderPath);

            const template = loadTemplate(templateId);

            if (!template) {
                return {
                    success: false,
                    error: 'Template not found'
                };
            }

            return {
                success: true,
                template
            };
        } catch (error: any) {
            logger.error('Failed to get template:', error);
            return {
                success: false,
                error: error.message
            };
        }
    });

    /**
     * Import external asset into Roblox project
     */
    ipcMain.handle('import-roblox-asset', async (_, params: {
        assetPath: string;
        appId: number;
        appPath: string;
        assetType: '3d-model' | 'texture' | 'sound';
    }) => {
        try {
            logger.info(`Importing ${params.assetType} into app ${params.appId}`);

            // Determine destination folder
            let destFolder = '';
            switch (params.assetType) {
                case '3d-model':
                    destFolder = 'models';
                    break;
                case 'texture':
                    destFolder = 'textures';
                    break;
                case 'sound':
                    destFolder = 'sounds';
                    break;
            }

            const destPath = path.join(params.appPath, 'assets', destFolder);
            fs.mkdirSync(destPath, { recursive: true });

            // Copy file
            const fileName = path.basename(params.assetPath);
            const finalPath = path.join(destPath, fileName);
            fs.copyFileSync(params.assetPath, finalPath);

            logger.info(`✅ Asset imported: ${finalPath}`);

            return {
                success: true,
                path: finalPath
            };
        } catch (error: any) {
            logger.error('Failed to import asset:', error);
            return {
                success: false,
                error: error.message
            };
        }
    });

    logger.info('✅ Roblox asset handlers registered');
}
