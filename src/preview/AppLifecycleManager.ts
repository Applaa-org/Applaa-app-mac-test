/**
 * 🔄 APP LIFECYCLE MANAGER
 * 
 * Quest-inspired app lifecycle management system:
 * - App state management (loading, active, suspended, terminated)
 * - Automatic suspension of inactive apps after configurable timeout
 * - Smart resume functionality with state restoration
 * - Background app management and cleanup
 * - App switching optimization
 */

import { EventEmitter } from 'events';
import log from 'electron-log';
import { AppState, AppPriority, AppLifecycleConfig } from './types';

const logger = log.scope('app-lifecycle');

interface AppLifecycleState {
  appId: number;
  state: AppState;
  priority: AppPriority;
  lastAccessed: number;
  lastStateChange: number;
  suspendedAt?: number;
  resumeCount: number;
  totalActiveTime: number;
  savedState?: any; // Serialized app state for restoration
  metadata: {
    type: string;
    projectPath: string;
    port?: number;
    url?: string;
  };
}

interface LifecycleEvent {
  appId: number;
  fromState: AppState;
  toState: AppState;
  timestamp: number;
  reason: string;
}

/**
 * AppLifecycleManager - Intelligent app lifecycle and state management
 * 
 * Provides quest-like app management with automatic suspension,
 * smart resume, and optimized app switching.
 */
export class AppLifecycleManager extends EventEmitter {
  private apps = new Map<number, AppLifecycleState>();
  private config: AppLifecycleConfig;
  private suspensionTimer: NodeJS.Timeout | null = null;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private lifecycleHistory: LifecycleEvent[] = [];
  private isRunning = false;

  // Performance tracking
  private switchingMetrics = {
    totalSwitches: 0,
    averageSwitchTime: 0,
    fastestSwitch: Infinity,
    slowestSwitch: 0,
  };

  constructor(config?: Partial<AppLifecycleConfig>) {
    super();
    
    this.config = {
      suspensionTimeout: 5 * 60 * 1000, // 5 minutes
      cleanupInterval: 30 * 1000, // 30 seconds
      maxSuspendedApps: 10,
      maxHistoryEntries: 100,
      enableAutoSuspension: true,
      enableStateRestoration: true,
      ...config,
    };

    logger.info('🔄 AppLifecycleManager initialized');
  }

  /**
   * Initialize the lifecycle manager
   */
  public async initialize(): Promise<void> {
    try {
      this.startSuspensionTimer();
      this.startCleanupTimer();
      this.isRunning = true;
      
      logger.info('✅ AppLifecycleManager initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize AppLifecycleManager:', error);
      throw error;
    }
  }

  /**
   * Register a new app for lifecycle management
   */
  public registerApp(appId: number, metadata: {
    type: string;
    projectPath: string;
    port?: number;
    url?: string;
  }, priority: AppPriority = 'normal'): void {
    const now = Date.now();
    
    const lifecycleState: AppLifecycleState = {
      appId,
      state: 'loading',
      priority,
      lastAccessed: now,
      lastStateChange: now,
      resumeCount: 0,
      totalActiveTime: 0,
      metadata,
    };
    
    this.apps.set(appId, lifecycleState);
    
    this.recordLifecycleEvent(appId, 'idle', 'loading', 'App registered');
    
    logger.info(`🔄 Registered app ${appId} for lifecycle management (${metadata.type})`);
    this.emit('app-registered', { appId, metadata, priority });
  }

  /**
   * Unregister an app from lifecycle management
   */
  public unregisterApp(appId: number): void {
    const app = this.apps.get(appId);
    if (app) {
      this.recordLifecycleEvent(appId, app.state, 'terminated', 'App unregistered');
      this.apps.delete(appId);
      
      logger.info(`🔄 Unregistered app ${appId} from lifecycle management`);
      this.emit('app-unregistered', { appId });
    }
  }

  /**
   * Update app state (alias for transitionAppState)
   */
  public async updateAppState(appId: number, newState: AppState, reason: string = ''): Promise<void> {
    return this.transitionAppState(appId, newState, reason);
  }

  /**
   * Transition app to a new state (alias for transitionAppState)
   */
  public async transitionTo(appId: number, newState: AppState, reason: string = ''): Promise<void> {
    return this.transitionAppState(appId, newState, reason);
  }

  /**
   * Get all app states
   */
  public getAllAppStates(): Map<number, AppLifecycleState> {
    return new Map(this.apps);
  }

