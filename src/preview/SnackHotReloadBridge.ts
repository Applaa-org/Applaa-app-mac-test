/**
 * 🔥 Snack Hot Reload Bridge
 * Watches app files and triggers automatic preview updates
 * 
 * Features:
 * - File system watching with chokidar
 * - Smart debouncing to prevent excessive reloads
 * - Selective file watching (only relevant extensions)
 * - Event emission for UI updates
 */

import { EventEmitter } from 'events';
import chokidar, { FSWatcher } from 'chokidar';
import log from 'electron-log';
import path from 'path';

export interface HotReloadEvent {
  appId: number;
  filePath: string;
  changeType: 'change' | 'add' | 'unlink';
  timestamp: number;
}

export interface HotReloadOptions {
  debounceMs?: number;
  ignorePatterns?: string[];
  watchedExtensions?: string[];
}

const DEFAULT_OPTIONS: Required<HotReloadOptions> = {
  debounceMs: 300,
  ignorePatterns: [
    '**/node_modules/**',
    '**/.git/**',
    '**/ios/**',
    '**/android/**',
    '**/.expo/**',
    '**/dist/**',
    '**/build/**',
    '**/.next/**',
    '**/out/**',
    '**/.cache/**'
  ],
  watchedExtensions: [
    '.js',
    '.jsx',
    '.ts',
    '.tsx',
    '.json',
    '.css',
    '.scss',
    '.sass',
    '.less',
    '.html'
  ]
};

export class SnackHotReloadBridge extends EventEmitter {
  private static instance: SnackHotReloadBridge;
  private watchers = new Map<number, FSWatcher>();
  private debounceTimers = new Map<string, NodeJS.Timeout>();
  private lastReloadTime = new Map<number, number>();
  private options: Required<HotReloadOptions>;
  
  private constructor(options: HotReloadOptions = {}) {
    super();
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }
  
  /**
   * Get singleton instance
   */
  static getInstance(options?: HotReloadOptions): SnackHotReloadBridge {
    if (!SnackHotReloadBridge.instance) {
      SnackHotReloadBridge.instance = new SnackHotReloadBridge(options);
    }
    return SnackHotReloadBridge.instance;
  }
  
  /**
   * Start watching an app directory for file changes
   */
  startWatching(appId: number, appPath: string): void {
    // Stop existing watcher if any
    this.stopWatching(appId);
    
    log.info(`🔥 Starting hot reload watcher for app ${appId} at ${appPath}`);
    
    const watcher = chokidar.watch(appPath, {
      ignored: this.options.ignorePatterns,
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: this.options.debounceMs,
        pollInterval: 100
      },
      // Performance optimizations
      usePolling: false,
      atomic: true,
      alwaysStat: false
    });
    
    // File changed
    watcher.on('change', (filePath: string) => {
      this.handleFileChange(appId, filePath, 'change');
    });
    
    // File added
    watcher.on('add', (filePath: string) => {
      this.handleFileChange(appId, filePath, 'add');
    });
    
    // File deleted
    watcher.on('unlink', (filePath: string) => {
      this.handleFileChange(appId, filePath, 'unlink');
    });
    
    // Watch errors
    watcher.on('error', (error: Error) => {
      log.error(`File watcher error for app ${appId}:`, error);
      this.emit('error', { appId, error });
    });
    
    // Watcher ready
    watcher.on('ready', () => {
      log.info(`✅ Hot reload watcher ready for app ${appId}`);
      this.emit('ready', { appId });
    });
    
