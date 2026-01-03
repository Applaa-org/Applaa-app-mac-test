import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import log from 'electron-log';
import type { AssetProvider, AssetGenerationRequest, AssetGenerationResult } from '../types';

const logger = log.scope('elevenlabs-provider');

/**
 * ElevenLabs Provider for Sound Effect Generation
 * Generates Minecraft-style sound effects from text descriptions
 */
export class ElevenLabsSoundProvider implements AssetProvider {
    name = 'ElevenLabs';
    type = 'sound' as const;

    private apiKey: string;
    private baseUrl = 'https://api.elevenlabs.io/v1';

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    estimateCost(request: AssetGenerationRequest): number {
        // ElevenLabs sound generation: ~$0.05 per sound
        return 0.05;
    }

    async generate(request: AssetGenerationRequest): Promise<AssetGenerationResult> {
        const startTime = Date.now();

        try {
            logger.info(`Generating sound effect: ${request.description}`);

            // Craft Minecraft-optimized prompt
            const prompt = this.craftPrompt(request.description, request.metadata);

            // Generate sound effect
            const audioBuffer = await this.generateSound(prompt);

            // Save to mod assets folder
            const fileName = `${request.metadata?.itemName || 'sound'}.ogg`;
            const assetsDir = path.join(request.modPath, 'assets', 'sounds');
            await fs.mkdir(assetsDir, { recursive: true });

            const assetPath = path.join(assetsDir, fileName);
            await fs.writeFile(assetPath, audioBuffer);

            const duration = Date.now() - startTime;
            logger.info(`Sound effect generated successfully in ${duration}ms`);

            return {
                success: true,
                assetPath,
                assetUrl: `file://${assetPath}`,
                cost: 0.05,
                duration
            };

        } catch (error: any) {
            logger.error('Failed to generate sound effect:', error);
            return {
                success: false,
                error: error.message,
                duration: Date.now() - startTime
            };
        }
    }

    private craftPrompt(description: string, metadata?: any): string {
        const style = metadata?.style || 'retro 8-bit game';

        return `Minecraft-style ${description} sound effect. 
${style} audio, short duration (0.5-2 seconds), punchy and clear, 
suitable for a blocky voxel game.`;
    }

    private async generateSound(prompt: string): Promise<Buffer> {
        const response = await fetch(`${this.baseUrl}/sound-generation`, {
            method: 'POST',
            headers: {
                'xi-api-key': this.apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: prompt,
                duration_seconds: 1.5,
                prompt_influence: 0.5
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`ElevenLabs API error: ${error}`);
        }

        // Response is audio blob
        return Buffer.from(await response.arrayBuffer());
    }
}
