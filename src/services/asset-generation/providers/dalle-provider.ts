import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import { Jimp, ResizeStrategy } from 'jimp';
import log from 'electron-log';
import type { AssetProvider, AssetGenerationRequest, AssetGenerationResult } from '../types';

const logger = log.scope('dalle-provider');

/**
 * DALL-E 3 Provider for Minecraft Texture Generation
 * Uses existing OpenAI API key from settings
 */
export class DalleTextureProvider implements AssetProvider {
    name = 'DALL-E 3';
    type = 'texture' as const;

    private apiKey: string;
    private baseUrl = 'https://api.openai.com/v1/images/generations';

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    estimateCost(request: AssetGenerationRequest): number {
        // DALL-E 3 standard quality: $0.04 per image
        return 0.04;
    }

    async generate(request: AssetGenerationRequest): Promise<AssetGenerationResult> {
        const startTime = Date.now();

        try {
            logger.info(`Generating texture: ${request.description}`);

            // Craft Minecraft-optimized prompt
            const prompt = this.craftPrompt(request.description, request.metadata);

            // Call DALL-E API
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'dall-e-3',
                    prompt,
                    size: '1024x1024',
                    quality: 'standard',
                    n: 1
                })
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`DALL-E API error: ${error}`);
            }

            const data = await response.json() as any;
            const imageUrl = data.data[0].url;

            // Download image
            logger.info('Downloading generated image...');
            const imageResponse = await fetch(imageUrl);
            const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

            // Resize to 16x16 (Minecraft standard) using nearest-neighbor for pixel art (Jimp: no native deps)
            const image = await Jimp.read(imageBuffer);
            image.resize({ w: 16, h: 16, mode: ResizeStrategy.NEAREST_NEIGHBOR });
            const resized = await image.getBuffer('image/png');

            // Save to mod assets folder
            const fileName = `${request.metadata?.itemName || 'texture'}.png`;
            const assetsDir = path.join(request.modPath, 'assets', 'textures');
            await fs.mkdir(assetsDir, { recursive: true });

            const assetPath = path.join(assetsDir, fileName);
            await fs.writeFile(assetPath, resized);

            const duration = Date.now() - startTime;
            logger.info(`Texture generated successfully in ${duration}ms`);

            return {
                success: true,
                assetPath,
                assetUrl: `file://${assetPath}`,
                cost: 0.04,
                duration
            };

        } catch (error: any) {
            logger.error('Failed to generate texture:', error);
            return {
                success: false,
                error: error.message,
                duration: Date.now() - startTime
            };
        }
    }

    private craftPrompt(description: string, metadata?: any): string {
        const style = metadata?.style || 'vibrant pixel art';

        return `Create a Minecraft-style 16x16 pixel art texture for: ${description}. 
Style: ${style}, top-down view, clear edges, game asset quality, 
vibrant colors suitable for a blocky voxel game. 
The texture should be simple, iconic, and instantly recognizable.`;
    }
}
