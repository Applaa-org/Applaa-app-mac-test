/**
 * 🏢 WORKSPACE MANAGER
 * 
 * Inspired by @quests/workspace - Centralized workspace management
 * Single source of truth for all app states and resource allocation
 */

import { EventEmitter } from 'events';
import { AppType, AppState, AppPriority } from './types';
import { ResourceManager, getResourceManager } from './ResourceManager';
import { AppLifecycleManager, getAppLifecycleManager } from './AppLifecycleManager';
import { PerformanceMonitor } from './PerformanceMonitor';
import { SmartCacheManager } from './SmartCacheManager';

export interface AppInstance {
  id: string;
  templateId: string;
  appType: AppType;
  state: AppState;
  priority: AppPriority;
  resources: {
    memory: number;
    cpu: number;
    ports: number[];
  };
  metadata: {
    projectPath: string;
    port?: number;
    url?: string;
    lastAccessed: number;
    created: number;
  };
  performance: {
    loadTime: number;
    memoryPeak: number;
    cpuPeak: number;
    errorCount: number;
  };
}

export interface WorkspaceConfig {
  maxConcurrentApps: number;
  maxMemoryPerApp: number;
  maxCpuPerApp: number;
  suspendInactiveAfter: number;
  enablePredictiveLoading: boolean;
  enableResourceSharing: boolean;
}

export interface AppStatus {
  id: string;
  state: AppState;
  resources: {
    allocated: number;
    used: number;
    available: number;
  };
  performance: {
    healthScore: number;
    loadTime: number;
    errorRate: number;
  };
  lastAccessed: number;
}

/**
 * WorkspaceManager - Centralized workspace management inspired by Quests
 * 
 * Provides unified management of all app instances with intelligent
 * resource allocation, on-demand loading, and performance optimization.
 */
export class WorkspaceManager extends EventEmitter {
  private static instance: WorkspaceManager;
  
  private apps = new Map<string, AppInstance>();
  private activeApp: string | null = null;
  private suspendedApps = new Set<string>();
  private resourcePool: Map<string, any> = new Map();
  
  private config: WorkspaceConfig;
  private resourceManager: ResourceManager;
  private lifecycleManager: AppLifecycleManager;
  private performanceMonitor: PerformanceMonitor;
  private cacheManager: SmartCacheManager;
  
  private cleanupInterval: NodeJS.Timeout | null = null;
  private optimizationInterval: NodeJS.Timeout | null = null;
  
