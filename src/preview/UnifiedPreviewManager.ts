/**
 * 🚀 UNIFIED PREVIEW MANAGER
 * 
 * Inspired by @quests/workspace architecture
 * Central manager for all preview operations with:
 * - On-demand app loading
 * - Resource pooling and management
 * - Performance monitoring
 * - Smart caching and suspension
 */

import { EventEmitter } from 'events';
import log from 'electron-log';
import {
  PreviewState,
  PreviewManagerConfig,
  PreviewEvent,
  PreviewEventCallback,
  PreviewStateCallback,
  PreviewErrorCallback,
  PreviewPhase,
  PreviewResource,
  PreviewConnection,
  PreviewError,
  ResourceExhaustionError,
  PortAllocationError,
  DEFAULT_PREVIEW_CONFIG,
  APP_TYPE_CONFIGS,
  StartPreviewRequest,
  StartPreviewResponse,
  StopPreviewRequest,
  StopPreviewResponse,
  GetPreviewStateResponse,
  ListActivePreviewsResponse,
} from './types';
import { AppType, AppState, AppPriority } from './types-simple';
import { PreviewControlPlane } from './PreviewControlPlane';
import { SmartCacheManager } from './SmartCacheManager';
import { TemplateCacheManager } from './TemplateCacheManager';
import { ResourceManager, getResourceManager } from './ResourceManager';
import { PerformanceMonitor } from './PerformanceMonitor';
import { AppLifecycleManager, getAppLifecycleManager } from './AppLifecycleManager';
import { WorkspaceManager, getWorkspaceManager } from './WorkspaceManager';
import { ResourcePoolManager, getResourcePoolManager } from './ResourcePoolManager';
import { AppControlPlane, getAppControlPlane } from './AppControlPlane';

const logger = log.scope('unified-preview-manager');

/**
 * UnifiedPreviewManager - Central orchestrator for all preview operations
 * 
 * Key features:
 * 1. Single point of control for all app types (Expo, React, Vue, etc.)
 * 2. On-demand loading with intelligent resource management
 * 3. Smart suspension and resumption of inactive apps
 * 4. Performance monitoring and optimization
 * 5. Event-driven architecture for real-time updates
 */
export class UnifiedPreviewManager extends EventEmitter {
  private static instance: UnifiedPreviewManager | null = null;
  
  private config: PreviewManagerConfig;
  private controlPlane: PreviewControlPlane;
  private cacheManager: SmartCacheManager;
  private templateCache: TemplateCacheManager;
  private resourceManager: ResourceManager;
  private performanceMonitor: PerformanceMonitor;
  private lifecycleManager: AppLifecycleManager;
  
  // New Quest-inspired components
  private workspaceManager: WorkspaceManager;
  private resourcePoolManager: ResourcePoolManager;
  private appControlPlane: AppControlPlane;
  
  private activeStates = new Map<number, PreviewState>();
  private suspendedStates = new Map<number, PreviewState>();
  private lazyLoadQueue = new Map<number, Promise<any>>(); // Lazy loading queue
  private cleanupInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;