  /**
   * Transition app to a new state
   */
  public async transitionAppState(appId: number, newState: AppState, reason: string = ''): Promise<void> {
    const app = this.apps.get(appId);
    if (!app) {
      logger.warn(`⚠️ Cannot transition unknown app ${appId} to ${newState}`);
      return;
    }

    const oldState = app.state;
    if (oldState === newState) {
      return; // No change needed
    }

    // Validate state transition
    if (!this.isValidTransition(oldState, newState)) {
      logger.warn(`⚠️ Invalid state transition for app ${appId}: ${oldState} -> ${newState}`);
      return;
    }

    const now = Date.now();
    
    // Update active time if transitioning from active state
    if (oldState === 'running') {
      app.totalActiveTime += now - app.lastStateChange;
    }

    // Handle state-specific logic
    await this.handleStateTransition(app, oldState, newState);

    // Update app state
    app.state = newState;
    app.lastStateChange = now;
    
    if (newState === 'running') {
      app.lastAccessed = now;
    }

    this.recordLifecycleEvent(appId, oldState, newState, reason);
    
    logger.info(`🔄 App ${appId} transitioned: ${oldState} -> ${newState} (${reason})`);
    this.emit('state-changed', { appId, fromState: oldState, toState: newState, reason });
  }

  /**
   * Mark app as accessed (prevents suspension)
   */
  public markAppAccessed(appId: number): void {
    const app = this.apps.get(appId);
    if (app) {
      app.lastAccessed = Date.now();
      
      // If app is suspended, resume it
      if (app.state === 'suspended') {
        this.resumeApp(appId);
      }
    }
  }

  /**
   * Suspend an app (save state and reduce resource usage)
   */
  public async suspendApp(appId: number): Promise<void> {
    const app = this.apps.get(appId);
    if (!app || app.state !== 'running') {
      return;
    }

    try {
      // Save app state if restoration is enabled
      if (this.config.enableStateRestoration) {
        app.savedState = await this.saveAppState(appId);
      }
      
      app.suspendedAt = Date.now();
      await this.transitionAppState(appId, 'suspended', 'Automatic suspension due to inactivity');
      
      logger.info(`💤 App ${appId} suspended`);
      this.emit('app-suspended', { appId });
      
    } catch (error) {
      logger.error(`❌ Failed to suspend app ${appId}:`, error);
    }
  }

  /**
   * Resume a suspended app
   */
  public async resumeApp(appId: number): Promise<void> {
    const app = this.apps.get(appId);
    if (!app || app.state !== 'suspended') {
      return;
    }

    const startTime = Date.now();
    
    try {
      // Restore app state if available
      if (app.savedState && this.config.enableStateRestoration) {
        await this.restoreAppState(appId, app.savedState);
      }
      
      app.resumeCount++;
      app.suspendedAt = undefined;
      app.savedState = undefined;
      
      await this.transitionAppState(appId, 'running', 'App resumed from suspension');
      
      const resumeTime = Date.now() - startTime;
      this.updateSwitchingMetrics(resumeTime);
      
      logger.info(`🔄 App ${appId} resumed (${resumeTime}ms)`);
      this.emit('app-resumed', { appId, resumeTime });
      
    } catch (error) {
      logger.error(`❌ Failed to resume app ${appId}:`, error);
      await this.transitionAppState(appId, 'error', `Resume failed: ${error}`);
    }
  }

  /**
   * Switch to a specific app (optimized switching)
   */
  public async switchToApp(appId: number): Promise<void> {
    const app = this.apps.get(appId);
    if (!app) {
      logger.warn(`⚠️ Cannot switch to unknown app ${appId}`);
      return;
    }

    const startTime = Date.now();
    
    try {
      // Mark as accessed
      this.markAppAccessed(appId);
      
      // If app is suspended, resume it
      if (app.state === 'suspended') {
        await this.resumeApp(appId);
      }
      
      // If app is not running, start it
      if (app.state !== 'running') {
        await this.transitionAppState(appId, 'running', 'App switched to');
      }
      
      const switchTime = Date.now() - startTime;
      this.updateSwitchingMetrics(switchTime);
      
      logger.info(`🔄 Switched to app ${appId} (${switchTime}ms)`);
      this.emit('app-switched', { appId, switchTime });
      
    } catch (error) {
      logger.error(`❌ Failed to switch to app ${appId}:`, error);
    }
  }