  constructor(config: Partial<WorkspaceConfig> = {}) {
    super();
    
    this.config = {
      maxConcurrentApps: 10,
      maxMemoryPerApp: 500, // MB
      maxCpuPerApp: 0.5,
      suspendInactiveAfter: 300000, // 5 minutes
      enablePredictiveLoading: true,
      enableResourceSharing: true,
      ...config
    };
    
    this.resourceManager = getResourceManager();
    this.lifecycleManager = getAppLifecycleManager();
    this.performanceMonitor = new PerformanceMonitor();
    this.cacheManager = new SmartCacheManager({
      maxSize: 100 * 1024 * 1024, // 100MB
      maxEntries: 50,
      ttl: 3600000, // 1 hour
      evictionPolicy: 'hybrid',
      preloadPopular: true,
      compressionEnabled: true,
      predictiveCaching: true,
      usageAnalytics: true,
      autoOptimization: true,
      persistentCache: true
    });
    
    this.initialize();
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(config?: Partial<WorkspaceConfig>): WorkspaceManager {
    if (!WorkspaceManager.instance) {
      WorkspaceManager.instance = new WorkspaceManager(config);
    }
    return WorkspaceManager.instance;
  }
  
  /**
   * Initialize the workspace manager
   */
  private async initialize(): Promise<void> {
    console.log('🏢 Initializing WorkspaceManager...');
    
    // Start monitoring intervals
    this.startCleanupInterval();
    this.startOptimizationInterval();
    
    // Initialize subsystems
    await this.resourceManager.initialize();
    await this.lifecycleManager.initialize();
    this.performanceMonitor.startMonitoring();
    await this.cacheManager.initialize();
    
    console.log('✅ WorkspaceManager initialized successfully');
    this.emit('workspace:initialized');
  }
  
  /**
   * Load an app template on-demand
   */
  public async loadApp(templateId: string, options?: {
    priority?: AppPriority;
    preload?: boolean;
    forceReload?: boolean;
  }): Promise<AppInstance> {
    console.log(`📱 Loading app template: ${templateId}`);
    
    // Check if app is already loaded
    const existingApp = this.apps.get(templateId);
    if (existingApp && !options?.forceReload) {
      console.log(`♻️ App ${templateId} already loaded, resuming...`);
      await this.resumeApp(templateId);
      return existingApp;
    }
    
    // Check resource availability
    const canAllocate = await this.canAllocateResources(templateId);
    if (!canAllocate) {
      // Try to free up resources by suspending inactive apps
      await this.optimizeResourceUsage();
      const canAllocateAfter = await this.canAllocateResources(templateId);
      if (!canAllocateAfter) {
        throw new Error(`Insufficient resources to load app ${templateId}`);
      }
    }
    
    // Create app instance
    const appInstance: AppInstance = {
      id: templateId,
      templateId,
      appType: await this.detectAppType(templateId),
      state: 'loading',
      priority: options?.priority || 'normal',
      resources: {
        memory: this.config.maxMemoryPerApp,
        cpu: this.config.maxCpuPerApp,
        ports: await this.allocatePorts(1)
      },
      metadata: {
        projectPath: `apps/${templateId}`,
        lastAccessed: Date.now(),
        created: Date.now()
      },
      performance: {
        loadTime: 0,
        memoryPeak: 0,
        cpuPeak: 0,
        errorCount: 0
      }
    };
    
    // Register with subsystems
    this.apps.set(templateId, appInstance);
    this.resourceManager.registerApp(parseInt(templateId), appInstance.priority);
    this.lifecycleManager.registerApp(parseInt(templateId), appInstance.metadata, appInstance.priority);
    
    // Start performance tracking
    this.performanceMonitor.trackAppStart(parseInt(templateId), appInstance.appType);
    
    // Load app resources
    await this.loadAppResources(appInstance);
    
    // Update state
    appInstance.state = 'active';
    this.activeApp = templateId;
    
    console.log(`✅ App ${templateId} loaded successfully`);
    this.emit('app:loaded', { appId: templateId, instance: appInstance });
    
    return appInstance;
  }
  
  /**
   * Unload an app and free its resources
   */
  public async unloadApp(templateId: string): Promise<void> {
    console.log(`🗑️ Unloading app: ${templateId}`);
    
    const app = this.apps.get(templateId);
    if (!app) {
      console.warn(`⚠️ App ${templateId} not found`);
      return;
    }
    
    // Stop performance tracking
    this.performanceMonitor.trackAppStop(parseInt(templateId));
    
    // Unregister from subsystems
    this.resourceManager.unregisterApp(parseInt(templateId));
    this.lifecycleManager.unregisterApp(parseInt(templateId));
    
    // Free resources
    await this.freeAppResources(app);
    
    // Remove from workspace
    this.apps.delete(templateId);
    this.suspendedApps.delete(templateId);
    
    if (this.activeApp === templateId) {
      this.activeApp = null;
    }
    
    console.log(`✅ App ${templateId} unloaded successfully`);
    this.emit('app:unloaded', { appId: templateId });
  }
  
  /**
   * Switch to a different app
   */
  public async switchApp(templateId: string): Promise<void> {
    console.log(`🔄 Switching to app: ${templateId}`);
    
    // Suspend current active app
    if (this.activeApp && this.activeApp !== templateId) {
      await this.suspendApp(this.activeApp);
    }
    
    // Load or resume target app
    const app = this.apps.get(templateId);
    if (!app) {
      await this.loadApp(templateId);
    } else {
      await this.resumeApp(templateId);
    }
    
    this.activeApp = templateId;
    this.emit('app:switched', { appId: templateId });
  }
  
  /**
   * Suspend an app to free resources
   */
  public async suspendApp(templateId: string): Promise<void> {
    const app = this.apps.get(templateId);
    if (!app || app.state === 'suspended') {
      return;
    }
    
    console.log(`⏸️ Suspending app: ${templateId}`);
    
    // Update state
    app.state = 'suspended';
    this.suspendedApps.add(templateId);
    
    // Free some resources but keep app in memory
    await this.partialFreeResources(app);
    
    // Update lifecycle
    this.lifecycleManager.transitionAppState(parseInt(templateId), 'suspended', 'Resource optimization');
    
    this.emit('app:suspended', { appId: templateId });
  }
  
  /**
   * Resume a suspended app
   */
  public async resumeApp(templateId: string): Promise<void> {
    const app = this.apps.get(templateId);
    if (!app || app.state !== 'suspended') {
      return;
    }
    
    console.log(`▶️ Resuming app: ${templateId}`);
    
    // Check resource availability
    const canResume = await this.canAllocateResources(templateId);
    if (!canResume) {
      await this.optimizeResourceUsage();
    }
    
    // Restore resources
    await this.restoreAppResources(app);
    
    // Update state
    app.state = 'active';
    app.metadata.lastAccessed = Date.now();
    this.suspendedApps.delete(templateId);
    
    // Update lifecycle
    this.lifecycleManager.transitionAppState(parseInt(templateId), 'active', 'User requested');
    
    this.emit('app:resumed', { appId: templateId });
  }
  
  /**
   * Get app status
   */
  public getAppStatus(templateId: string): AppStatus | null {
    const app = this.apps.get(templateId);
    if (!app) {
      return null;
    }
    
    return {
      id: templateId,
      state: app.state,
      resources: {
        allocated: app.resources.memory,
        used: app.performance.memoryPeak,
        available: this.config.maxMemoryPerApp - app.performance.memoryPeak
      },
      performance: {
        healthScore: this.calculateHealthScore(app),
        loadTime: app.performance.loadTime,
        errorRate: app.performance.errorCount / (Date.now() - app.metadata.created)
      },
      lastAccessed: app.metadata.lastAccessed
    };
  }
  
  /**
   * Get workspace status
   */
  public getWorkspaceStatus(): {
    totalApps: number;
    activeApps: number;
    suspendedApps: number;
    totalMemoryUsage: number;
    totalCpuUsage: number;
    healthScore: number;
  } {
    let activeApps = 0;
    let suspendedApps = 0;
    let totalMemoryUsage = 0;
    let totalCpuUsage = 0;
    let totalHealthScore = 0;
    
    for (const app of this.apps.values()) {
      if (app.state === 'active') {
        activeApps++;
      } else if (app.state === 'suspended') {
        suspendedApps++;
      }
      
      totalMemoryUsage += app.performance.memoryPeak;
      totalCpuUsage += app.performance.cpuPeak;
      totalHealthScore += this.calculateHealthScore(app);
    }
    
    return {
      totalApps: this.apps.size,
      activeApps,
      suspendedApps,
      totalMemoryUsage,
      totalCpuUsage,
      healthScore: this.apps.size > 0 ? totalHealthScore / this.apps.size : 100
    };
  }
  
  /**
   * Optimize resource usage across all apps
   */
  private async optimizeResourceUsage(): Promise<void> {
    console.log('🔧 Optimizing resource usage...');
    
    // Sort apps by last accessed time (oldest first)
    const appsByAccess = Array.from(this.apps.values())
      .sort((a, b) => a.metadata.lastAccessed - b.metadata.lastAccessed);
    
    // Suspend inactive apps
    const now = Date.now();
    for (const app of appsByAccess) {
      if (app.state === 'active' && 
          now - app.metadata.lastAccessed > this.config.suspendInactiveAfter) {
        await this.suspendApp(app.id);
      }
    }
    
    // Clean up unused resources
    await this.cleanupUnusedResources();
    
    console.log('✅ Resource optimization complete');
  }
  
  /**
   * Check if resources can be allocated for an app
   */
  private async canAllocateResources(templateId: string): Promise<boolean> {
    const currentUsage = this.getWorkspaceStatus();
    const requiredMemory = this.config.maxMemoryPerApp;
    const requiredCpu = this.config.maxCpuPerApp;
    
    // Check if we're within limits
    const wouldExceedMemory = currentUsage.totalMemoryUsage + requiredMemory > 
      (this.config.maxConcurrentApps * this.config.maxMemoryPerApp);
    const wouldExceedCpu = currentUsage.totalCpuUsage + requiredCpu > 
      (this.config.maxConcurrentApps * this.config.maxCpuPerApp);
    
    return !wouldExceedMemory && !wouldExceedCpu;
  }
  
  /**
   * Detect app type from template
   */
  private async detectAppType(templateId: string): Promise<AppType> {
    // This would typically analyze the template files
    // For now, return a default based on template ID
    if (templateId.includes('expo')) return 'expo';
    if (templateId.includes('react')) return 'react';
    if (templateId.includes('vue')) return 'vue';
    if (templateId.includes('flutter')) return 'flutter';
    return 'unknown';
  }
  
  /**
   * Allocate ports for an app
   */
  private async allocatePorts(count: number): Promise<number[]> {
    // Simple port allocation - in production, use proper port management
    const ports: number[] = [];
    let port = 3000;
    
    while (ports.length < count) {
      // Check if port is available (simplified)
      const isAvailable = !Array.from(this.apps.values())
        .some(app => app.resources.ports.includes(port));
      
      if (isAvailable) {
        ports.push(port);
      }
      port++;
    }
    
    return ports;
  }
  
  /**
   * Load app resources
   */
  private async loadAppResources(app: AppInstance): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Load from cache if available
      const cached = await this.cacheManager.get(app.templateId);
      if (cached) {
        console.log(`📦 Loaded ${app.templateId} from cache`);
        return;
      }
      
      // Load app resources (this would typically involve file system operations)
      // For now, simulate loading
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Cache the loaded resources
      await this.cacheManager.set(app.templateId, {
        templateId: app.templateId,
        resources: app.resources,
        metadata: app.metadata
      });
      
      app.performance.loadTime = Date.now() - startTime;
      
    } catch (error) {
      console.error(`❌ Failed to load resources for ${app.templateId}:`, error);
      throw error;
    }
  }
  
  /**
   * Free app resources
   */
  private async freeAppResources(app: AppInstance): Promise<void> {
    // Free ports
    app.resources.ports = [];
    
    // Clear from cache if not frequently used
    const usage = await this.cacheManager.getUsageStats(app.templateId);
    if (usage && usage.accessCount < 3) {
      await this.cacheManager.delete(app.templateId);
    }
  }
  
  /**
   * Partially free resources (for suspension)
   */
  private async partialFreeResources(app: AppInstance): Promise<void> {
    // Free some ports but keep one for quick resume
    if (app.resources.ports.length > 1) {
      app.resources.ports = [app.resources.ports[0]];
    }
  }
  
  /**
   * Restore app resources (for resume)
   */
  private async restoreAppResources(app: AppInstance): Promise<void> {
    // Restore full port allocation
    if (app.resources.ports.length === 0) {
      app.resources.ports = await this.allocatePorts(1);
    }
  }
  
  /**
   * Calculate health score for an app
   */
  private calculateHealthScore(app: AppInstance): number {
    let score = 100;
    
    // Deduct for errors
    score -= app.performance.errorCount * 10;
    
    // Deduct for high resource usage
    if (app.performance.memoryPeak > this.config.maxMemoryPerApp * 0.8) {
      score -= 20;
    }
    if (app.performance.cpuPeak > this.config.maxCpuPerApp * 0.8) {
      score -= 15;
    }
    
    // Deduct for slow load times
    if (app.performance.loadTime > 5000) {
      score -= 10;
    }
    
    return Math.max(0, Math.min(100, score));
  }
  
  /**
   * Clean up unused resources
   */
  private async cleanupUnusedResources(): Promise<void> {
    // Clean up old cache entries
    await this.cacheManager.cleanup();
    
    // Clean up resource pool
    for (const [key, resource] of this.resourcePool.entries()) {
      if (!this.apps.has(key)) {
        this.resourcePool.delete(key);
      }
    }
  }
  
  /**
   * Start cleanup interval
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.optimizeResourceUsage();
    }, 60000); // Every minute
  }
  
  /**
   * Start optimization interval
   */
  private startOptimizationInterval(): void {
    this.optimizationInterval = setInterval(() => {
      this.optimizeResourceUsage();
    }, 300000); // Every 5 minutes
  }
  
  /**
   * Shutdown the workspace manager
   */
  public async shutdown(): Promise<void> {
    console.log('🔄 Shutting down WorkspaceManager...');
    
    // Clear intervals
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval);
      this.optimizationInterval = null;
    }
    
    // Unload all apps
    for (const appId of this.apps.keys()) {
      await this.unloadApp(appId);
    }
    
    // Shutdown subsystems
    await this.performanceMonitor.shutdown();
    await this.cacheManager.shutdown();
    
    console.log('✅ WorkspaceManager shutdown complete');
  }
}

/**
 * Get singleton workspace manager instance
 */
export function getWorkspaceManager(config?: Partial<WorkspaceConfig>): WorkspaceManager {
  return WorkspaceManager.getInstance(config);
}


