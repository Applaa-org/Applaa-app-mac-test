import log from 'electron-log';
import path from 'path';
import { app } from 'electron';
import type {
    AssetProvider,
    AssetGenerationRequest,
    AssetGenerationResult,
    AssetType
} from './types';
import { AssetCache } from './cache';
import { DalleTextureProvider } from './providers/dalle-provider';
import { MeshyModelProvider } from './providers/meshy-provider';
import { ElevenLabsSoundProvider } from './providers/elevenlabs-provider';

const logger = log.scope('asset-service');

/**
 * Central Asset Generation Service
 * Orchestrates multiple AI providers for generating Minecraft mod assets
 */
export class AssetGenerationService {
    private providers: Map<string, AssetProvider> = new Map();
    private cache: AssetCache;
    private enabled = false;

    constructor() {
        const cacheDir = path.join(app.getPath('userData'), 'asset-cache');
        this.cache = new AssetCache(cacheDir);
    }

    async init(settings: any) {
        await this.cache.init();

        // Initialize DALL-E if OpenAI key exists
        if (settings?.openaiApiKey) {
            const dalleProvider = new DalleTextureProvider(settings.openaiApiKey);
            this.providers.set('dall-e-texture', dalleProvider);
            this.enabled = true;
            logger.info('DALL-E texture provider initialized');
        }

        // Initialize Meshy if API key exists
        if (settings?.meshyApiKey) {
            const meshyProvider = new MeshyModelProvider(settings.meshyApiKey);
            this.providers.set('meshy-model', meshyProvider);
            this.enabled = true;
            logger.info('Meshy 3D model provider initialized');
        }

        // Initialize ElevenLabs if API key exists
        if (settings?.elevenLabsApiKey) {
            const elevenLabsProvider = new ElevenLabsSoundProvider(settings.elevenLabsApiKey);
            this.providers.set('elevenlabs-sound', elevenLabsProvider);
            this.enabled = true;
            logger.info('ElevenLabs sound provider initialized');
        }
    }

    isEnabled(): boolean {
        return this.enabled && this.providers.size > 0;
    }

    getAvailableProviders(): string[] {
        return Array.from(this.providers.keys());
    }

    async generateAsset(request: AssetGenerationRequest): Promise<AssetGenerationResult> {
        if (!this.enabled) {
            return {
                success: false,
                error: 'Asset generation is not enabled. Please configure API keys in settings.'
            };
        }

        // Check cache first
        const cacheKey = `${request.type}:${request.description}`;
        const cached = await this.cache.get(request.description, request.type);

        if (cached) {
            logger.info(`Using cached asset: ${cached}`);
            return {
                success: true,
                assetPath: cached,
                assetUrl: `file://${cached}`,
                cost: 0,
                duration: 0
            };
        }

        // Select provider based on asset type
        const provider = this.selectProvider(request.type);

        if (!provider) {
            return {
                success: false,
                error: `No provider available for ${request.type} generation`
            };
        }

        // Generate asset
        logger.info(`Generating ${request.type} with ${provider.name}...`);
        const result = await provider.generate(request);

        // Cache successful results
        if (result.success && result.assetPath) {
            await this.cache.set(request.description, request.type, result.assetPath);
        }

        return result;
    }

    async generateMultiple(requests: AssetGenerationRequest[]): Promise<AssetGenerationResult[]> {
        // Generate all assets in parallel
        return Promise.all(requests.map(req => this.generateAsset(req)));
    }

    estimateCost(request: AssetGenerationRequest): number {
        const provider = this.selectProvider(request.type);
        return provider ? provider.estimateCost(request) : 0;
    }

    private selectProvider(type: AssetType): AssetProvider | null {
        switch (type) {
            case 'texture':
                return this.providers.get('dall-e-texture') || null;
            case 'model':
                return this.providers.get('meshy-model') || null;
            case 'sound':
                return this.providers.get('elevenlabs-sound') || null;
            default:
                return null;
        }
    }
}

// Singleton instance
let serviceInstance: AssetGenerationService | null = null;

export function getAssetGenerationService(): AssetGenerationService {
    if (!serviceInstance) {
        serviceInstance = new AssetGenerationService();
    }
    return serviceInstance;
}
