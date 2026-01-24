// Asset Generation Types

export type AssetType = 'texture' | 'model' | 'sound';

export type TextureProvider = 'dall-e-3' | 'stable-diffusion';
export type ModelProvider = 'meshy' | 'tripo';
export type SoundProvider = 'elevenlabs' | 'audiocraft';

export interface AssetGenerationRequest {
    type: AssetType;
    description: string;
    modPath: string; // Where to save the asset
    metadata?: {
        itemName?: string;
        category?: string;
        style?: string;
    };
}

export interface AssetGenerationResult {
    success: boolean;
    assetPath?: string;
    assetUrl?: string; // For preview
    error?: string;
    cost?: number;
    duration?: number; // milliseconds
}

export interface AssetProvider {
    name: string;
    type: AssetType;
    generate(request: AssetGenerationRequest): Promise<AssetGenerationResult>;
    estimateCost(request: AssetGenerationRequest): number;
}

export interface AssetCache {
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<void>;
    has(key: string): Promise<boolean>;
}

export interface GenerationProgress {
    stage: 'queued' | 'generating' | 'downloading' | 'processing' | 'complete' | 'error';
    progress: number; // 0-100
    message: string;
    estimatedTimeRemaining?: number; // seconds
}
