/**
 * 🧠 SMART CACHE MANAGER
 * 
 * Intelligent caching system for preview resources:
 * - Template caching and pre-warming
 * - Dependency resolution caching
 * - Build artifact caching
 * - Smart eviction policies
 */

import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import log from 'electron-log';
import { AppType } from './types-simple';

const logger = log.scope('smart-cache-manager');

interface CacheEntry {
  key: string;
  data: any;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
  ttl?: number;
  tags: string[];
  priority: CachePriority;
  templateType?: string;
  usagePattern?: UsagePattern;
}

enum CachePriority {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  CRITICAL = 4
}

interface UsagePattern {
  peakHours: number[];
  frequency: 'rare' | 'occasional' | 'frequent' | 'constant';
  lastPeakUsage: number;
  trendingScore: number;
}

interface CacheStats {
  totalEntries: number;
  totalSize: number;
  hitRate: number;
  missRate: number;
  evictionCount: number;
  templateCacheHits: number;
  dependencyCacheHits: number;
  buildCacheHits: number;
  averageLoadTime: number;
  memoryEfficiency: number;
}

/**
 * SmartCacheManager - Intelligent caching for preview resources
 * 
 * Features:
 * 1. LRU eviction with intelligent scoring
 * 2. Tag-based cache invalidation
 * 3. Pre-warming for frequently used templates
 * 4. Compression for large cache entries
 * 5. Persistent cache across sessions
 */
export class SmartCacheManager extends EventEmitter {
  private cache = new Map<string, CacheEntry>();
  private stats: CacheStats = {
    totalEntries: 0,
    totalSize: 0,
    hitRate: 0,
    missRate: 0,
    evictionCount: 0,
    templateCacheHits: 0,
    dependencyCacheHits: 0,
    buildCacheHits: 0,
    averageLoadTime: 0,
    memoryEfficiency: 0,
  };

  private templateUsagePatterns = new Map<string, UsagePattern>();
  private loadTimeTracker = new Map<string, number[]>();

  private maxSize = 500 * 1024 * 1024; // 500MB
  private maxEntries = 10000;
  private defaultTtl = 24 * 60 * 60 * 1000; // 24 hours
  private cacheDir: string;
  private isInitialized = false;

  private hits = 0;
  private misses = 0;

  constructor(cacheDir?: string) {
    super();
    this.cacheDir = cacheDir || path.join(process.cwd(), '.cache', 'preview');
    logger.info('🧠 SmartCacheManager initialized');
  }

  /**
   * Initialize the cache manager
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      logger.info('🔧 Initializing SmartCacheManager...');

      // Ensure cache directory exists
      await fs.mkdir(this.cacheDir, { recursive: true });

      // Load persistent cache
      await this.loadPersistentCache();

      this.isInitialized = true;
      logger.info('✅ SmartCacheManager initialized successfully');

    } catch (error) {
      logger.error('❌ Failed to initialize SmartCacheManager:', error);
      throw error;
    }
  }

  /**
   * Get item from cache with enhanced tracking
   */
  public get<T>(key: string): T | null {
    const startTime = Date.now();
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      this.updateStats();
      return null;
    }

