import log from 'electron-log';
import { getAssetGenerationService } from './asset-generation/asset-service';
import type { AssetGenerationRequest } from './asset-generation/types';

const logger = log.scope('minecraft-asset-helper');

/**
 * Helper to analyze Minecraft mod prompts and generate appropriate assets
 */
export class MinecraftAssetHelper {

    /**
     * Analyze a mod description and determine what assets are needed
     */
    static analyzeModPrompt(description: string): {
        needsTexture: boolean;
        needsModel: boolean;
        needsSound: boolean;
        itemName: string;
        textureDescription?: string;
        modelDescription?: string;
        soundDescription?: string;
    } {
        const lowerDesc = description.toLowerCase();

        // Extract item name (simple heuristic)
        const itemName = this.extractItemName(description);

        // Determine if assets are needed
        const needsTexture = this.needsTexture(lowerDesc);
        const needsModel = this.needsModel(lowerDesc);
        const needsSound = this.needsSound(lowerDesc);

        return {
            needsTexture,
            needsModel,
            needsSound,
            itemName,
            textureDescription: needsTexture ? this.generateTexturePrompt(description) : undefined,
            modelDescription: needsModel ? this.generateModelPrompt(description) : undefined,
            soundDescription: needsSound ? this.generateSoundPrompt(description) : undefined
        };
    }

    /**
     * Generate assets for a Minecraft mod in parallel
     */
    static async generateModAssets(
        modPath: string,
        description: string
    ): Promise<{
        texture?: string;
        model?: string;
        sound?: string;
        totalCost: number;
        errors: string[];
    }> {
        const analysis = this.analyzeModPrompt(description);
        const assetService = getAssetGenerationService();

        if (!assetService.isEnabled()) {
            logger.warn('Asset generation not enabled');
            return { totalCost: 0, errors: ['Asset generation not enabled'] };
        }

        const requests: AssetGenerationRequest[] = [];

        if (analysis.needsTexture && analysis.textureDescription) {
            requests.push({
                type: 'texture',
                description: analysis.textureDescription,
                modPath,
                metadata: { itemName: analysis.itemName }
            });
        }

        if (analysis.needsModel && analysis.modelDescription) {
            requests.push({
                type: 'model',
                description: analysis.modelDescription,
                modPath,
                metadata: { itemName: analysis.itemName }
            });
        }

        if (analysis.needsSound && analysis.soundDescription) {
            requests.push({
                type: 'sound',
                description: analysis.soundDescription,
                modPath,
                metadata: { itemName: `${analysis.itemName}_use` }
            });
        }

        if (requests.length === 0) {
            return { totalCost: 0, errors: [] };
        }

        logger.info(`Generating ${requests.length} assets for mod...`);
        const results = await assetService.generateMultiple(requests);

        const response: any = {
            totalCost: 0,
            errors: []
        };

        results.forEach((result, index) => {
            if (result.success) {
                const type = requests[index].type;
                response[type] = result.assetPath;
                response.totalCost += result.cost || 0;
            } else {
                response.errors.push(`${requests[index].type}: ${result.error}`);
            }
        });

        return response;
    }

    private static extractItemName(description: string): string {
        // Simple extraction: take first noun-like word
        const words = description.toLowerCase().split(' ');
        const stopWords = ['a', 'an', 'the', 'create', 'make', 'build', 'mod', 'that', 'with'];
        const itemWord = words.find(w => !stopWords.includes(w) && w.length > 2);
        return (itemWord || 'item').replace(/[^a-z0-9]/g, '_');
    }

    private static needsTexture(desc: string): boolean {
        // Items, blocks, tools typically need textures
        return desc.includes('sword') || desc.includes('tool') ||
            desc.includes('item') || desc.includes('block') ||
            desc.includes('ore') || desc.includes('armor');
    }

    private static needsModel(desc: string): boolean {
        // 3D items need models
        return desc.includes('sword') || desc.includes('tool') ||
            desc.includes('weapon') || desc.includes('armor');
    }

    private static needsSound(desc: string): boolean {
        // Actions typically need sounds
        return desc.includes('swing') || desc.includes('hit') ||
            desc.includes('break') || desc.includes('use') ||
            desc.includes('explosion') || desc.includes('fire');
    }

    private static generateTexturePrompt(desc: string): string {
        return `${desc} texture`;
    }

    private static generateModelPrompt(desc: string): string {
        return `${desc} 3D model`;
    }

    private static generateSoundPrompt(desc: string): string {
        return `${desc} sound effect`;
    }
}
