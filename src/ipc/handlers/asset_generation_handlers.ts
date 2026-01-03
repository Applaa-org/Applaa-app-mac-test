import { ipcMain } from 'electron';
import log from 'electron-log';
import { getAssetGenerationService } from '@/services/asset-generation/asset-service';
import type { AssetGenerationRequest } from '@/services/asset-generation/types';

const logger = log.scope('asset-handlers');

export function registerAssetGenerationHandlers() {
    const assetService = getAssetGenerationService();

    // Check if asset generation is enabled
    ipcMain.handle('asset:is-enabled', async () => {
        try {
            return assetService.isEnabled();
        } catch (error) {
            logger.error('Failed to check asset generation status:', error);
            return false;
        }
    });

    // Get available providers
    ipcMain.handle('asset:get-providers', async () => {
        try {
            return assetService.getAvailableProviders();
        } catch (error) {
            logger.error('Failed to get providers:', error);
            return [];
        }
    });

    // Generate a single asset
    ipcMain.handle('asset:generate', async (_, request: AssetGenerationRequest) => {
        try {
            logger.info(`Generating ${request.type}: ${request.description}`);
            return await assetService.generateAsset(request);
        } catch (error: any) {
            logger.error('Asset generation failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    });

    // Generate multiple assets in parallel
    ipcMain.handle('asset:generate-batch', async (_, requests: AssetGenerationRequest[]) => {
        try {
            logger.info(`Generating ${requests.length} assets in batch`);
            return await assetService.generateMultiple(requests);
        } catch (error: any) {
            logger.error('Batch generation failed:', error);
            return requests.map(() => ({
                success: false,
                error: error.message
            }));
        }
    });

    // Estimate cost for asset generation
    ipcMain.handle('asset:estimate-cost', async (_, request: AssetGenerationRequest) => {
        try {
            return assetService.estimateCost(request);
        } catch (error) {
            logger.error('Cost estimation failed:', error);
            return 0;
        }
    });

    logger.info('Asset generation handlers registered');
}
