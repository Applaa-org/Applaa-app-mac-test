import log from "electron-log";

const logger = log.scope("prompt_caching");

export interface CacheablePromptPart {
  type: "text";
  text: string;
  cache_control?: {
    type: "ephemeral";
  };
}

export interface PromptCachingConfig {
  enableCaching: boolean;
  minTokensForCaching: number;
  provider: string;
}

/**
 * Estimates token count for text (rough approximation: 4 chars per token)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Creates a cacheable system prompt for Anthropic models
 */
export function createCacheableSystemPrompt(
  systemPrompt: string,
  config: PromptCachingConfig
): CacheablePromptPart[] {
  const tokens = estimateTokens(systemPrompt);
  
  if (!config.enableCaching || tokens < config.minTokensForCaching) {
    logger.log(`System prompt not cached: ${tokens} tokens < ${config.minTokensForCaching} minimum`);
    return [{ type: "text", text: systemPrompt }];
  }

  logger.log(`Creating cacheable system prompt: ${tokens} tokens for ${config.provider}`);
  
  return [
    {
      type: "text",
      text: systemPrompt,
      cache_control: { type: "ephemeral" }
    }
  ];
}

/**
 * Gets caching configuration based on provider
 */
export function getCachingConfig(provider: string): PromptCachingConfig {
  switch (provider) {
    case "anthropic":
      return {
        enableCaching: true,
        minTokensForCaching: 1024, // Anthropic minimum for Claude 3.5 Sonnet/Opus
        provider
      };
    case "openrouter":
      // Check if it's an Anthropic model via OpenRouter
      return {
        enableCaching: true,
        minTokensForCaching: 1024,
        provider
      };
    default:
      return {
        enableCaching: false,
        minTokensForCaching: 0,
        provider
      };
  }
}

/**
 * Application-level caching for non-Anthropic providers
 */
class ApplicationCache {
  private cache = new Map<string, { content: string; timestamp: number; hits: number }>();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes like Anthropic

  generateCacheKey(systemPrompt: string, modelName: string): string {
    // Create a hash-like key from the prompt and model
    const content = systemPrompt + modelName;
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `prompt_${Math.abs(hash)}`;
  }

  get(key: string): string | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }

    // Update hit count and timestamp
    entry.hits++;
    entry.timestamp = Date.now();
    
    logger.log(`Cache hit for key ${key} (${entry.hits} total hits)`);
    return entry.content;
  }

  set(key: string, content: string): void {
    this.cache.set(key, {
      content,
      timestamp: Date.now(),
      hits: 0
    });
    
    logger.log(`Cached content for key ${key}`);
    
    // Clean up old entries periodically
    if (this.cache.size > 100) {
      this.cleanup();
    }
  }

  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.TTL) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    logger.log(`Cleaned up ${cleaned} expired cache entries`);
  }

  getStats(): { size: number; totalHits: number } {
    let totalHits = 0;
    for (const entry of this.cache.values()) {
      totalHits += entry.hits;
    }
    
    return {
      size: this.cache.size,
      totalHits
    };
  }
}

// Global application cache instance
export const applicationCache = new ApplicationCache();

/**
 * Cost optimization utilities for different providers
 */
export class CostOptimizer {
  /**
   * Optimize prompt for token efficiency
   */
  static optimizePrompt(prompt: string): string {
    // Remove excessive whitespace
    let optimized = prompt.replace(/\s+/g, ' ').trim();
    
    // Remove redundant phrases (basic optimization)
    const redundantPhrases = [
      /\b(please|kindly)\s+/gi,
      /\b(very|really|extremely)\s+/gi,
      /\s+(and|or|but)\s+\1\s+/gi, // Remove duplicate conjunctions
    ];
    
    for (const phrase of redundantPhrases) {
      optimized = optimized.replace(phrase, ' ');
    }
    
    // Clean up multiple spaces again
    optimized = optimized.replace(/\s+/g, ' ').trim();
    
    const originalTokens = estimateTokens(prompt);
    const optimizedTokens = estimateTokens(optimized);
    const savings = originalTokens - optimizedTokens;
    
    if (savings > 0) {
      logger.log(`Prompt optimization saved ${savings} tokens (${((savings/originalTokens)*100).toFixed(1)}%)`);
    }
    
    return optimized;
  }

  /**
   * Calculate cost savings from caching
   */
  static calculateSavings(
    tokens: number,
    requestsPerDay: number,
    provider: string
  ): { dailySavings: number; monthlySavings: number; annualSavings: number } {
    const pricing = this.getPricing(provider);
    
    const withoutCaching = (tokens / 1000000) * pricing.write * requestsPerDay;
    const withCaching = (tokens / 1000000) * pricing.write + 
                       (tokens / 1000000) * pricing.cacheRead * (requestsPerDay - 1);
    
    const dailySavings = withoutCaching - withCaching;
    
    return {
      dailySavings,
      monthlySavings: dailySavings * 30,
      annualSavings: dailySavings * 365
    };
  }

  private static getPricing(provider: string): { write: number; read: number; cacheRead: number } {
    switch (provider) {
      case "anthropic":
        return { write: 3.75, read: 0.30, cacheRead: 0.30 }; // Claude 3.5 Sonnet
      case "openai":
        return { write: 2.50, read: 0.25, cacheRead: 1.25 }; // GPT-4 (50% savings)
      case "google":
        return { write: 1.25, read: 0.125, cacheRead: 0.03125 }; // Gemini (75% savings)
      default:
        return { write: 2.00, read: 0.20, cacheRead: 0.20 }; // Generic
    }
  }
}