  private constructor(config: Partial<PreviewManagerConfig> = {}) {
    super();
    this.config = { ...DEFAULT_PREVIEW_CONFIG, ...config };
    
    // Initialize subsystems
    this.controlPlane = new PreviewControlPlane(this.config);
    this.cacheManager = new SmartCacheManager();
    this.templateCache = new TemplateCacheManager({
      maxSize: 100 * 1024 * 1024, // 100MB
      maxEntries: 50,
      ttl: 30 * 60 * 1000, // 30 minutes
      evictionPolicy: 'hybrid',
      preloadPopular: true,
      compressionEnabled: true
    });
    this.resourceManager = getResourceManager();
    this.performanceMonitor = new PerformanceMonitor(this.config);
    this.lifecycleManager = getAppLifecycleManager({
      suspensionTimeout: this.config.suspendInactiveAfter || 5 * 60 * 1000,
      cleanupInterval: 30 * 1000,
      maxSuspendedApps: this.config.maxConcurrentApps || 10,
      maxHistoryEntries: 100,
      enableAutoSuspension: true,
      enableStateRestoration: true
    });
    
    // Initialize Quest-inspired components
    this.workspaceManager = getWorkspaceManager({
      maxConcurrentApps: this.config.maxConcurrentApps || 10,
      maxMemoryPerApp: 500,
      maxCpuPerApp: 0.5,
      suspendInactiveAfter: this.config.suspendInactiveAfter || 5 * 60 * 1000,
      enablePredictiveLoading: true,
      enableResourceSharing: true
    });
    
    this.resourcePoolManager = getResourcePoolManager({
      maxMemory: 8192,
      maxCpu: 8,
      maxPorts: 1000,
      maxDisk: 102400,
      maxNetwork: 1000,
      allocationTimeout: 300000,
      enableOvercommit: true,
      overcommitRatio: 1.5
    });
    
    this.appControlPlane = getAppControlPlane({
      enableMetrics: true,
      enableCommands: true,
      enableHealthCheck: true,
      metricsInterval: 5000,
      healthCheckInterval: 30000,
      commandTimeout: 10000
    });
    
    this.setupEventHandlers();
    logger.info('🚀 UnifiedPreviewManager initialized with lifecycle management');
  }

  /**
   * Get singleton instance
   */
  public static getInstance(config?: Partial<PreviewManagerConfig>): UnifiedPreviewManager {
    if (!UnifiedPreviewManager.instance) {
      UnifiedPreviewManager.instance = new UnifiedPreviewManager(config);
    }
    return UnifiedPreviewManager.instance;
  }

  /**
   * Get performance monitor instance
   */
  public getPerformanceMonitor(): PerformanceMonitor {
    return this.performanceMonitor;
  }

  /**
   * Get cache manager instance
   */
  public getCacheManager(): SmartCacheManager {
    return this.cacheManager;
  }

  /**
   * Get resource manager instance
   */
  public getResourceManager(): ResourceManager {
    return this.resourceManager;
  }

  /**
   * Get lifecycle manager instance
   */
  public getLifecycleManager(): AppLifecycleManager {
    return this.lifecycleManager;
  }

  /**
   * Get workspace manager instance
   */
  public getWorkspaceManager(): WorkspaceManager {
    return this.workspaceManager;
  }

  /**
   * Get resource pool manager instance
   */
  public getResourcePoolManager(): ResourcePoolManager {
    return this.resourcePoolManager;
  }

  /**
   * Get app control plane instance
   */
  public getAppControlPlane(): AppControlPlane {
    return this.appControlPlane;
  }

