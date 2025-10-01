import { EventEmitter } from 'events';
import * as log from 'electron-log';
import { AppType } from './types-simple';

const logger = log.scope('template-cache-manager');

/**
 * Template metadata for caching
 */
export interface TemplateMetadata {
  appType: AppType;
  version: string;
  size: number; // in bytes
  createdAt: number;
  lastAccessed: number;
  accessCount: number;
  optimizations?: any;
  dependencies?: string[];
  buildTime?: number;
  popularity?: number; // Usage popularity score
  loadTime?: number; // Average load time
  errorRate?: number; // Error rate percentage
  tags?: string[]; // Template tags for categorization
  usagePattern?: {
    peakHours: number[];
    frequency: 'high' | 'medium' | 'low' | 'rare';
    lastUsedDays: number[];
  };
}

/**
 * Cached template data
 */
export interface CachedTemplate {
  id: string;
  metadata: TemplateMetadata;
  data: any;
  compiledAssets?: Map<string, Buffer>;
  hotReloadConfig?: any;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  totalEntries: number;
  totalSize: number; // in bytes
  hitRate: number;
  missRate: number;
  evictionCount: number;
  oldestEntry: number;
  newestEntry: number;
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  maxSize: number; // Maximum cache size in bytes
  maxEntries: number; // Maximum number of cached templates
  ttl: number; // Time to live in milliseconds
  evictionPolicy: 'lru' | 'lfu' | 'hybrid' | 'intelligent';
  preloadPopular: boolean;
  compressionEnabled: boolean;
  predictiveCaching: boolean; // Enable predictive caching
  usageAnalytics: boolean; // Track usage patterns
  autoOptimization: boolean; // Auto-optimize templates
  persistentCache: boolean; // Persist cache across sessions
}

/**
 * Advanced template caching system with intelligent eviction policies
 */
export class TemplateCacheManager extends EventEmitter {
  private cache = new Map<string, CachedTemplate>();
  private accessOrder = new Map<string, number>(); // For LRU tracking
  private usageStats = new Map<string, { hits: number; misses: number }>();
  private usagePatterns = new Map<string, {
    hourlyUsage: number[];
    dailyUsage: number[];
    peakHours: number[];
    frequency: 'high' | 'medium' | 'low' | 'rare';
  }>();
  private templateRelations = new Map<string, string[]>(); // Related templates
  private loadTimeHistory = new Map<string, number[]>(); // Load time tracking
  private errorHistory = new Map<string, number>(); // Error tracking
  private totalHits = 0;
  private totalMisses = 0;
  private evictionCount = 0;
  private currentSize = 0;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private analyticsInterval: NodeJS.Timeout | null = null;

  constructor(private config: CacheConfig) {
    super();
    this.startCleanupInterval();
    
    if (this.config.usageAnalytics) {
      this.startAnalyticsTracking();
    }
    
    if (this.config.persistentCache) {
      this.loadPersistentCache();
    }
    
    logger.info('🗄️ Enhanced template cache manager initialized', {
      maxSize: this.config.maxSize,
      maxEntries: this.config.maxEntries,
      policy: this.config.evictionPolicy,
      predictive: this.config.predictiveCaching,
      analytics: this.config.usageAnalytics,
      persistent: this.config.persistentCache
    });
  }

