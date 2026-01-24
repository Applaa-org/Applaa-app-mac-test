/**
 * Cost Calculator for Minecraft Mod Asset Generation
 * 
 * Transparently shows kids:
 * - How much their mod costs to generate (API costs)
 * - How much it would cost to buy on the market
 * - How much they're saving by building it themselves!
 */

export interface AssetCost {
    type: 'texture' | 'model' | 'sound' | 'code';
    provider: string;
    quantity: number;
    costPerUnit: number;
    totalCost: number;
}

export interface ModCostBreakdown {
    assets: AssetCost[];
    totalGenerationCost: number;
    marketValue: number;
    savings: number;
    savingsPercentage: number;
}

/**
 * API Cost Rates (as of 2026)
 */
const API_COSTS = {
    // Texture Generation
    'dall-e-3': 0.04,           // $0.04 per image
    'stable-diffusion': 0.01,   // $0.01 per image

    // 3D Model Generation
    'meshy': 0.10,              // $0.10 per model
    'tripo': 0.08,              // $0.08 per model

    // Sound Generation
    'elevenlabs': 0.05,         // $0.05 per sound
    'audiocraft': 0.00,         // Free (self-hosted)

    // Code Generation (LLM)
    'gemini-flash': 0.0001,     // ~$0.0001 per mod (very cheap!)
    'gpt-4': 0.001,             // ~$0.001 per mod
};

/**
 * Market Value Estimates
 * Based on average prices for custom Minecraft mods/assets
 */
const MARKET_VALUES = {
    customTexture: 5.00,        // $5 per custom texture pack
    custom3DModel: 15.00,       // $15 per custom 3D model
    customSound: 3.00,          // $3 per custom sound effect
    customMod: 25.00,           // $25 for a complete custom mod
    premiumMod: 50.00,          // $50 for a premium mod with assets
};

/**
 * Calculate the cost breakdown for a Minecraft mod
 */
export function calculateModCost(params: {
    textureCount: number;
    textureProvider: keyof typeof API_COSTS;
    modelCount: number;
    modelProvider: keyof typeof API_COSTS;
    soundCount: number;
    soundProvider: keyof typeof API_COSTS;
    codeProvider: keyof typeof API_COSTS;
}): ModCostBreakdown {
    const assets: AssetCost[] = [];

    // Texture costs
    if (params.textureCount > 0) {
        const costPerUnit = API_COSTS[params.textureProvider] || 0;
        assets.push({
            type: 'texture',
            provider: params.textureProvider,
            quantity: params.textureCount,
            costPerUnit,
            totalCost: params.textureCount * costPerUnit,
        });
    }

    // 3D Model costs
    if (params.modelCount > 0) {
        const costPerUnit = API_COSTS[params.modelProvider] || 0;
        assets.push({
            type: 'model',
            provider: params.modelProvider,
            quantity: params.modelCount,
            costPerUnit,
            totalCost: params.modelCount * costPerUnit,
        });
    }

    // Sound costs
    if (params.soundCount > 0) {
        const costPerUnit = API_COSTS[params.soundProvider] || 0;
        assets.push({
            type: 'sound',
            provider: params.soundProvider,
            quantity: params.soundCount,
            costPerUnit,
            totalCost: params.soundCount * costPerUnit,
        });
    }

    // Code generation cost
    const codeCost = API_COSTS[params.codeProvider] || 0;
    assets.push({
        type: 'code',
        provider: params.codeProvider,
        quantity: 1,
        costPerUnit: codeCost,
        totalCost: codeCost,
    });

    // Calculate totals
    const totalGenerationCost = assets.reduce((sum, asset) => sum + asset.totalCost, 0);

    // Calculate market value
    const marketValue =
        (params.textureCount * MARKET_VALUES.customTexture) +
        (params.modelCount * MARKET_VALUES.custom3DModel) +
        (params.soundCount * MARKET_VALUES.customSound) +
        MARKET_VALUES.customMod; // Base mod cost

    const savings = marketValue - totalGenerationCost;
    const savingsPercentage = (savings / marketValue) * 100;

    return {
        assets,
        totalGenerationCost,
        marketValue,
        savings,
        savingsPercentage,
    };
}

/**
 * Format cost for display
 */
export function formatCost(cost: number): string {
    if (cost < 0.01) {
        return '< $0.01';
    }
    return `$${cost.toFixed(2)}`;
}

/**
 * Get a kid-friendly cost message
 */
export function getKidFriendlyCostMessage(breakdown: ModCostBreakdown): string {
    const { totalGenerationCost, marketValue, savings, savingsPercentage } = breakdown;

    if (totalGenerationCost < 0.50) {
        return `🎉 Your mod costs less than 50¢ to make, but would cost ${formatCost(marketValue)} to buy! You're saving ${formatCost(savings)}!`;
    }

    if (savingsPercentage > 90) {
        return `🚀 Amazing! You're saving ${savingsPercentage.toFixed(0)}% by building this yourself! (${formatCost(savings)} saved)`;
    }

    return `💰 Building this mod costs ${formatCost(totalGenerationCost)}, but buying it would cost ${formatCost(marketValue)}. You save ${formatCost(savings)}!`;
}

/**
 * Example usage for a "Fire Sword" mod
 */
export function exampleFireSwordCost(): ModCostBreakdown {
    return calculateModCost({
        textureCount: 2,              // Sword texture + fireball texture
        textureProvider: 'dall-e-3',
        modelCount: 1,                // Custom sword 3D model
        modelProvider: 'meshy',
        soundCount: 2,                // Whoosh + explosion sounds
        soundProvider: 'elevenlabs',
        codeProvider: 'gemini-flash',
    });
}

/**
 * Get cost estimate before generation
 */
export function getPreGenerationEstimate(assetTypes: {
    textures?: number;
    models?: number;
    sounds?: number;
}): string {
    const textureCount = assetTypes.textures || 0;
    const modelCount = assetTypes.models || 0;
    const soundCount = assetTypes.sounds || 0;

    // Use default providers for estimate
    const estimate = calculateModCost({
        textureCount,
        textureProvider: 'dall-e-3',
        modelCount,
        modelProvider: 'meshy',
        soundCount,
        soundProvider: 'elevenlabs',
        codeProvider: 'gemini-flash',
    });

    return `📊 Estimated cost: ${formatCost(estimate.totalGenerationCost)} (Market value: ${formatCost(estimate.marketValue)}, You save: ${formatCost(estimate.savings)})`;
}