  /**
   * Initialize the preview manager
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      logger.info('🔧 Initializing UnifiedPreviewManager...');
      
      // Initialize subsystems
      await this.controlPlane.initialize();
      await this.cacheManager.initialize();
      await this.resourceManager.initialize();
      // Start performance monitoring
      this.performanceMonitor.startMonitoring();
      await this.lifecycleManager.initialize();
      
      // Start cleanup interval
      this.startCleanupInterval();
      
      // Preload popular templates
    await this.templateCache.preloadPopularTemplates();
      
      this.isInitialized = true;
      logger.info('✅ UnifiedPreviewManager initialized successfully');
      
      this.emit('manager:initialized');
    } catch (error) {
      logger.error('❌ Failed to initialize UnifiedPreviewManager:', error);
      throw error;
    }
  }

  /**
   * Start preview for an app with intelligent resource management
   */
  public async startPreview(request: StartPreviewRequest): Promise<StartPreviewResponse> {
    const { appId, appType, options = {} } = request;
    
    try {
      logger.info(`🚀 Starting preview for app ${appId} (type: ${appType})`);
      
      // Register app with lifecycle manager
      this.lifecycleManager.registerApp(appId, {
        type: appType || 'react',
        projectPath: options.projectPath || '',
        port: options.port,
        url: options.url
      }, 'normal');
      
      // Register with resource manager
      await this.resourceManager.registerApp(appId.toString(), {
        type: appType || 'react',
        priority: 'normal',
        estimatedMemory: APP_TYPE_CONFIGS[appType || 'react']?.estimatedMemory || 512,
        estimatedCpu: APP_TYPE_CONFIGS[appType || 'react']?.estimatedCpu || 50
      });
      
      // Check if already running
      if (this.activeStates.has(appId)) {
        if (!options.forceRestart) {
          const existingState = this.activeStates.get(appId)!;
          await this.lifecycleManager.transitionAppState(appId, 'running', 'App already active');
          logger.info(`📱 App ${appId} already running, returning existing state`);
          return { success: true, state: existingState };
        }
        
        // Force restart - stop existing first
        await this.stopPreview({ appId });
      }
      
      // Check if suspended - resume if possible
      if (this.suspendedStates.has(appId)) {
        logger.info(`🔄 Resuming suspended app ${appId}`);
        return await this.resumePreview(appId);
      }
      
      // Check for lazy loading opportunity
      if (this.lazyLoadQueue.has(appId)) {
        logger.info(`⏳ App ${appId} already in lazy load queue, waiting...`);
        const existingPromise = this.lazyLoadQueue.get(appId)!;
        const result = await existingPromise;
        return result;
      }
      
      // Detect app type if not provided
      const detectedAppType = appType || await this.detectAppType(appId);
      const appConfig = APP_TYPE_CONFIGS[detectedAppType];
      
      // Check template cache for faster loading
      const templateKey = `${detectedAppType}-default`;
      const cachedTemplate = await this.templateCache.getCachedTemplate(templateKey);
      
      // Smart resource allocation with lifecycle manager integration
      const canAllocate = await this.smartResourceAllocation(appId, detectedAppType);
      if (!canAllocate) {
        throw new ResourceExhaustionError(appId, 'memory/cpu');
      }
      
      // Initialize preview state with enhanced metadata
      const state = this.createPreviewState(appId, detectedAppType, appConfig);
      state.phase = 'initializing';
      state.userMessage = cachedTemplate ? 'Loading from cache...' : 'Initializing preview...';
      state.technicalDetails = `Starting ${detectedAppType} preview${cachedTemplate ? ' (cached)' : ''}`;
      state.metrics.cacheHit = !!cachedTemplate;
      state.estimatedTimeRemaining = cachedTemplate ? appConfig.estimatedStartTime * 0.3 : appConfig.estimatedStartTime;
      
      this.activeStates.set(appId, state);
      await this.lifecycleManager.transitionAppState(appId, 'loading', 'Starting preview');
      
      // Start performance monitoring
      this.performanceMonitor.trackAppStart(appId, detectedAppType);
      
      // Create lazy loading promise
      const lazyLoadPromise = this.lazyLoadApp(appId, detectedAppType, options, cachedTemplate);
      this.lazyLoadQueue.set(appId, lazyLoadPromise);
      
      // Execute lazy loading
      const result = await lazyLoadPromise;
      this.lazyLoadQueue.delete(appId);
      
      return result;
      
      // Emit event
      this.emitPreviewEvent('preview:start', appId, { appType: detectedAppType });
      
      return { success: true, state };
      
    } catch (error) {
      logger.error(`❌ Failed to start preview for app ${appId}:`, error);
      
      // Update state with error
      const state = this.activeStates.get(appId);
      if (state) {
        state.phase = 'error';
        state.userMessage = `Failed to start preview: ${error.message}`;
        state.technicalDetails = error.stack || error.message;
        state.metrics.errorCount++;
        state.metrics.lastError = error.message;
      }
      
      this.emitPreviewEvent('preview:error', appId, { error: error.message });
      
      return { success: false, error: error.message };
    }
  }