  /**
   * Get app lifecycle state
   */
  public getAppState(appId: number): AppLifecycleState | null {
    return this.apps.get(appId) || null;
  }

  /**
   * Get all apps in a specific state
   */
  public getAppsByState(state: AppState): AppLifecycleState[] {
    return Array.from(this.apps.values()).filter(app => app.state === state);
  }

  /**
   * Get apps that should be suspended
   */
  public getAppsForSuspension(): number[] {
    if (!this.config.enableAutoSuspension) {
      return [];
    }

    const now = Date.now();
    const suspensionCandidates: number[] = [];
    
    for (const app of this.apps.values()) {
      if (app.state === 'running') {
        const inactiveTime = now - app.lastAccessed;
        const shouldSuspend = inactiveTime > this.config.suspensionTimeout;
        
        // Don't suspend critical priority apps
        if (shouldSuspend && app.priority !== 'critical') {
          suspensionCandidates.push(app.appId);
        }
      }
    }
    
    return suspensionCandidates;
  }

  /**
   * Get lifecycle history
   */
  public getLifecycleHistory(): LifecycleEvent[] {
    return [...this.lifecycleHistory];
  }

  /**
   * Get switching performance metrics
   */
  public getSwitchingMetrics(): typeof this.switchingMetrics {
    return { ...this.switchingMetrics };
  }

  /**
   * Get lifecycle statistics
   */
  public getStatistics(): {
    totalApps: number;
    activeApps: number;
    suspendedApps: number;
    averageActiveTime: number;
    totalResumes: number;
  } {
    const apps = Array.from(this.apps.values());
    const activeApps = apps.filter(app => app.state === 'running').length;
    const suspendedApps = apps.filter(app => app.state === 'suspended').length;
    const totalActiveTime = apps.reduce((sum, app) => sum + app.totalActiveTime, 0);
    const totalResumes = apps.reduce((sum, app) => sum + app.resumeCount, 0);
    
    return {
      totalApps: apps.length,
      activeApps,
      suspendedApps,
      averageActiveTime: apps.length > 0 ? totalActiveTime / apps.length : 0,
      totalResumes,
    };
  }

  /**
   * Alias for transitionAppState - used by integration tests
   */
  public async transitionState(appId: number, newState: AppState, reason?: string): Promise<void> {
    return this.transitionAppState(appId, newState, reason || '');
  }

  /**
   * Get inactive apps that can be suspended - used by integration tests
   */
  public getInactiveApps(): number[] {
    return this.getAppsForSuspension();
  }

  /**
   * Optimize resources by suspending inactive apps - used by integration tests
   */
  public async optimizeResources(): Promise<void> {
    const inactiveApps = this.getInactiveApps();
    for (const appId of inactiveApps) {
      await this.suspendApp(appId);
    }
  }

  /**
   * Get stats - alias for getStatistics - used by integration tests
   */
  public getStats(): {
    totalApps: number;
    activeApps: number;
    suspendedApps: number;
    averageActiveTime: number;
    totalResumes: number;
  } {
    return this.getStatistics();
  }

  /**
   * Shutdown method for compatibility with tests and other components
   */
  public async shutdown(): Promise<void> {
    await this.cleanup();
  }

  /**
   * Cleanup resources and stop lifecycle management
   */
  public async cleanup(): Promise<void> {
    this.stopSuspensionTimer();
    this.stopCleanupTimer();
    this.isRunning = false;
    
    // Terminate all apps
    for (const appId of this.apps.keys()) {
      await this.transitionAppState(appId, 'terminated', 'Lifecycle manager cleanup');
    }
    
    this.apps.clear();
    this.lifecycleHistory = [];
    this.removeAllListeners();
    
    logger.info('🧹 AppLifecycleManager cleaned up');
  }

  // ===========================================
  // PRIVATE METHODS
  // ===========================================

  private isValidTransition(fromState: AppState, toState: AppState): boolean {
    const validTransitions: Record<AppState, AppState[]> = {
      idle: ['loading'],
      loading: ['running', 'error'],
      running: ['suspended', 'error', 'terminated'],
      suspended: ['running', 'terminated'],
      error: ['loading', 'terminated'],
      terminated: [], // Terminal state
    };
    
    return validTransitions[fromState]?.includes(toState) || false;
  }