  /**
   * Cache a template with metadata (overloaded for test compatibility)
   */
  public async cacheTemplate(
    appType: AppType,
    templateData: any,
    options: Partial<TemplateMetadata> = {}
  ): Promise<string>;
  public async cacheTemplate(
    appType: AppType,
    templateData: any,
    metadata: { version?: string; optimizations?: any }
  ): Promise<string>;
  public async cacheTemplate(
    appType: AppType,
    templateData: any,
    optionsOrMetadata: Partial<TemplateMetadata> | { version?: string; optimizations?: any } = {}
  ): Promise<string> {
    // Handle both parameter types for backward compatibility
    const options = optionsOrMetadata as Partial<TemplateMetadata>;
    const templateId = this.generateTemplateId(appType, options.version);
    const now = Date.now();
    
    // Calculate template size
    const dataSize = this.calculateSize(templateData);
    
    // Check if we need to evict entries
    await this.ensureCapacity(dataSize);
    
    const metadata: TemplateMetadata = {
      appType,
      version: options.version || '1.0.0',
      size: dataSize,
      createdAt: now,
      lastAccessed: now,
      accessCount: 0,
      optimizations: options.optimizations,
      dependencies: options.dependencies || [],
      buildTime: options.buildTime
    };
    
    const cachedTemplate: CachedTemplate = {
      id: templateId,
      metadata,
      data: this.config.compressionEnabled ? this.compress(templateData) : templateData,
      compiledAssets: new Map(),
      hotReloadConfig: options.optimizations?.hotReload
    };
    
    this.cache.set(templateId, cachedTemplate);
    this.accessOrder.set(templateId, now);
    this.currentSize += dataSize;
    
    logger.info(`📦 Cached template: ${templateId} (${dataSize} bytes)`);
    this.emit('template:cached', templateId, metadata);
    
    return templateId;
  }

  /**
   * Retrieve a cached template with intelligent features
   */
  public async getCachedTemplate(appType: AppType, version?: string): Promise<CachedTemplate | null> {
    const templateId = this.generateTemplateId(appType, version);
    const cached = this.cache.get(templateId);
    
    if (!cached) {
      this.recordMiss(templateId);
      
      // Predictive caching: try to load related templates
      if (this.config.predictiveCaching) {
        this.predictivelyLoadRelatedTemplates(appType);
      }
      
      return null;
    }
    
    // Check TTL with intelligent refresh
    const now = Date.now();
    if (now - cached.metadata.createdAt > this.config.ttl) {
      // Check if template is still popular before evicting
      if (this.isTemplatePopular(templateId)) {
        logger.info(`🔄 Refreshing popular template: ${templateId}`);
        await this.refreshTemplate(templateId);
      } else {
        logger.info(`⏰ Template expired: ${templateId}`);
        this.evictTemplate(templateId);
        this.recordMiss(templateId);
        return null;
      }
    }
    
    // Update access statistics and usage patterns
    cached.metadata.lastAccessed = now;
    cached.metadata.accessCount++;
    this.accessOrder.set(templateId, now);
    
    if (this.config.usageAnalytics) {
      this.updateUsagePattern(templateId, now);
    }
    
    this.recordHit(templateId);
    
    // Decompress if needed
    const data = this.config.compressionEnabled ? this.decompress(cached.data) : cached.data;
    
    return {
      ...cached,
      data
    };
  }

  /**
   * Preload popular templates based on usage patterns
   */
  public async preloadPopularTemplates(): Promise<void> {
    if (!this.config.preloadPopular) {
      return;
    }
    
    logger.info('🚀 Preloading popular templates...');
    
    // Get popular templates from usage stats
    const popularTemplates = this.getPopularTemplates(5);
    
    for (const { appType, hits } of popularTemplates) {
      if (!this.cache.has(this.generateTemplateId(appType))) {
        try {
          // Generate optimized template data for popular types
          const optimizedData = await this.generateOptimizedTemplate(appType);
          await this.cacheTemplate(appType, optimizedData, {
            optimizations: {
              precompiled: true,
              hotReload: true,
              bundleOptimized: true
            }
          });
          
          logger.info(`⚡ Preloaded popular template: ${appType} (${hits} hits)`);
        } catch (error) {
          logger.warn(`⚠️ Failed to preload template ${appType}:`, error);
        }
      }
    }
  }

  /**
   * Invalidate templates by app type or version
   */
  public invalidateTemplates(appType?: AppType, version?: string): number {
    let invalidated = 0;
    
    for (const [templateId, cached] of this.cache.entries()) {
      const shouldInvalidate = 
        (!appType || cached.metadata.appType === appType) &&
        (!version || cached.metadata.version === version);
      
      if (shouldInvalidate) {
        this.evictTemplate(templateId);
        invalidated++;
      }
    }
    
    logger.info(`🗑️ Invalidated ${invalidated} templates`);
    return invalidated;
  }