  /**
   * Stop preview for an app
   */
  public async stopPreview(request: StopPreviewRequest): Promise<StopPreviewResponse> {
    const { appId, options = {} } = request;
    
    try {
      logger.info(`🛑 Stopping preview for app ${appId}`);
      
      const state = this.activeStates.get(appId) || this.suspendedStates.get(appId);
      if (!state) {
        logger.warn(`⚠️ No preview state found for app ${appId}`);
        return { success: true };
      }
      
      if (options.suspend && this.activeStates.has(appId)) {
        // Suspend instead of stopping
        return await this.suspendPreview(appId);
      }
      
      // Stop via control plane
      await this.controlPlane.stopApp(appId, options.cleanup);
      
      // Update lifecycle state
      await this.lifecycleManager.transitionAppState(appId, 'terminated', 'Preview stopped');
      
      // Clean up state
      this.activeStates.delete(appId);
      this.suspendedStates.delete(appId);
      
      // Stop performance monitoring
      this.performanceMonitor.trackAppStop(appId);
      
      // Free resources
      await this.resourceManager.unregisterApp(appId.toString());
      
      // Unregister from lifecycle manager
      this.lifecycleManager.unregisterApp(appId);
      
      this.emitPreviewEvent('preview:stop', appId);
      
      return { success: true };
      
    } catch (error) {
      logger.error(`❌ Failed to stop preview for app ${appId}:`, error);
      await this.lifecycleManager.transitionAppState(appId, 'error', `Stop failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get current preview state
   */
  public getPreviewState(appId: number): GetPreviewStateResponse {
    const state = this.activeStates.get(appId) || this.suspendedStates.get(appId);
    
    if (!state) {
      return { success: false, error: 'Preview not found' };
    }
    
    // Record activity when state is accessed
    this.lifecycleManager.markAppAccessed(appId);
    
    return { success: true, state };
  }

  /**
   * List all active previews
   */
  public listActivePreviews(): ListActivePreviewsResponse {
    const previews = Array.from(this.activeStates.values());
    const systemMetrics = this.controlPlane.getSystemMetrics();
    
    return {
      success: true,
      previews,
      systemMetrics,
    };
  }

  /**
   * Update preview state (called by control plane)
   */
  public updatePreviewState(appId: number, updates: Partial<PreviewState>): void {
    const state = this.activeStates.get(appId);
    if (!state) {
      logger.warn(`⚠️ Attempted to update non-existent preview state for app ${appId}`);
      return;
    }
    
    // Apply updates
    Object.assign(state, updates);
    
    // Emit state change event
    this.emit('state:changed', appId, state);
    
    // Emit specific phase events
    if (updates.phase) {
      this.emitPreviewEvent(`preview:${updates.phase}` as any, appId, { phase: updates.phase });
    }
  }



  /**
   * Suspend an inactive preview to free resources
   */
  private async suspendPreview(appId: number): Promise<StopPreviewResponse> {
    try {
      const state = this.activeStates.get(appId);
      if (!state) {
        return { success: false, error: 'Preview not found' };
      }
      
      logger.info(`😴 Suspending preview for app ${appId}`);
      
      // Update lifecycle state
      this.lifecycleManager.transitionState(appId.toString(), AppState.SUSPENDED);
      
      // Update state
      state.phase = 'suspended';
      state.userMessage = 'Preview suspended to save resources';
      
      // Move to suspended map
      this.suspendedStates.set(appId, state);
      this.activeStates.delete(appId);
      
      // Suspend via control plane
      await this.controlPlane.suspendApp(appId);
      
      this.emitPreviewEvent('preview:suspend', appId);
      
      return { success: true };
      
    } catch (error) {
      logger.error(`❌ Failed to suspend preview for app ${appId}:`, error);
      await this.lifecycleManager.transitionAppState(appId, 'error', `Resume failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Resume a suspended preview
   */
  private async resumePreview(appId: number): Promise<StartPreviewResponse> {
    try {
      const state = this.suspendedStates.get(appId);
      if (!state) {
        return { success: false, error: 'Suspended preview not found' };
      }
      
      logger.info(`🔄 Resuming preview for app ${appId}`);
      
      // Check resource availability
      const canAllocate = await this.resourceManager.canAllocateResources(appId, state.appType);
      if (!canAllocate) {
        await this.freeResourcesForNewApp();
        if (!await this.resourceManager.canAllocateResources(appId, state.appType)) {
          throw new ResourceExhaustionError(appId, 'memory/cpu');
        }
      }
      
      // Update state
      state.phase = 'warming';
      state.userMessage = 'Resuming preview...';
      
      // Move back to active map
      this.activeStates.set(appId, state);
      this.suspendedStates.delete(appId);
      
      // Resume via control plane
      await this.controlPlane.resumeApp(appId);
      
      // Update lifecycle state
      await this.lifecycleManager.transitionAppState(appId, 'running', 'Preview resumed');
      this.lifecycleManager.markAppAccessed(appId);
      
      this.emitPreviewEvent('preview:resume', appId);
      
      return { success: true, state };
      
    } catch (error) {
      logger.error(`❌ Failed to resume preview for app ${appId}:`, error);
      this.lifecycleManager.updateAppState(appId, AppState.ERROR);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get template cache statistics
   */
  public getTemplateCacheStats() {
    return this.templateCache.getStats();
  }

  /**
   * Get popular templates
   */
  public getPopularTemplates(limit?: number) {
    return this.templateCache.getPopularTemplates(limit);
  }

  /**
   * Invalidate template cache
   */
  public invalidateTemplateCache(appType?: AppType, version?: string): number {
    return this.templateCache.invalidateTemplates(appType, version);
  }

  /**
   * Smart resource allocation with lifecycle manager integration
   */
  private async smartResourceAllocation(appId: number, appType: AppType): Promise<boolean> {
    // Check basic resource availability
    const canStart = await this.resourceManager.canStartApp(appId.toString());
    if (canStart) {
      return true;
    }
    
    logger.info('🧠 Smart resource allocation: freeing resources for new app');
    
    // Get suspension candidates from lifecycle manager
    const appsForSuspension = this.lifecycleManager.getAppsForSuspension();
    
    // Suspend apps based on lifecycle manager recommendations
    for (const candidateId of appsForSuspension.slice(0, 3)) { // Suspend up to 3 apps
      if (this.activeStates.has(candidateId)) {
        await this.suspendPreview(candidateId);
        
        // Check if we now have enough resources
        if (await this.resourceManager.canAllocateResources(appId.toString(), appType)) {
          return true;
        }
      }
    }
    
    // If still not enough resources, try legacy LRU approach
    await this.freeResourcesForNewApp();
    
    return await this.resourceManager.canAllocateResources(appId.toString(), appType);
  }
  
  /**
   * Lazy loading implementation for apps
   */
  private async lazyLoadApp(
    appId: number, 
    appType: AppType, 
    options: any, 
    cachedTemplate?: any
  ): Promise<StartPreviewResponse> {
    const startTime = Date.now();
    
    try {
      // Use cached template if available
      if (cachedTemplate) {
        logger.info(`⚡ Fast loading app ${appId} from template cache`);
        // Apply cached template optimizations
        options = { ...options, ...cachedTemplate.metadata.optimizations };
      }
      
      // Delegate to control plane for actual startup
      await this.controlPlane.startApp(appId, appType, options);
      
      // Update lifecycle state
      await this.lifecycleManager.transitionAppState(appId, 'running', 'App started successfully');
      
      // Cache template for future use
      if (!cachedTemplate) {
        await this.templateCache.cacheTemplate(appType, options, {
          buildTime: Date.now() - startTime,
          optimizations: {
            precompiled: true,
            hotReload: true
          }
        });
      }
      
      const state = this.activeStates.get(appId)!;
      this.emitPreviewEvent('preview:start', appId, { appType });
      
      return { success: true, state };
      
    } catch (error) {
      await this.lifecycleManager.transitionAppState(appId, 'error', `App start failed: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Free resources by suspending least recently used apps (legacy fallback)
   */
  private async freeResourcesForNewApp(): Promise<void> {
    logger.info('🧹 Freeing resources by suspending inactive apps (legacy LRU)');
    
    const sortedApps = Array.from(this.activeStates.entries())
      .sort(([, a], [, b]) => {
        const aLastAccess = a.resource?.lastAccessed || 0;
        const bLastAccess = b.resource?.lastAccessed || 0;
        return aLastAccess - bLastAccess; // Oldest first
      });
    
    // Suspend the oldest 25% of apps
    const appsToSuspend = sortedApps.slice(0, Math.ceil(sortedApps.length * 0.25));
    
    for (const [appId] of appsToSuspend) {
      await this.suspendPreview(appId);
    }
  }

  /**
   * Detect app type based on project files
   */
  private async detectAppType(appId: number): Promise<AppType> {
    // This would typically check the app's files to determine type
    // For now, return a default - this should be implemented based on your app detection logic
    return 'react';
  }

  /**
   * Create a new preview state for an app
   */
  private createPreviewState(appId: number, appType: AppType, appConfig: any): PreviewState {
    const now = Date.now();
    return {
      appId,
      appType,
      phase: 'idle',
      progress: 0,
      userMessage: 'Initializing preview...',
      motivationalMessage: 'Getting ready to show your app! 🚀',
      technicalDetails: 'Setting up preview environment',
      dependenciesReady: false,
      buildReady: false,
      serverReady: false,
      connections: [],
      metrics: {
        startTime: now,
        errorCount: 0,
        performanceScore: 0,
        cacheHit: false
      },
      estimatedTimeRemaining: appConfig?.estimatedStartTime || 10000
    };
  }

  /**
   * Setup event handlers for subsystems
   */
  private setupEventHandlers(): void {
    // Control plane events
    this.controlPlane.on('app:ready', (appId: number, connections: PreviewConnection[]) => {
      this.updatePreviewState(appId, {
        phase: 'ready',
        progress: 100,
        userMessage: 'Preview ready!',
        serverReady: true,
        connections,
        primaryConnection: connections.find(c => c.isActive) || connections[0],
      });
    });
    
    this.controlPlane.on('app:error', (appId: number, error: Error) => {
      this.updatePreviewState(appId, {
        phase: 'error',
        userMessage: `Error: ${error.message}`,
        technicalDetails: error.stack || error.message,
      });
    });
    
    this.controlPlane.on('app:progress', (appId: number, progress: number, message: string) => {
      this.updatePreviewState(appId, {
        progress,
        userMessage: message,
      });
    });
    
    // Performance monitoring events
    this.performanceMonitor.on('performance:warning', (appId: number, metric: string, value: number) => {
      logger.warn(`⚠️ Performance warning for app ${appId}: ${metric} = ${value}`);
    });
  }

  /**
   * Start cleanup interval for resource management
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Perform periodic cleanup
   */
  private async performCleanup(): Promise<void> {
    try {
      // Clean up expired cache entries
      await this.cacheManager.cleanup();
      await this.templateCache.cleanup();
      
      // Check for apps that should be suspended using lifecycle manager
      const appsForSuspension = this.lifecycleManager.getAppsForSuspension();
      for (const appId of appsForSuspension) {
        if (this.activeStates.has(appId)) {
          logger.info(`😴 Auto-suspending inactive app ${appId}`);
          await this.suspendPreview(appId);
        }
      }
      
      // Emit cleanup event
      this.emitPreviewEvent('system:cleanup', 0);
      
    } catch (error) {
      logger.error('❌ Cleanup error:', error);
    }
  }

  /**
   * Emit a preview event
   */
  private emitPreviewEvent(type: PreviewEvent['type'], appId: number, data?: any): void {
    const event: PreviewEvent = {
      type,
      appId,
      timestamp: Date.now(),
      data,
    };
    
    this.emit('preview:event', event);
    this.emit(type, appId, data);
  }

  /**
   * Register event callbacks
   */
  public onPreviewEvent(callback: PreviewEventCallback): void {
    this.on('preview:event', callback);
  }

  public onStateChange(callback: PreviewStateCallback): void {
    this.on('state:changed', callback);
  }

  public onError(callback: PreviewErrorCallback): void {
    this.on('preview:error', callback);
  }

  /**
   * Start app (alias for startPreview)
   */
  public async startApp(request: StartPreviewRequest): Promise<StartPreviewResponse> {
    return this.startPreview(request);
  }

  /**
   * Stop app (alias for stopPreview)
   */
  public async stopApp(appId: number): Promise<StopPreviewResponse> {
    return this.stopPreview({ appId });
  }

  /**
   * Get app state
   */
  public getAppState(appId: number): PreviewState | null {
    return this.activeStates.get(appId) || this.suspendedStates.get(appId) || null;
  }

  /**
   * Get active apps
   */
  public getActiveApps(): PreviewState[] {
    return Array.from(this.activeStates.values());
  }

  /**
   * Pre-warm app (for intelligent preview)
   */
  public async preWarmApp(request: { type: AppType; projectPath: string }): Promise<void> {
    logger.info(`🔥 Pre-warming app: ${request.type} at ${request.projectPath}`);
    // Pre-load templates and cache resources
    await this.templateCache.preloadTemplates(request.type);
  }

  /**
   * Get preview state (alias for getAppState)
   */
  public getPreviewState(appId: number): GetPreviewStateResponse {
    const state = this.getAppState(appId);
    return {
      success: !!state,
      state: state || undefined,
    };
  }

  /**
   * Get system metrics
   */
  public getSystemMetrics() {
    return this.controlPlane.getSystemMetrics();
  }

  /**
   * Invalidate template cache
   */
  public async invalidateTemplateCache(appType?: AppType, version?: string): Promise<number> {
    return this.templateCache.invalidateCache(appType, version);
  }

  /**
   * Cleanup and shutdown
   */
  public async shutdown(): Promise<void> {
    logger.info('🔄 Shutting down UnifiedPreviewManager...');
    
    // Stop cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    // Stop all active previews
    const stopPromises = Array.from(this.activeStates.keys()).map(appId => 
      this.stopPreview({ appId })
    );
    await Promise.all(stopPromises);
    
    // Shutdown subsystems
    await this.controlPlane.shutdown();
    await this.cacheManager.shutdown();
    await this.templateCache.shutdown();
    await this.resourceManager.shutdown();
    await this.performanceMonitor.shutdown();
    await this.lifecycleManager.shutdown();
    
    this.isInitialized = false;
    logger.info('✅ UnifiedPreviewManager shutdown complete');
  }

  /**
   * Get system status
   */
  public getSystemStatus() {
    return {
      isInitialized: this.isInitialized,
      activeApps: this.activeStates.size,
      suspendedApps: this.suspendedStates.size,
      systemMetrics: this.controlPlane.getSystemMetrics(),
      config: this.config,
    };
  }
}

// Export singleton instance
export const unifiedPreviewManager = UnifiedPreviewManager.getInstance();

/**
 * Factory function to create a new UnifiedPreviewManager instance
 */
export function createUnifiedPreviewManager(config?: Partial<PreviewManagerConfig>): UnifiedPreviewManager {
  return UnifiedPreviewManager.getInstance(config);
}

export default UnifiedPreviewManager;