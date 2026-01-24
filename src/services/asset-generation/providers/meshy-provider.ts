import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import log from 'electron-log';
import type { AssetProvider, AssetGenerationRequest, AssetGenerationResult } from '../types';

const logger = log.scope('meshy-provider');

/**
 * Meshy.ai Provider for 3D Model Generation
 * Generates low-poly Minecraft-style 3D models from text descriptions
 */
export class MeshyModelProvider implements AssetProvider {
    name = 'Meshy.ai';
    type = 'model' as const;

    private apiKey: string;
    private baseUrl = 'https://api.meshy.ai';

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    estimateCost(request: AssetGenerationRequest): number {
        // Meshy text-to-3D: ~$0.10 per model
        return 0.10;
    }

    async generate(request: AssetGenerationRequest): Promise<AssetGenerationResult> {
        const startTime = Date.now();

        try {
            logger.info(`Generating 3D model: ${request.description}`);

            // Craft Minecraft-optimized prompt
            const prompt = this.craftPrompt(request.description, request.metadata);

            // Step 1: Start generation task
            const taskId = await this.startGeneration(prompt);
            logger.info(`Generation task started: ${taskId}`);

            // Step 2: Poll for completion
            const modelUrl = await this.pollForCompletion(taskId);
            logger.info(`Model generated: ${modelUrl}`);

            // Step 3: Download model file
            const modelBuffer = await this.downloadModel(modelUrl);

            // Step 4: Save to mod assets folder
            const fileName = `${request.metadata?.itemName || 'model'}.obj`;
            const assetsDir = path.join(request.modPath, 'assets', 'models');
            await fs.mkdir(assetsDir, { recursive: true });

            const assetPath = path.join(assetsDir, fileName);
            await fs.writeFile(assetPath, modelBuffer);

            const duration = Date.now() - startTime;
            logger.info(`3D model generated successfully in ${duration}ms`);

            return {
                success: true,
                assetPath,
                assetUrl: `file://${assetPath}`,
                cost: 0.10,
                duration
            };

        } catch (error: any) {
            logger.error('Failed to generate 3D model:', error);
            return {
                success: false,
                error: error.message,
                duration: Date.now() - startTime
            };
        }
    }

    private craftPrompt(description: string, metadata?: any): string {
        const style = metadata?.style || 'low-poly blocky';

        return `A Minecraft-style ${description}. 
${style} aesthetic, simple geometry, voxel-inspired design, 
suitable for a blocky game. Clean topology, game-ready asset.`;
    }

    private async startGeneration(prompt: string): Promise<string> {
        const response = await fetch(`${this.baseUrl}/v2/text-to-3d`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                mode: 'preview', // Fast mode for quick iterations
                prompt,
                art_style: 'low-poly',
                negative_prompt: 'high-poly, realistic, detailed, complex geometry',
                enable_pbr: false // Disable PBR for simpler models
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Meshy API error: ${error}`);
        }

        const data = await response.json() as any;
        return data.result; // Task ID
    }

    private async pollForCompletion(taskId: string, maxAttempts = 60): Promise<string> {
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const response = await fetch(`${this.baseUrl}/v2/text-to-3d/${taskId}`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to check task status');
            }

            const data = await response.json() as any;

            if (data.status === 'SUCCEEDED') {
                // Return the model URL (usually .obj or .glb)
                return data.model_urls?.obj || data.model_urls?.glb;
            }

            if (data.status === 'FAILED') {
                throw new Error(`Generation failed: ${data.error || 'Unknown error'}`);
            }

            // Still processing, wait 5 seconds
            logger.info(`Model generation in progress... (${attempt + 1}/${maxAttempts})`);
            await this.sleep(5000);
        }

        throw new Error('Model generation timeout');
    }

    private async downloadModel(url: string): Promise<Buffer> {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Failed to download model');
        }
        return Buffer.from(await response.arrayBuffer());
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