  /**
   * Get cache statistics
   */
  public getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const totalRequests = this.totalHits + this.totalMisses;
    
    return {
      totalEntries: this.cache.size,
      totalSize: this.currentSize,
      hitRate: totalRequests > 0 ? this.totalHits / totalRequests : 0,
      missRate: totalRequests > 0 ? this.totalMisses / totalRequests : 0,
      evictionCount: this.evictionCount,
      oldestEntry: entries.length > 0 ? Math.min(...entries.map(e => e.metadata.createdAt)) : 0,
      newestEntry: entries.length > 0 ? Math.max(...entries.map(e => e.metadata.createdAt)) : 0
    };
  }

  /**
   * Get popular templates based on usage
   */
  public getPopularTemplates(limit: number = 10): Array<{ appType: AppType; hits: number }> {
    return Array.from(this.usageStats.entries())
      .map(([templateId, stats]) => ({
        appType: this.extractAppTypeFromId(templateId),
        hits: stats.hits
      }))
      .sort((a, b) => b.hits - a.hits)
      .slice(0, limit);
  }

  /**
   * Cleanup expired and least used templates
   */
  public async cleanup(): Promise<void> {
    const now = Date.now();
    let cleaned = 0;
    
    // Remove expired templates
    for (const [templateId, cached] of this.cache.entries()) {
      if (now - cached.metadata.createdAt > this.config.ttl) {
        this.evictTemplate(templateId);
        cleaned++;
      }
    }
    
    // Apply eviction policy if over capacity
    while (this.cache.size > this.config.maxEntries || this.currentSize > this.config.maxSize) {
      const evicted = this.evictLeastValuable();
      if (!evicted) break;
      cleaned++;
    }
    
    if (cleaned > 0) {
      logger.info(`🧹 Cleaned up ${cleaned} templates`);
      this.emit('cache:cleanup', cleaned);
    }
  }

  /**
   * Shutdown the cache manager
   */
  public async shutdown(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    if (this.analyticsInterval) {
      clearInterval(this.analyticsInterval);
      this.analyticsInterval = null;
    }
    
    // Save persistent cache before shutdown
    if (this.config.persistentCache) {
      await this.savePersistentCache();
    }
    
    this.cache.clear();
    this.accessOrder.clear();
    this.usageStats.clear();
    this.usagePatterns.clear();
    this.templateRelations.clear();
    this.loadTimeHistory.clear();
    this.errorHistory.clear();
    this.currentSize = 0;
    
    logger.info('✅ Enhanced template cache manager shutdown complete');
  }

  // Private methods

  private generateTemplateId(appType: AppType, version?: string): string {
    return `${appType}:${version || 'latest'}`;
  }

  private extractAppTypeFromId(templateId: string): AppType {
    return templateId.split(':')[0] as AppType;
  }

  private calculateSize(data: any): number {
    return JSON.stringify(data).length * 2; // Rough estimate in bytes
  }

  private compress(data: any): any {
    // Simple compression simulation - in real implementation, use actual compression
    return { compressed: true, data: JSON.stringify(data) };
  }

  private decompress(compressedData: any): any {
    if (compressedData.compressed) {
      return JSON.parse(compressedData.data);
    }
    return compressedData;
  }

  private async ensureCapacity(requiredSize: number): Promise<void> {
    console.log(`ensureCapacity: cache.size=${this.cache.size}, maxEntries=${this.config.maxEntries}, requiredSize=${requiredSize}`);
    while (
      this.cache.size >= this.config.maxEntries ||
      this.currentSize + requiredSize > this.config.maxSize
    ) {
      console.log(`Attempting eviction: cache.size=${this.cache.size}`);
      const evicted = this.evictLeastValuable();
      console.log(`Eviction result: ${evicted}, new cache.size=${this.cache.size}`);
      if (!evicted) {
        logger.warn('⚠️ Unable to free cache space');
        break;
      }
    }
  }

  private evictLeastValuable(): boolean {
    console.log(`evictLeastValuable: cache.size=${this.cache.size}, policy=${this.config.evictionPolicy}`);
    if (this.cache.size === 0) return false;
    
    let targetId: string;
    
    switch (this.config.evictionPolicy) {
      case 'lru':
        targetId = this.findLRU();
        break;
      case 'lfu':
        targetId = this.findLFU();
        break;
      case 'hybrid':
      default:
        targetId = this.findHybridTarget();
        break;
      case 'intelligent':
        targetId = this.findIntelligentTarget();
        break;
    }
    
    console.log(`Found target for eviction: ${targetId}`);
    if (targetId) {
      this.evictTemplate(targetId);
      return true;
    }
    
    return false;
  }

  private findLRU(): string {
    let oldestId = '';
    let oldestTime = Date.now();
    
    for (const [id, accessTime] of this.accessOrder.entries()) {
      if (accessTime < oldestTime) {
        oldestTime = accessTime;
        oldestId = id;
      }
    }
    
    return oldestId;
  }

  private findLFU(): string {
    let leastUsedId = '';
    let leastCount = Infinity;
    
    for (const [id, cached] of this.cache.entries()) {
      if (cached.metadata.accessCount < leastCount) {
        leastCount = cached.metadata.accessCount;
        leastUsedId = id;
      }
    }
    
    return leastUsedId;
  }

  private findHybridTarget(): string {
    // Hybrid approach: combine recency and frequency
    let targetId = '';
    let lowestScore = Infinity;
    const now = Date.now();
    
    for (const [id, cached] of this.cache.entries()) {
      const recencyScore = (now - cached.metadata.lastAccessed) / (1000 * 60); // minutes
      const frequencyScore = 1 / (cached.metadata.accessCount + 1);
      const hybridScore = recencyScore * 0.7 + frequencyScore * 0.3;
      
      if (hybridScore < lowestScore) {
        lowestScore = hybridScore;
        targetId = id;
      }
    }
    
    return targetId;
  }

  private findIntelligentTarget(): string {
    // Intelligent eviction considering usage patterns, load times, and error rates
    let targetId = '';
    let lowestScore = Infinity;
    const now = Date.now();
    
    for (const [id, cached] of this.cache.entries()) {
      const pattern = this.usagePatterns.get(id);
      const loadTimes = this.loadTimeHistory.get(id) || [];
      const errorCount = this.errorHistory.get(id) || 0;
      
      // Base hybrid score
      const recencyScore = (now - cached.metadata.lastAccessed) / (1000 * 60);
      const frequencyScore = 1 / (cached.metadata.accessCount + 1);
      
      // Pattern-based adjustments
      let patternMultiplier = 1;
      if (pattern) {
        if (pattern.frequency === 'high') patternMultiplier = 0.3;
        else if (pattern.frequency === 'medium') patternMultiplier = 0.6;
        else if (pattern.frequency === 'low') patternMultiplier = 0.8;
      }
      
      // Performance-based adjustments
      const avgLoadTime = loadTimes.length > 0 ? loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length : 0;
      const loadTimeMultiplier = avgLoadTime > 1000 ? 1.2 : 1; // Penalize slow templates
      
      // Error-based adjustments
      const errorMultiplier = errorCount > 5 ? 1.5 : 1; // Penalize error-prone templates
      
      const intelligentScore = (recencyScore * 0.4 + frequencyScore * 0.3) * 
                              patternMultiplier * loadTimeMultiplier * errorMultiplier;
      
      if (intelligentScore < lowestScore) {
        lowestScore = intelligentScore;
        targetId = id;
      }
    }
    
    return targetId;
  }

  private evictTemplate(templateId: string): void {
    const cached = this.cache.get(templateId);
    if (cached) {
      this.currentSize -= cached.metadata.size;
      this.cache.delete(templateId);
      this.accessOrder.delete(templateId);
      this.evictionCount++;
      
      logger.debug(`🗑️ Evicted template: ${templateId}`);
      this.emit('template:evicted', templateId, cached.metadata);
    }
  }

  private recordHit(templateId: string): void {
    this.totalHits++;
    const stats = this.usageStats.get(templateId) || { hits: 0, misses: 0 };
    stats.hits++;
    this.usageStats.set(templateId, stats);
  }

  private recordMiss(templateId: string): void {
    this.totalMisses++;
    const stats = this.usageStats.get(templateId) || { hits: 0, misses: 0 };
    stats.misses++;
    this.usageStats.set(templateId, stats);
  }

  private async generateOptimizedTemplate(appType: AppType): Promise<any> {
    // Generate optimized template data based on app type
    const baseTemplate = {
      appType,
      optimized: true,
      precompiled: true,
      hotReloadEnabled: true
    };
    
    switch (appType) {
      case 'react':
        return {
          ...baseTemplate,
          framework: 'react',
          bundler: 'vite',
          features: ['typescript', 'hot-reload', 'fast-refresh']
        };
      case 'vue':
        return {
          ...baseTemplate,
          framework: 'vue',
          bundler: 'vite',
          features: ['typescript', 'hot-reload', 'composition-api']
        };
      case 'angular':
        return {
          ...baseTemplate,
          framework: 'angular',
          bundler: 'webpack',
          features: ['typescript', 'hot-reload', 'ivy-renderer']
        };
      default:
        return baseTemplate;
    }
  }

  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup().catch(error => {
        logger.error('❌ Cache cleanup error:', error);
      });
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Start analytics tracking interval
   */
  private startAnalyticsTracking(): void {
    if (this.analyticsInterval) {
      clearInterval(this.analyticsInterval);
    }
    
    this.analyticsInterval = setInterval(() => {
      this.analyzeUsagePatterns();
      this.optimizeCache();
    }, 300000); // Analyze every 5 minutes
  }

  /**
   * Update usage pattern for a template
   */
  private updateUsagePattern(templateId: string, timestamp: number): void {
    const hour = new Date(timestamp).getHours();
    const day = new Date(timestamp).getDay();
    
    let pattern = this.usagePatterns.get(templateId);
    if (!pattern) {
      pattern = {
        hourlyUsage: new Array(24).fill(0),
        dailyUsage: new Array(7).fill(0),
        peakHours: [],
        frequency: 'low'
      };
      this.usagePatterns.set(templateId, pattern);
    }
    
    pattern.hourlyUsage[hour]++;
    pattern.dailyUsage[day]++;
    
    // Update frequency classification
    const totalUsage = pattern.hourlyUsage.reduce((sum, count) => sum + count, 0);
    if (totalUsage > 100) pattern.frequency = 'high';
    else if (totalUsage > 50) pattern.frequency = 'medium';
    else if (totalUsage > 10) pattern.frequency = 'low';
    else pattern.frequency = 'rare';
    
    // Update peak hours
    const maxUsage = Math.max(...pattern.hourlyUsage);
    pattern.peakHours = pattern.hourlyUsage
      .map((usage, hour) => ({ hour, usage }))
      .filter(({ usage }) => usage >= maxUsage * 0.8)
      .map(({ hour }) => hour);
  }

  /**
   * Check if a template is popular based on usage patterns
   */
  private isTemplatePopular(templateId: string): boolean {
    const pattern = this.usagePatterns.get(templateId);
    if (!pattern) return false;
    
    const cached = this.cache.get(templateId);
    if (!cached) return false;
    
    // Consider popular if:
    // 1. High frequency usage
    // 2. Recent access (within last hour)
    // 3. High access count relative to age
    const now = Date.now();
    const recentAccess = now - cached.metadata.lastAccessed < 3600000; // 1 hour
    const highAccessRate = cached.metadata.accessCount > 10;
    
    return pattern.frequency === 'high' || (recentAccess && highAccessRate);
  }

  /**
   * Refresh an expired but popular template
   */
  private async refreshTemplate(templateId: string): Promise<void> {
    const cached = this.cache.get(templateId);
    if (!cached) return;
    
    try {
      // Update timestamp to extend TTL
      cached.metadata.createdAt = Date.now();
      
      // Emit refresh event for external handling
      this.emit('templateRefresh', {
        templateId,
        appType: cached.metadata.appType,
        reason: 'popular_template_refresh'
      });
      
      logger.info(`✨ Refreshed popular template: ${templateId}`);
    } catch (error) {
      logger.error(`❌ Failed to refresh template ${templateId}:`, error);
      this.evictTemplate(templateId);
    }
  }

  /**
   * Predictively load related templates
   */
  private async predictivelyLoadRelatedTemplates(appType: AppType): Promise<void> {
    const relatedTemplates = this.templateRelations.get(appType) || [];
    
    for (const relatedType of relatedTemplates) {
      if (!this.cache.has(this.generateTemplateId(relatedType as AppType))) {
        // Emit event to request preloading of related template
        this.emit('predictiveLoad', {
          appType: relatedType,
          reason: 'related_template_prediction',
          triggerType: appType
        });
      }
    }
  }

  /**
   * Analyze usage patterns and optimize cache
   */
  private analyzeUsagePatterns(): void {
    const now = new Date();
    const currentHour = now.getHours();
    
    // Find templates that should be preloaded based on patterns
    for (const [templateId, pattern] of this.usagePatterns.entries()) {
      if (pattern.peakHours.includes(currentHour) && !this.cache.has(templateId)) {
        const appType = this.extractAppTypeFromId(templateId);
        this.emit('predictiveLoad', {
          appType,
          reason: 'peak_hour_prediction',
          hour: currentHour
        });
      }
    }
  }

  /**
   * Optimize cache based on usage patterns
   */
  private optimizeCache(): void {
    if (!this.config.autoOptimization) return;
    
    // Remove rarely used templates during off-peak hours
    const now = new Date();
    const isOffPeak = now.getHours() >= 2 && now.getHours() <= 6;
    
    if (isOffPeak) {
      for (const [templateId, pattern] of this.usagePatterns.entries()) {
        if (pattern.frequency === 'rare' && this.cache.has(templateId)) {
          const cached = this.cache.get(templateId)!;
          const daysSinceAccess = (Date.now() - cached.metadata.lastAccessed) / (1000 * 60 * 60 * 24);
          
          if (daysSinceAccess > 7) {
            logger.info(`🧹 Removing rarely used template during optimization: ${templateId}`);
            this.evictTemplate(templateId);
          }
        }
      }
    }
  }

  /**
   * Load persistent cache from storage
   */
  private async loadPersistentCache(): Promise<void> {
    try {
      // This would typically load from disk/database
      // For now, just emit an event for external handling
      this.emit('loadPersistentCache');
      logger.info('📂 Loading persistent cache...');
    } catch (error) {
      logger.error('❌ Failed to load persistent cache:', error);
    }
  }

  /**
   * Save cache to persistent storage
   */
  private async savePersistentCache(): Promise<void> {
    if (!this.config.persistentCache) return;
    
    try {
      const cacheData = {
        templates: Array.from(this.cache.entries()),
        usagePatterns: Array.from(this.usagePatterns.entries()),
        usageStats: Array.from(this.usageStats.entries()),
        templateRelations: Array.from(this.templateRelations.entries())
      };
      
      this.emit('savePersistentCache', cacheData);
      logger.info('💾 Saving persistent cache...');
    } catch (error) {
      logger.error('❌ Failed to save persistent cache:', error);
    }
  }

  /**
   * Track template load time
   */
  public trackLoadTime(templateId: string, loadTime: number): void {
    let history = this.loadTimeHistory.get(templateId);
    if (!history) {
      history = [];
      this.loadTimeHistory.set(templateId, history);
    }
    
    history.push(loadTime);
    
    // Keep only last 10 load times
    if (history.length > 10) {
      history.shift();
    }
    
    // Update template metadata
    const cached = this.cache.get(templateId);
    if (cached) {
      cached.metadata.loadTime = history.reduce((sum, time) => sum + time, 0) / history.length;
    }
  }

  /**
   * Track template error
   */
  public trackError(templateId: string): void {
    const currentCount = this.errorHistory.get(templateId) || 0;
    this.errorHistory.set(templateId, currentCount + 1);
    
    // Update template metadata
    const cached = this.cache.get(templateId);
    if (cached) {
      const totalErrors = currentCount + 1;
      const totalAccess = cached.metadata.accessCount;
      cached.metadata.errorRate = totalAccess > 0 ? (totalErrors / totalAccess) * 100 : 0;
    }
  }

  /**
   * Establish relationship between templates
   */
  public addTemplateRelation(primaryType: AppType, relatedTypes: AppType[]): void {
    const existing = this.templateRelations.get(primaryType) || [];
    const combined = [...new Set([...existing, ...relatedTypes.map(t => t.toString())])];
    this.templateRelations.set(primaryType, combined);
    
    logger.info(`🔗 Added template relations for ${primaryType}:`, relatedTypes);
  }

  /**
   * Get enhanced cache statistics with intelligence metrics
   */
  public getEnhancedStats(): any {
    const baseStats = this.getStats();
    
    const patternStats = {
      totalPatterns: this.usagePatterns.size,
      highFrequencyTemplates: Array.from(this.usagePatterns.values())
        .filter(p => p.frequency === 'high').length,
      mediumFrequencyTemplates: Array.from(this.usagePatterns.values())
        .filter(p => p.frequency === 'medium').length,
      lowFrequencyTemplates: Array.from(this.usagePatterns.values())
        .filter(p => p.frequency === 'low').length,
      rareTemplates: Array.from(this.usagePatterns.values())
        .filter(p => p.frequency === 'rare').length
    };
    
    const performanceStats = {
      averageLoadTime: this.calculateAverageLoadTime(),
      totalErrors: Array.from(this.errorHistory.values())
        .reduce((sum, count) => sum + count, 0),
      templatesWithErrors: this.errorHistory.size,
      templateRelations: this.templateRelations.size
    };
    
    return {
      ...baseStats,
      patterns: patternStats,
      performance: performanceStats,
      intelligence: {
        predictiveCaching: this.config.predictiveCaching,
        usageAnalytics: this.config.usageAnalytics,
        autoOptimization: this.config.autoOptimization,
        persistentCache: this.config.persistentCache
      }
    };
  }

  /**
   * Calculate average load time across all templates
   */
  private calculateAverageLoadTime(): number {
    const allLoadTimes: number[] = [];
    
    for (const history of this.loadTimeHistory.values()) {
      allLoadTimes.push(...history);
    }
    
    return allLoadTimes.length > 0 ? 
      allLoadTimes.reduce((sum, time) => sum + time, 0) / allLoadTimes.length : 0;
  }

  /**
   * Get templates recommended for preloading
   */
  public getPreloadRecommendations(): { templateId: string; reason: string; priority: number }[] {
    const recommendations: { templateId: string; reason: string; priority: number }[] = [];
    const currentHour = new Date().getHours();
    
    // Analyze patterns for recommendations
    for (const [templateId, pattern] of this.usagePatterns.entries()) {
      if (!this.cache.has(templateId)) {
        let priority = 0;
        let reason = '';
        
        // Peak hour prediction
        if (pattern.peakHours.includes(currentHour)) {
          priority += 50;
          reason += 'peak-hour ';
        }
        
        // Frequency-based priority
        switch (pattern.frequency) {
          case 'high': priority += 40; reason += 'high-frequency '; break;
          case 'medium': priority += 25; reason += 'medium-frequency '; break;
          case 'low': priority += 10; reason += 'low-frequency '; break;
        }
        
        if (priority > 0) {
          recommendations.push({
            templateId,
            reason: reason.trim(),
            priority
          });
        }
      }
    }
    
    return recommendations.sort((a, b) => b.priority - a.priority);
  }
}

export default TemplateCacheManager;