    this.watchers.set(appId, watcher);
  }
  
  /**
   * Handle file change with debouncing and filtering
   */
  private handleFileChange(
    appId: number,
    filePath: string,
    changeType: 'change' | 'add' | 'unlink'
  ): void {
    const fileExt = path.extname(filePath).toLowerCase();
    
    // Only watch relevant file types
    if (!this.options.watchedExtensions.includes(fileExt)) {
      log.debug(`⏭️ Skipping file change (unwatched extension): ${filePath}`);
      return;
    }
    
    log.debug(`📝 File ${changeType}: ${filePath}`);
    
    // Create debounce key
    const debounceKey = `${appId}:${filePath}`;
    
    // Clear existing timer
    const existingTimer = this.debounceTimers.get(debounceKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    
    // Set new timer
    const timer = setTimeout(() => {
      this.triggerHotReload(appId, filePath, changeType);
      this.debounceTimers.delete(debounceKey);
    }, this.options.debounceMs);
    
    this.debounceTimers.set(debounceKey, timer);
  }
  
  /**
   * Trigger hot reload for an app
   */
  private async triggerHotReload(
    appId: number,
    filePath: string,
    changeType: 'change' | 'add' | 'unlink'
  ): Promise<void> {
    const now = Date.now();
    const lastReload = this.lastReloadTime.get(appId) || 0;
    
    // Prevent too frequent reloads (min 500ms between)
    if (now - lastReload < 500) {
      log.debug(`⏳ Skipping reload for app ${appId} - too soon (last: ${now - lastReload}ms ago)`);
      return;
    }
    
    this.lastReloadTime.set(appId, now);
    
    const event: HotReloadEvent = {
      appId,
      filePath,
      changeType,
      timestamp: now
    };
    
    log.info(`🔥 Triggering hot reload for app ${appId}: ${path.basename(filePath)}`);
    
    // Emit event for listeners (IPC handlers, UI components, etc.)
    this.emit('hot-reload', event);
    
    // Try to notify Metro bundler if it's running
    await this.notifyMetroBundler(appId);
  }
  
  /**
   * Notify Metro bundler of file changes
   * Metro has a built-in endpoint for triggering reloads
   */
  private async notifyMetroBundler(appId: number): Promise<void> {
    try {
      // Metro typically runs on port 8081
      const metroUrl = 'http://localhost:8081';
      
      // Try to hit Metro's reload endpoint
      const response = await fetch(`${metroUrl}/reload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        log.debug(`✅ Metro bundler notified for app ${appId}`);
      } else {
        log.debug(`⚠️ Metro reload request returned: ${response.status}`);
      }
    } catch (error) {
      // Metro might not be running, that's okay
      log.debug(`Metro notification failed (this is normal if Metro isn't running):`, error);
    }
  }
  
  /**
   * Stop watching an app
   */
  stopWatching(appId: number): void {
    const watcher = this.watchers.get(appId);
    if (watcher) {
      log.info(`🛑 Stopping hot reload watcher for app ${appId}`);
      watcher.close();
      this.watchers.delete(appId);
      this.lastReloadTime.delete(appId);
      
      // Clear any pending debounce timers
      for (const [key, timer] of this.debounceTimers.entries()) {
        if (key.startsWith(`${appId}:`)) {
          clearTimeout(timer);
          this.debounceTimers.delete(key);
        }
      }
      
      this.emit('stopped', { appId });
    }
  }
  
  /**
   * Check if watching an app
   */
  isWatching(appId: number): boolean {
    return this.watchers.has(appId);
  }
  
  /**
   * Get list of watched app IDs
   */
  getWatchedApps(): number[] {
    return Array.from(this.watchers.keys());
  }
  
  /**
   * Stop all watchers
   */
  stopAll(): void {
    log.info('🛑 Stopping all hot reload watchers');
    const appIds = Array.from(this.watchers.keys());
    for (const appId of appIds) {
      this.stopWatching(appId);
    }
  }
  
  /**
   * Update options for a specific watcher
   */
  updateOptions(options: Partial<HotReloadOptions>): void {
    this.options = { ...this.options, ...options };
    log.info('⚙️ Hot reload options updated:', options);
  }
  
  /**
   * Get current options
   */
  getOptions(): Required<HotReloadOptions> {
    return { ...this.options };
  }
  
  /**
   * Manual trigger (for testing or forced reloads)
   */
  manualTrigger(appId: number, reason: string = 'Manual trigger'): void {
    log.info(`🔄 Manual hot reload trigger for app ${appId}: ${reason}`);
    
    const event: HotReloadEvent = {
      appId,
      filePath: reason,
      changeType: 'change',
      timestamp: Date.now()
    };
    
    this.emit('hot-reload', event);
    this.notifyMetroBundler(appId);
  }
}

// Export singleton instance getter
export const getHotReloadBridge = (options?: HotReloadOptions) => 
  SnackHotReloadBridge.getInstance(options);