  private async handleStateTransition(
    app: AppLifecycleState,
    fromState: AppState,
    toState: AppState
  ): Promise<void> {
    // Handle specific transition logic
    switch (toState) {
      case 'suspended':
        // Emit suspension warning to allow cleanup
        this.emit('app-suspending', { appId: app.appId });
        break;
        
      case 'running':
        if (fromState === 'suspended') {
          // Emit resume preparation
          this.emit('app-resuming', { appId: app.appId });
        }
        break;
        
      case 'terminated':
        // Emit termination warning
        this.emit('app-terminating', { appId: app.appId });
        break;
    }
  }

  private async saveAppState(appId: number): Promise<any> {
    // In a real implementation, this would save the actual app state
    // For now, we'll return a mock state object
    return {
      timestamp: Date.now(),
      appId,
      // Add more state data as needed
    };
  }

  private async restoreAppState(appId: number, savedState: any): Promise<void> {
    // In a real implementation, this would restore the actual app state
    logger.info(`🔄 Restoring state for app ${appId}`);
  }

  private recordLifecycleEvent(
    appId: number,
    fromState: AppState,
    toState: AppState,
    reason: string
  ): void {
    const event: LifecycleEvent = {
      appId,
      fromState,
      toState,
      timestamp: Date.now(),
      reason,
    };
    
    this.lifecycleHistory.push(event);
    
    // Keep only recent history
    if (this.lifecycleHistory.length > this.config.maxHistoryEntries) {
      this.lifecycleHistory = this.lifecycleHistory.slice(-this.config.maxHistoryEntries);
    }
  }

  private updateSwitchingMetrics(switchTime: number): void {
    this.switchingMetrics.totalSwitches++;
    this.switchingMetrics.fastestSwitch = Math.min(this.switchingMetrics.fastestSwitch, switchTime);
    this.switchingMetrics.slowestSwitch = Math.max(this.switchingMetrics.slowestSwitch, switchTime);
    
    // Update average
    const total = this.switchingMetrics.averageSwitchTime * (this.switchingMetrics.totalSwitches - 1) + switchTime;
    this.switchingMetrics.averageSwitchTime = total / this.switchingMetrics.totalSwitches;
  }

  private startSuspensionTimer(): void {
    if (!this.config.enableAutoSuspension) {
      return;
    }
    
    this.suspensionTimer = setInterval(() => {
      this.checkForSuspension();
    }, this.config.suspensionTimeout / 4); // Check 4 times per suspension timeout
    
    logger.info('⏰ Suspension timer started');
  }

  private stopSuspensionTimer(): void {
    if (this.suspensionTimer) {
      clearInterval(this.suspensionTimer);
      this.suspensionTimer = null;
    }
    
    logger.info('⏰ Suspension timer stopped');
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.performCleanup();
    }, this.config.cleanupInterval);
    
    logger.info('🧹 Cleanup timer started');
  }

  private stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    
    logger.info('🧹 Cleanup timer stopped');
  }

  private async checkForSuspension(): Promise<void> {
    const appsToSuspend = this.getAppsForSuspension();
    
    for (const appId of appsToSuspend) {
      await this.suspendApp(appId);
    }
    
    // Limit number of suspended apps
    const suspendedApps = this.getAppsByState('suspended');
    if (suspendedApps.length > this.config.maxSuspendedApps) {
      // Terminate oldest suspended apps
      const oldestSuspended = suspendedApps
        .sort((a, b) => (a.suspendedAt || 0) - (b.suspendedAt || 0))
        .slice(0, suspendedApps.length - this.config.maxSuspendedApps);
      
      for (const app of oldestSuspended) {
        await this.transitionAppState(app.appId, 'terminated', 'Exceeded max suspended apps limit');
      }
    }
  }

  private performCleanup(): void {
    // Clean up old lifecycle history
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    this.lifecycleHistory = this.lifecycleHistory.filter(event => event.timestamp > oneHourAgo);
    
    // Emit cleanup event
    this.emit('cleanup-performed');
  }
}

// Singleton instance
let appLifecycleManagerInstance: AppLifecycleManager | null = null;

/**
 * Get the singleton AppLifecycleManager instance
 */
export function getAppLifecycleManager(config?: Partial<AppLifecycleConfig>): AppLifecycleManager {
  if (!appLifecycleManagerInstance) {
    appLifecycleManagerInstance = new AppLifecycleManager(config);
  }
  return appLifecycleManagerInstance;
}

/**
 * Factory function to create a new AppLifecycleManager instance
 */
export function createAppLifecycleManager(config?: Partial<AppLifecycleConfig>): AppLifecycleManager {
  return new AppLifecycleManager(config);
}