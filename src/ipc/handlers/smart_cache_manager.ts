/**
 * 🚀 SMART CACHE MANAGER
 * Implements intelligent caching for faster Expo app creation and preview
 */

import * as fs from 'fs';
import * as path from 'path';
import log from 'electron-log';
import { performance } from 'perf_hooks';

const logger = log.scope('smart-cache');

interface CacheEntry {
  key: string;
  data: any;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  size?: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  totalSize: number;
  entries: number;
}

class SmartCacheManager {
  private cache = new Map<string, CacheEntry>();
  private stats: CacheStats = { hits: 0, misses: 0, totalSize: 0, entries: 0 };
  private maxSize = 500 * 1024 * 1024; // 500MB max cache size
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * 📋 TEMPLATE CACHE: Cache pre-built templates for instant copying
   */
  async cacheTemplate(templateId: string, templatePath: string): Promise<void> {
    const startTime = performance.now();
    
    try {
      // Read template files into memory
      const templateData = await this.readDirectoryRecursive(templatePath);
      const cacheKey = `template:${templateId}`;
      
      this.set(cacheKey, templateData, 24 * 60 * 60 * 1000); // 24 hours TTL
      
      const cacheTime = performance.now() - startTime;
      logger.info(`📋 Template cached: ${templateId} in ${cacheTime.toFixed(2)}ms`);
    } catch (error) {
      logger.error(`❌ Failed to cache template ${templateId}:`, error);
    }
  }

  /**
   * 📦 DEPENDENCY CACHE: Cache successful dependency installations
   */
  cacheDependencyInstall(packageJsonHash: string, nodeModulesPath: string): void {
    const cacheKey = `deps:${packageJsonHash}`;
    
    // Store metadata about successful installation
    const installData = {
      timestamp: Date.now(),
      nodeModulesExists: fs.existsSync(nodeModulesPath),
      packageCount: this.countPackages(nodeModulesPath)
    };
    
    this.set(cacheKey, installData, 7 * 24 * 60 * 60 * 1000); // 7 days TTL
    logger.info(`📦 Dependency install cached for hash: ${packageJsonHash}`);
  }

  /**
   * 🔥 METRO CACHE: Cache Metro bundler state
   */
  cacheMetroState(appId: number, metroData: any): void {
    const cacheKey = `metro:${appId}`;
    this.set(cacheKey, metroData, 2 * 60 * 60 * 1000); // 2 hours TTL
    logger.info(`🔥 Metro state cached for app ${appId}`);
  }

  /**
   * Get cached data
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }
    
    // Check if expired
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }
    
    this.stats.hits++;
    return entry.data as T;
  }

  /**
   * Set cached data
   */
  set(key: string, data: any, ttl: number): void {
    const size = this.estimateSize(data);
    
    // Check if adding this would exceed max size
    if (this.stats.totalSize + size > this.maxSize) {
      this.evictLRU();
    }
    
    const entry: CacheEntry = {
      key,
      data,
      timestamp: Date.now(),
      ttl,
      size
    };
    
    // Remove old entry if exists
    const oldEntry = this.cache.get(key);
    if (oldEntry) {
      this.stats.totalSize -= oldEntry.size || 0;
      this.stats.entries--;
    }
    
    this.cache.set(key, entry);
    this.stats.totalSize += size;
    this.stats.entries++;
  }

  /**
   * Check if dependency installation can be skipped
   */
  canSkipDependencyInstall(packageJsonPath: string, nodeModulesPath: string): boolean {
    if (!fs.existsSync(packageJsonPath) || !fs.existsSync(nodeModulesPath)) {
      return false;
    }
    
    const packageJsonHash = this.hashFile(packageJsonPath);
    const cached = this.get<any>(`deps:${packageJsonHash}`);
    
    if (cached && cached.nodeModulesExists) {
      logger.info(`📦 Skipping dependency install - using cached for hash: ${packageJsonHash}`);
      return true;
    }
    
    return false;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats & { hitRate: number } {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
    
    return {
      ...this.stats,
      hitRate: Math.round(hitRate * 100) / 100
    };
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, totalSize: 0, entries: 0 };
    logger.info('🧹 Cache cleared');
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(key);
        this.stats.totalSize -= entry.size || 0;
        this.stats.entries--;
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      logger.info(`🧹 Cleaned up ${cleaned} expired cache entries`);
    }
  }

  /**
   * Evict least recently used entries to make space
   */
  private evictLRU(): void {
    // Simple LRU: remove oldest entries until we have space
    const entries = Array.from(this.cache.entries()).sort((a, b) => a[1].timestamp - b[1].timestamp);
    const targetSize = this.maxSize * 0.8; // Evict to 80% of max size
    
    while (this.stats.totalSize > targetSize && entries.length > 0) {
      const [key, entry] = entries.shift()!;
      this.cache.delete(key);
      this.stats.totalSize -= entry.size || 0;
      this.stats.entries--;
    }
    
    logger.info(`🧹 Evicted LRU entries, cache size now: ${(this.stats.totalSize / 1024 / 1024).toFixed(2)}MB`);
  }

  /**
   * Read directory recursively for template caching
   */
  private async readDirectoryRecursive(dirPath: string): Promise<any> {
    const result: any = {};
    
    try {
      const items = await fs.promises.readdir(dirPath);
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stat = await fs.promises.stat(itemPath);
        
        if (stat.isDirectory()) {
          result[item] = await this.readDirectoryRecursive(itemPath);
        } else {
          result[item] = await fs.promises.readFile(itemPath, 'utf8');
        }
      }
    } catch (error) {
      logger.warn(`⚠️ Failed to read directory ${dirPath}:`, error);
    }
    
    return result;
  }

  /**
   * Count packages in node_modules
   */
  private countPackages(nodeModulesPath: string): number {
    try {
      if (!fs.existsSync(nodeModulesPath)) return 0;
      return fs.readdirSync(nodeModulesPath).length;
    } catch {
      return 0;
    }
  }

  /**
   * Create hash of file content
   */
  private hashFile(filePath: string): string {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return require('crypto').createHash('md5').update(content).digest('hex');
    } catch {
      return 'unknown';
    }
  }

  /**
   * Estimate size of data in bytes
   */
  private estimateSize(data: any): number {
    return JSON.stringify(data).length * 2; // Rough estimate
  }

  /**
   * Cleanup on shutdown
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

// Export singleton instance
export const smartCache = new SmartCacheManager();

// Cleanup on process exit
process.on('exit', () => {
  smartCache.destroy();
});

