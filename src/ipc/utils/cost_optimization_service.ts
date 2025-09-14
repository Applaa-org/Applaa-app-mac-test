import log from "electron-log";
import { 
  createCacheableSystemPrompt, 
  getCachingConfig, 
  applicationCache, 
  CostOptimizer,
  estimateTokens 
} from "./prompt_caching";

const logger = log.scope("cost_optimization");

export interface CostOptimizationConfig {
  enablePromptCaching: boolean;
  enableApplicationCaching: boolean;
  enablePromptOptimization: boolean;
  enableBatchProcessing: boolean;
  enableSmartModelRouting: boolean;
}

export interface OptimizedPrompt {
  systemPrompt: any; // Can be string or Anthropic's cacheable format
  estimatedTokens: number;
  cachingStrategy: 'provider' | 'application' | 'none';
  costSavingsEstimate: number;
}

export class CostOptimizationService {
  private config: CostOptimizationConfig;
  private requestCounts = new Map<string, number>();

  constructor(config: Partial<CostOptimizationConfig> = {}) {
    this.config = {
      enablePromptCaching: true,
      enableApplicationCaching: true,
      enablePromptOptimization: true,
      enableBatchProcessing: false, // Future feature
      enableSmartModelRouting: false, // Future feature
      ...config
    };
  }

  /**
   * Optimize system prompt based on provider capabilities
   */
  async optimizeSystemPrompt(
    systemPrompt: string,
    provider: string,
    modelName: string
  ): Promise<OptimizedPrompt> {
    let optimizedPrompt = systemPrompt;
    let cachingStrategy: 'provider' | 'application' | 'none' = 'none';
    
    // Step 1: Optimize prompt text if enabled
    if (this.config.enablePromptOptimization) {
      optimizedPrompt = CostOptimizer.optimizePrompt(systemPrompt);
    }

    const tokens = estimateTokens(optimizedPrompt);
    const cachingConfig = getCachingConfig(provider);

    // Step 2: Apply provider-specific caching
    if (this.config.enablePromptCaching && cachingConfig.enableCaching) {
      // 🚀 FIX: Only use native Anthropic caching for direct Anthropic provider, NOT OpenRouter
      if (provider === 'anthropic') {
        // Use Anthropic's native prompt caching
        const cacheablePrompt = createCacheableSystemPrompt(optimizedPrompt, cachingConfig);
        cachingStrategy = 'provider';
        
        logger.log(`Using Anthropic native prompt caching for ${provider}/${modelName}`);
        
        return {
          systemPrompt: cacheablePrompt,
          estimatedTokens: tokens,
          cachingStrategy,
          costSavingsEstimate: this.calculateSavings(tokens, provider)
        };
      }
    }

    // Step 3: Apply application-level caching for other providers
    if (this.config.enableApplicationCaching) {
      const cacheKey = applicationCache.generateCacheKey(optimizedPrompt, modelName);
      const cached = applicationCache.get(cacheKey);
      
      if (cached) {
        logger.log(`Using application cache for ${provider}/${modelName}`);
        cachingStrategy = 'application';
      } else {
        applicationCache.set(cacheKey, optimizedPrompt);
      }
    }

    return {
      systemPrompt: optimizedPrompt,
      estimatedTokens: tokens,
      cachingStrategy,
      costSavingsEstimate: cachingStrategy !== 'none' ? this.calculateSavings(tokens, provider) : 0
    };
  }

  /**
   * Calculate estimated cost savings
   */
  private calculateSavings(tokens: number, provider: string): number {
    const requestsPerDay = this.getAverageRequestsPerDay(provider);
    const savings = CostOptimizer.calculateSavings(tokens, requestsPerDay, provider);
    return savings.dailySavings;
  }

  /**
   * Get average requests per day for a provider (with fallback)
   */
  private getAverageRequestsPerDay(provider: string): number {
    const count = this.requestCounts.get(provider) || 0;
    return Math.max(count, 50); // Default to 50 requests/day
  }

  /**
   * Track request for analytics
   */
  trackRequest(provider: string): void {
    const current = this.requestCounts.get(provider) || 0;
    this.requestCounts.set(provider, current + 1);
  }

  /**
   * Get optimization statistics
   */
  getOptimizationStats(): {
    totalRequests: number;
    cacheHits: number;
    estimatedSavings: number;
    topProviders: Array<{ provider: string; requests: number }>;
  } {
    const totalRequests = Array.from(this.requestCounts.values()).reduce((sum, count) => sum + count, 0);
    const cacheStats = applicationCache.getStats();
    
    const topProviders = Array.from(this.requestCounts.entries())
      .map(([provider, requests]) => ({ provider, requests }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 5);

    return {
      totalRequests,
      cacheHits: cacheStats.totalHits,
      estimatedSavings: this.calculateTotalSavings(),
      topProviders
    };
  }

  private calculateTotalSavings(): number {
    let totalSavings = 0;
    
    for (const [provider, requests] of this.requestCounts.entries()) {
      // Estimate average tokens per request (based on your system prompts)
      const avgTokens = 12000; // Average of your main system prompts
      const savings = CostOptimizer.calculateSavings(avgTokens, requests, provider);
      totalSavings += savings.dailySavings;
    }
    
    return totalSavings;
  }

  /**
   * Provider-specific optimization strategies
   */
  getProviderOptimizations(): Record<string, string[]> {
    return {
      anthropic: [
        "✅ Native prompt caching (90% savings)",
        "✅ System prompt optimization",
        "✅ Token compression",
        "🔄 Batch processing (coming soon)"
      ],
      openai: [
        "✅ Application-level caching",
        "✅ Prompt optimization",
        "✅ Token limit management",
        "⚠️ No native prompt caching"
      ],
      google: [
        "✅ Application-level caching", 
        "✅ Context caching (limited)",
        "✅ Prompt optimization",
        "💰 Lower base costs"
      ],
      openrouter: [
        "✅ Anthropic model caching",
        "✅ Model-specific optimizations",
        "✅ Cost comparison tools",
        "🔄 Smart routing (coming soon)"
      ]
    };
  }
}

// Global cost optimization service
export const costOptimizationService = new CostOptimizationService();

/**
 * Middleware function to optimize prompts before sending to LLM
 */
export async function optimizeForProvider(
  systemPrompt: string,
  provider: string,
  modelName: string
): Promise<OptimizedPrompt> {
  costOptimizationService.trackRequest(provider);
  return await costOptimizationService.optimizeSystemPrompt(systemPrompt, provider, modelName);
}