    // Check TTL
    if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.misses++;
      this.updateStats();
      return null;
    }

    // Update access info and usage patterns
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.updateUsagePattern(key, entry);

    // Track load time
    const loadTime = Date.now() - startTime;
    this.trackLoadTime(key, loadTime);

    // Update specific cache type stats
    if (key.startsWith('template:')) {
      this.stats.templateCacheHits++;
    } else if (key.startsWith('deps:')) {
      this.stats.dependencyCacheHits++;
    } else if (key.startsWith('build:')) {
      this.stats.buildCacheHits++;
    }

    this.hits++;
    this.updateStats();

    logger.debug(`📖 Cache hit for key: ${key} (${loadTime}ms)`);
    return entry.data as T;
  }

  /**
   * Set item in cache with intelligent prioritization
   */
  public async set(key: string, data: any, options: {
    ttl?: number;
    tags?: string[];
    compress?: boolean;
    priority?: CachePriority;
    templateType?: string;
  } = {}): Promise<void> {
    try {
      const size = this.calculateSize(data);
      const priority = options.priority || this.determinePriority(key, options.tags || []);

      const entry: CacheEntry = {
        key,
        data: options.compress ? this.compress(data) : data,
        timestamp: Date.now(),
        accessCount: 1,
        lastAccessed: Date.now(),
        size,
        ttl: options.ttl || this.defaultTtl,
        tags: options.tags || [],
        priority,
        templateType: options.templateType,
        usagePattern: this.initializeUsagePattern(key),
      };

      // Check if we need to evict entries
      await this.ensureCapacity(size);

      this.cache.set(key, entry);
      this.updateStats();

      logger.debug(`💾 Cached item with key: ${key} (size: ${size} bytes, priority: ${CachePriority[priority]})`);

    } catch (error) {
      logger.error(`❌ Failed to cache item with key ${key}:`, error);
    }
  }

  /**
   * Delete item from cache
   */
  public delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.updateStats();
      logger.debug(`🗑️ Deleted cache entry: ${key}`);
    }
    return deleted;
  }

  /**
   * Clear cache by tags
   */
  public clearByTags(tags: string[]): number {
    let cleared = 0;

    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (entry.tags.some(tag => tags.includes(tag))) {
        this.cache.delete(key);
        cleared++;
      }
    }

    if (cleared > 0) {
      this.updateStats();
      logger.info(`🧹 Cleared ${cleared} cache entries by tags: ${tags.join(', ')}`);
    }

    return cleared;
  }

  /**
   * Pre-warm cache for app type with intelligent prioritization
   */
  public async preWarm(appType: AppType, templates: string[]): Promise<void> {
    try {
      logger.info(`🔥 Pre-warming cache for ${appType} with ${templates.length} templates`);

      // Sort templates by popularity and priority
      const sortedTemplates = templates.sort((a, b) => {
        const popularTemplates = ['react', 'vue', 'next', 'angular', 'svelte'];
        const aIndex = popularTemplates.indexOf(a);
        const bIndex = popularTemplates.indexOf(b);

        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        return a.localeCompare(b);
      });

      const preWarmPromises = sortedTemplates.map(async (template, index) => {
        const key = this.generateTemplateKey(appType, template);

        // Skip if already cached
        if (this.cache.has(key)) {
          return;
        }

        // Load and cache template data
        const templateData = await this.loadTemplateData(appType, template);
        if (templateData) {
          const priority = index < 3 ? CachePriority.HIGH : CachePriority.MEDIUM;
          await this.set(key, templateData, {
            tags: ['template', appType, template, 'prewarmed'],
            ttl: 7 * 24 * 60 * 60 * 1000, // 7 days for templates
            priority,
            templateType: template
          });
        }
      });

      await Promise.all(preWarmPromises);

      logger.info(`✅ Pre-warming complete for ${appType}`);

    } catch (error) {
      logger.error(`❌ Pre-warming failed for ${appType}:`, error);
    }
  }

  /**
   * Preload templates based on usage patterns
   */
  public async preloadByUsagePattern(appType: AppType): Promise<void> {
    const currentHour = new Date().getHours();
    const templatesToPreload: string[] = [];

    // Find templates that are typically used at this hour
    for (const [key, pattern] of Array.from(this.templateUsagePatterns.entries())) {
      if (pattern.peakHours.includes(currentHour) && pattern.frequency !== 'rare') {
        const templateType = key.replace(`template:${appType}:`, '');
        if (key.startsWith(`template:${appType}:`)) {
          templatesToPreload.push(templateType);
        }
      }
    }

    if (templatesToPreload.length > 0) {
      logger.info(`🕐 Preloading ${templatesToPreload.length} templates for peak hour ${currentHour}`);
      await this.preWarm(appType, templatesToPreload);
    }
  }

  /**
   * Get template recommendations based on current usage patterns
   */
  public getTemplateRecommendations(appType: AppType, limit: number = 5): string[] {
    const recommendations = Array.from(this.templateUsagePatterns.entries())
      .filter(([key, pattern]) => key.startsWith(`template:${appType}:`) && pattern.frequency !== 'rare')
      .sort((a, b) => {
        const scoreA = this.calculatePatternScore(a[1]);
        const scoreB = this.calculatePatternScore(b[1]);
        return scoreB - scoreA;
      })
      .slice(0, limit)
      .map(([key, _]) => key.replace(`template:${appType}:`, ''));

    return recommendations;
  }

  /**
   * Calculate pattern score for recommendations
   */
  private calculatePatternScore(pattern: UsagePattern): number {
    const frequencyScore = {
      'rare': 1,
      'occasional': 3,
      'frequent': 7,
      'constant': 10
    }[pattern.frequency];

    const currentHour = new Date().getHours();
    const isPeakHour = pattern.peakHours.includes(currentHour);
    const peakBonus = isPeakHour ? 5 : 0;

    return frequencyScore + peakBonus + (pattern.trendingScore / 100);
  }

  /**
   * Cache dependency resolution
   */
  public async cacheDependencyResolution(appId: number, dependencies: any): Promise<void> {
    const key = `deps:${appId}`;
    await this.set(key, dependencies, {
      tags: ['dependencies', `app:${appId}`],
      ttl: 60 * 60 * 1000, // 1 hour
    });
  }

  /**
   * Get cached dependency resolution
   */
  public getCachedDependencyResolution(appId: number): any | null {
    const key = `deps:${appId}`;
    return this.get(key);
  }

  /**
   * Cache build artifacts
   */
  public async cacheBuildArtifacts(appId: number, artifacts: any): Promise<void> {
    const key = `build:${appId}`;
    await this.set(key, artifacts, {
      tags: ['build', `app:${appId}`],
      ttl: 2 * 60 * 60 * 1000, // 2 hours
      compress: true,
    });
  }

  /**
   * Get cached build artifacts
   */
  public getCachedBuildArtifacts(appId: number): any | null {
    const key = `build:${appId}`;
    const data = this.get(key);
    return data ? this.decompress(data as string) : null;
  }

  /**
   * Cleanup expired entries
   */
  public async cleanup(): Promise<void> {
    try {
      const now = Date.now();
      let cleaned = 0;

      for (const [key, entry] of Array.from(this.cache.entries())) {
        if (entry.ttl && now - entry.timestamp > entry.ttl) {
          this.cache.delete(key);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        this.updateStats();
        logger.info(`🧹 Cleaned up ${cleaned} expired cache entries`);
      }

      // Save persistent cache
      await this.savePersistentCache();

    } catch (error) {
      logger.error('❌ Cache cleanup failed:', error);
    }
  }

  /**
   * Get cache statistics
   */
  public getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Clear all cache
   */
  public clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    this.updateStats();
    logger.info('🧹 Cache cleared');
  }

  /**
   * Ensure cache doesn't exceed capacity with intelligent eviction
   */
  private async ensureCapacity(newEntrySize: number): Promise<void> {
    // Check size limit with smart template-aware eviction
    if (this.stats.totalSize + newEntrySize > this.maxSize) {
      const targetSize = this.maxSize * 0.8; // Target 80% capacity
      this.evictByTemplate(targetSize);
    }

    // Check entry count limit with priority-aware eviction
    if (this.cache.size >= this.maxEntries) {
      const toEvict = Math.ceil(this.maxEntries * 0.1); // Evict 10%

      // First try to evict low priority items
      this.evictByPriority(CachePriority.LOW);

      // If still over limit, evict medium priority items
      if (this.cache.size >= this.maxEntries) {
        this.evictByPriority(CachePriority.MEDIUM);
      }

      // Last resort: evict by usage patterns (but preserve critical)
      if (this.cache.size >= this.maxEntries) {
        await this.evictLeastUsed(toEvict);
      }
    }
  }

  /**
   * Evict least used entries with intelligent prioritization
   */
  private async evictLeastUsed(count: number): Promise<void> {
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => {
        // Score based on access count, recency, and size
        const scoreA = this.calculateEvictionScore(a);
        const scoreB = this.calculateEvictionScore(b);
        return scoreA - scoreB; // Lower score = more likely to evict
      });

    for (let i = 0; i < Math.min(count, entries.length); i++) {
      const [key] = entries[i];
      this.cache.delete(key);
      this.stats.evictionCount++;
    }

    logger.info(`🗑️ Evicted ${Math.min(count, entries.length)} cache entries`);
  }

  /**
   * Smart eviction based on template usage patterns
   */
  private evictByTemplate(targetSize: number): void {
    const currentSize = this.stats.totalSize;
    if (currentSize <= targetSize) return;

    const entries = Array.from(this.cache.entries())
      .map(([key, entry]) => ({ key, entry, score: this.calculateEvictionScore(entry) }))
      .sort((a, b) => a.score - b.score);

    let freedSize = 0;
    const toEvict: string[] = [];

    for (const { key, entry } of entries) {
      // Never evict critical priority items
      if (entry.priority === CachePriority.CRITICAL) continue;

      toEvict.push(key);
      freedSize += entry.size;

      if (currentSize - freedSize <= targetSize) break;
    }

    for (const key of toEvict) {
      this.delete(key);
    }
  }

  /**
   * Evict entries by priority level
   */
  private evictByPriority(maxPriority: CachePriority): void {
    const toEvict: string[] = [];

    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (entry.priority <= maxPriority) {
        toEvict.push(key);
      }
    }

    for (const key of toEvict) {
      this.delete(key);
    }
  }

  /**
   * Evict entries to reach target size
   */
  private async evictToSize(targetSize: number): Promise<void> {
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => {
        const scoreA = this.calculateEvictionScore(a);
        const scoreB = this.calculateEvictionScore(b);
        return scoreA - scoreB;
      });

    let currentSize = this.stats.totalSize;
    let evicted = 0;

    for (const [key, entry] of entries) {
      if (currentSize <= targetSize) {
        break;
      }

      this.cache.delete(key);
      currentSize -= entry.size;
      evicted++;
      this.stats.evictionCount++;
    }

    logger.info(`🗑️ Evicted ${evicted} cache entries to reach target size`);
  }

  /**
   * Calculate intelligent eviction score (lower = more likely to evict)
   */
  private calculateEvictionScore(entry: CacheEntry): number {
    const now = Date.now();
    const age = now - entry.timestamp;
    const timeSinceAccess = now - entry.lastAccessed;

    // Base factors
    const accessScore = entry.accessCount * 100;
    const recencyScore = Math.max(0, 1000 - timeSinceAccess / 1000);
    const sizeScore = -entry.size / 1024;

    // Priority multiplier (higher priority = higher score = less likely to evict)
    const priorityMultiplier = entry.priority * 500;

    // Usage pattern bonus
    let patternBonus = 0;
    if (entry.usagePattern) {
      const currentHour = new Date().getHours();
      const isPeakHour = entry.usagePattern.peakHours.includes(currentHour);
      const frequencyBonus = {
        'rare': 0,
        'occasional': 100,
        'frequent': 300,
        'constant': 500
      }[entry.usagePattern.frequency];

      patternBonus = frequencyBonus + (isPeakHour ? 200 : 0) + entry.usagePattern.trendingScore;
    }

    // Template type bonus
    let templateBonus = 0;
    if (entry.templateType) {
      const popularTemplates = ['react', 'vue', 'next', 'angular'];
      templateBonus = popularTemplates.includes(entry.templateType) ? 300 : 100;
    }

    return accessScore + recencyScore + sizeScore + priorityMultiplier + patternBonus + templateBonus;
  }

  /**
   * Get usage stats for a specific key
   */
  public async getUsageStats(key: string): Promise<{ accessCount: number; lastAccessed: number } | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;

    return {
      accessCount: entry.accessCount,
      lastAccessed: entry.lastAccessed
    };
  }

  /**
   * Determine cache priority based on key and tags
   */
  private determinePriority(key: string, tags: string[]): CachePriority {
    // Critical: System templates and core dependencies
    if (tags.includes('system') || tags.includes('core') || key.includes('critical')) {
      return CachePriority.CRITICAL;
    }

    // High: Popular templates and frequently used dependencies
    if (tags.includes('template') || tags.includes('popular') || key.startsWith('template:react') || key.startsWith('template:vue')) {
      return CachePriority.HIGH;
    }

    // Medium: Build artifacts and common dependencies
    if (tags.includes('build') || tags.includes('dependencies')) {
      return CachePriority.MEDIUM;
    }

    // Low: Everything else
    return CachePriority.LOW;
  }

  /**
   * Initialize usage pattern for new cache entry
   */
  private initializeUsagePattern(key: string): UsagePattern {
    const existing = this.templateUsagePatterns.get(key);
    if (existing) {
      return existing;
    }

    return {
      peakHours: [],
      frequency: 'rare',
      lastPeakUsage: Date.now(),
      trendingScore: 0
    };
  }

  /**
   * Update usage pattern based on access
   */
  private updateUsagePattern(key: string, entry: CacheEntry): void {
    if (!entry.usagePattern) {
      entry.usagePattern = this.initializeUsagePattern(key);
    }

    const currentHour = new Date().getHours();
    const pattern = entry.usagePattern;

    // Track peak hours
    if (!pattern.peakHours.includes(currentHour)) {
      pattern.peakHours.push(currentHour);
      if (pattern.peakHours.length > 6) { // Keep only top 6 peak hours
        pattern.peakHours.shift();
      }
    }

    // Update frequency based on access count and time
    const hoursSinceCreation = (Date.now() - entry.timestamp) / (1000 * 60 * 60);
    const accessesPerHour = entry.accessCount / Math.max(hoursSinceCreation, 1);

    if (accessesPerHour > 10) {
      pattern.frequency = 'constant';
    } else if (accessesPerHour > 2) {
      pattern.frequency = 'frequent';
    } else if (accessesPerHour > 0.5) {
      pattern.frequency = 'occasional';
    } else {
      pattern.frequency = 'rare';
    }

    // Update trending score
    const recentAccesses = entry.accessCount * Math.max(0, 1 - (Date.now() - entry.lastAccessed) / (24 * 60 * 60 * 1000));
    pattern.trendingScore = Math.min(1000, recentAccesses * 10);

    this.templateUsagePatterns.set(key, pattern);
  }

  /**
   * Track load time for performance monitoring
   */
  private trackLoadTime(key: string, loadTime: number): void {
    if (!this.loadTimeTracker.has(key)) {
      this.loadTimeTracker.set(key, []);
    }

    const times = this.loadTimeTracker.get(key)!;
    times.push(loadTime);

    // Keep only last 100 measurements
    if (times.length > 100) {
      times.shift();
    }

    // Update average load time
    const allTimes = Array.from(this.loadTimeTracker.values()).flat();
    this.stats.averageLoadTime = allTimes.reduce((sum, time) => sum + time, 0) / allTimes.length;
  }

  /**
   * Calculate size of data
   */
  private calculateSize(data: any): number {
    try {
      return JSON.stringify(data).length * 2; // Rough estimate (UTF-16)
    } catch {
      return 1024; // Default size if can't calculate
    }
  }

  /**
   * Compress data (simplified)
   */
  private compress(data: any): string {
    // In a real implementation, you'd use a compression library like zlib
    return JSON.stringify(data);
  }

  /**
   * Decompress data (simplified)
   */
  private decompress(data: string): any {
    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  }

  /**
   * Generate template cache key
   */
  private generateTemplateKey(appType: AppType, template: string): string {
    return `template:${appType}:${template}`;
  }

  /**
   * Load template data
   */
  private async loadTemplateData(appType: AppType, template: string): Promise<any | null> {
    try {
      // This would load actual template data from your template system
      // For now, return a placeholder
      return {
        appType,
        template,
        timestamp: Date.now(),
        // ... template data
      };
    } catch (error) {
      logger.error(`❌ Failed to load template data for ${appType}:${template}:`, error);
      return null;
    }
  }

  /**
   * Update cache statistics
   */
  private updateStats(): void {
    this.stats.totalEntries = this.cache.size;
    this.stats.totalSize = Array.from(this.cache.values())
      .reduce((sum, entry) => sum + entry.size, 0);

    const total = this.hits + this.misses;
    if (total > 0) {
      this.stats.hitRate = this.hits / total;
      this.stats.missRate = this.misses / total;
    }
  }

  /**
   * Load persistent cache from disk
   */
  private async loadPersistentCache(): Promise<void> {
    try {
      const cacheFile = path.join(this.cacheDir, 'cache.json');
      const data = await fs.readFile(cacheFile, 'utf-8');
      const persistentData = JSON.parse(data);

      // Restore cache entries
      for (const entry of persistentData.entries || []) {
        this.cache.set(entry.key, entry);
      }

      // Restore stats
      if (persistentData.stats) {
        this.stats = { ...this.stats, ...persistentData.stats };
      }

      logger.info(`📂 Loaded ${this.cache.size} entries from persistent cache`);

    } catch (error) {
      // It's okay if cache file doesn't exist
      logger.debug('No persistent cache found, starting fresh');
    }
  }

  /**
   * Save persistent cache to disk
   */
  private async savePersistentCache(): Promise<void> {
    try {
      const cacheFile = path.join(this.cacheDir, 'cache.json');
      const persistentData = {
        entries: Array.from(this.cache.values()),
        stats: this.stats,
        timestamp: Date.now(),
      };

      await fs.writeFile(cacheFile, JSON.stringify(persistentData, null, 2));
      logger.debug('💾 Saved persistent cache to disk');

    } catch (error) {
      logger.error('❌ Failed to save persistent cache:', error);
    }
  }

  /**
   * Shutdown the cache manager
   */
  public async shutdown(): Promise<void> {
    logger.info('🔄 Shutting down SmartCacheManager...');

    // Save persistent cache
    await this.savePersistentCache();

    // Clear memory cache
    this.cache.clear();

    this.isInitialized = false;
    logger.info('✅ SmartCacheManager shutdown complete');
  }
}