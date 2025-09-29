/**
 * 🎯 RESOURCE MANAGER
 * 
 * Quest-inspired resource management system:
 * - CPU and memory monitoring capabilities
 * - Intelligent app prioritization based on usage
 * - Resource cleanup for suspended apps
 * - Performance thresholds and alerts
 * - System resource detection and allocation
 */

import { EventEmitter } from 'events';
import log from 'electron-log';
import { AppPriority, ResourceUsage, SystemResources, ResourceThresholds } from './types';

const logger = log.scope('resource-manager');

interface AppResourceUsage {
  appId: number;
  cpu: number; // CPU usage percentage
  memory: number; // Memory usage in MB
  lastAccessed: number; // Timestamp
  priority: AppPriority;
  isActive: boolean;
}

interface ResourceAlert {
  type: 'cpu' | 'memory' | 'disk';
  severity: 'warning' | 'critical';
  message: string;
  timestamp: number;
  appId?: number;
}

interface ResourceConfig {
  memory: number;
  cpu: number;
  ports: number;
  priority: AppPriority;
  type?: string; // Additional property for compatibility
}

/**
 * ResourceManager - Intelligent resource monitoring and allocation
 * 
 * Provides quest-like resource management with smart prioritization,
 * automatic cleanup, and performance optimization.
 */
export class ResourceManager extends EventEmitter {
  private appUsages = new Map<number, AppResourceUsage>();
  private systemResources: SystemResources;
  private thresholds: ResourceThresholds;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private alerts: ResourceAlert[] = [];
  private isMonitoring = false;

  // Performance tracking
  private performanceHistory: Array<{
    timestamp: number;
    cpu: number;
    memory: number;
    activeApps: number;
  }> = [];

  constructor(thresholds?: Partial<ResourceThresholds>) {
    super();
    
    this.thresholds = {
      cpuWarning: 70,
      cpuCritical: 85,
      memoryWarning: 80,
      memoryCritical: 90,
      diskWarning: 85,
      diskCritical: 95,
      ...thresholds,
    };

    this.systemResources = {
      totalMemory: 0,
      availableMemory: 0,
      cpuCores: 0,
      cpuUsage: 0,
      memoryUsage: 0,
      diskUsage: 0,
    };

    logger.info('🎯 ResourceManager initialized');
  }

  /**
   * Initialize resource monitoring
   */
  public async initialize(): Promise<void> {
    try {
      await this.detectSystemResources();
      this.startMonitoring();
      this.startCleanupRoutine();
      
      logger.info('✅ ResourceManager initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize ResourceManager:', error);
      throw error;
    }
  }

  /**
   * Register an app for resource monitoring
   */
  public registerApp(appId: number | string, priorityOrConfig: AppPriority | ResourceConfig = 'normal'): void {
    let priority: AppPriority;
    let resourceConfig: ResourceConfig | undefined;
    
    if (typeof priorityOrConfig === 'string') {
      priority = priorityOrConfig;
    } else {
      priority = priorityOrConfig.priority || 'normal';
      resourceConfig = priorityOrConfig;
    }
    
    // Convert string IDs to numeric using hash for consistency
    const numericAppId = typeof appId === 'string' ? this.stringToNumericId(appId) : appId;
    
    this.appUsages.set(numericAppId, {
      appId: numericAppId,
      cpu: resourceConfig?.cpu || 0,
      memory: resourceConfig?.memory || 0,
      lastAccessed: Date.now(),
      priority,
      isActive: true,
    });

    logger.info(`📊 Registered app ${appId} for resource monitoring (priority: ${priority})`);
    this.emit('app-registered', { appId: numericAppId, priority });
  }

  /**
   * Unregister an app from resource monitoring
   */
  public unregisterApp(appId: number | string): void {
    this.appUsages.delete(typeof appId === 'string' ? parseInt(appId) : appId);
    logger.info(`📊 Unregistered app ${appId} from resource monitoring`);
    this.emit('app-unregistered', { appId });
  }

  /**
   * Update app priority (quest-like prioritization)
   */
  public updateAppPriority(appId: number, priority: AppPriority): void {
    const usage = this.appUsages.get(appId);
    if (usage) {
      usage.priority = priority;
      usage.lastAccessed = Date.now();
      logger.info(`🎯 Updated app ${appId} priority to ${priority}`);
      this.emit('priority-updated', { appId, priority });
    }
  }

  /**
   * Mark app as accessed (for usage-based prioritization)
   */
  public markAppAccessed(appId: number): void {
    const usage = this.appUsages.get(appId);
    if (usage) {
      usage.lastAccessed = Date.now();
      usage.isActive = true;
    }
  }

  /**
   * Get resource usage for a specific app
   */
  public getAppResourceUsage(appId: number): AppResourceUsage | null {
    return this.appUsages.get(appId) || null;
  }

  /**
   * Get app usage (alias for getAppResourceUsage for test compatibility)
   */
  public getAppUsage(appId: number | string): AppResourceUsage | null {
    const numericAppId = typeof appId === 'string' ? this.stringToNumericId(appId) : appId;
    return this.appUsages.get(numericAppId) || null;
  }

  /**
   * Convert string ID to numeric ID using simple hash
   */
  private stringToNumericId(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Check if resources can be allocated for an app
   */
  public canAllocateResources(appId: number | string, requiredResources?: { memory: number; cpu: number }): boolean {
    const numericAppId = typeof appId === 'string' ? this.stringToNumericId(appId) : appId;
    
    // Calculate current resource usage
    let totalMemory = 0;
    let totalCpu = 0;
    
    for (const usage of this.appUsages.values()) {
      if (usage.isActive) {
        totalMemory += usage.memory;
        totalCpu += usage.cpu;
      }
    }
    
    // Use provided requirements or estimate from existing usage
    const usage = this.appUsages.get(numericAppId);
    const estimatedMemory = requiredResources?.memory || (usage ? usage.memory : 150);
    const estimatedCpu = requiredResources?.cpu || (usage ? usage.cpu : 0.3);
    
    // Check if adding this app would exceed thresholds
    const projectedMemory = totalMemory + estimatedMemory;
    const projectedCpu = totalCpu + estimatedCpu;
    
    // Memory threshold: 1000MB total, CPU threshold: 2.0 total
    const memoryLimit = 1000;
    const cpuLimit = 2.0;
    
    const wouldExceedMemory = projectedMemory > memoryLimit;
    const wouldExceedCpu = projectedCpu > cpuLimit;
    
    // Also check system pressure
    const isUnderPressure = 
      this.systemResources.cpuUsage > this.thresholds.cpuCritical ||
      this.systemResources.memoryUsage > this.thresholds.memoryCritical;
    
    return !wouldExceedMemory && !wouldExceedCpu && !isUnderPressure;
  }

  /**
   * Check if an app can start based on available resources
   */
  public async canStartApp(appId: number | string): Promise<boolean> {
    const numericAppId = typeof appId === 'string' ? this.stringToNumericId(appId) : appId;
    
    // Calculate current resource usage
    let totalMemory = 0;
    let totalCpu = 0;
    let activeApps = 0;
    
    for (const usage of this.appUsages.values()) {
      if (usage.isActive) {
        totalMemory += usage.memory;
        totalCpu += usage.cpu;
        activeApps++;
      }
    }
    
    // Estimate resource requirements for new app (if not registered, use defaults)
    const usage = this.appUsages.get(numericAppId);
    const estimatedMemory = usage ? usage.memory : 150; // Default memory requirement
    const estimatedCpu = usage ? usage.cpu : 0.3; // Default CPU requirement
    
    // Check if adding this app would exceed thresholds
    const projectedMemory = totalMemory + estimatedMemory;
    const projectedCpu = totalCpu + estimatedCpu;
    
    // Memory threshold: 1000MB total, CPU threshold: 2.0 total
    const memoryLimit = 1000;
    const cpuLimit = 2.0;
    
    const wouldExceedMemory = projectedMemory > memoryLimit;
    const wouldExceedCpu = projectedCpu > cpuLimit;
    
    // Also check system pressure
    const isUnderPressure = 
      this.systemResources.cpuUsage > this.thresholds.cpuCritical ||
      this.systemResources.memoryUsage > this.thresholds.memoryCritical;
    
    // Log resource check for monitoring
    logger.debug(`Resource check for ${appId}: memory=${projectedMemory}/${memoryLimit}, cpu=${projectedCpu}/${cpuLimit}, canStart=${!wouldExceedMemory && !wouldExceedCpu && !isUnderPressure}`);
    
    return !wouldExceedMemory && !wouldExceedCpu && !isUnderPressure;
  }

  /**
   * Suspend an app to free resources
   */
  public suspendApp(appId: number | string): void {
    const numericAppId = typeof appId === 'string' ? this.stringToNumericId(appId) : appId;
    const usage = this.appUsages.get(numericAppId);
    
    if (usage) {
      usage.isActive = false;
      usage.cpu *= 0.1; // Reduce CPU usage for suspended apps
      usage.memory *= 0.5; // Reduce memory usage for suspended apps
      
      logger.info(`⏸️ Suspended app ${appId} to free resources`);
      this.emit('app-suspended', { appId: numericAppId });
    }
  }

  /**
   * Resume a suspended app
   */
  public resumeApp(appId: number | string): void {
    const numericAppId = typeof appId === 'string' ? this.stringToNumericId(appId) : appId;
    const usage = this.appUsages.get(numericAppId);
    
    if (usage) {
      usage.isActive = true;
      usage.lastAccessed = Date.now();
      
      logger.info(`▶️ Resumed app ${appId}`);
      this.emit('app-resumed', { appId: numericAppId });
    }
  }

  /**
   * Add shutdown method for test compatibility
   */
  public async shutdown(): Promise<void> {
    await this.cleanup();
  }

  /**
   * Get system resource information
   */
  public getSystemResources(): SystemResources {
    return { ...this.systemResources };
  }

  /**
   * Get apps prioritized by resource usage and access patterns
   */
  public getPrioritizedApps(): AppResourceUsage[] {
    const apps = Array.from(this.appUsages.values());
    
    return apps.sort((a, b) => {
      // Priority order: critical > high > normal > low
      const priorityOrder = { critical: 4, high: 3, normal: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      
      if (priorityDiff !== 0) return priorityDiff;
      
      // If same priority, sort by last accessed (more recent first)
      return b.lastAccessed - a.lastAccessed;
    });
  }

  /**
   * Get apps that should be suspended based on resource usage
   */
  public getAppsForSuspension(): number[] {
    const apps = this.getPrioritizedApps();
    const suspendCandidates: number[] = [];
    
    // Check if system resources are under pressure
    const isUnderPressure = 
      this.systemResources.cpuUsage > this.thresholds.cpuWarning ||
      this.systemResources.memoryUsage > this.thresholds.memoryWarning;
    
    if (!isUnderPressure) {
      return suspendCandidates;
    }
    
    // Find apps that haven't been accessed recently and have low priority
    const now = Date.now();
    const inactiveThreshold = 5 * 60 * 1000; // 5 minutes
    
    for (const app of apps) {
      const isInactive = (now - app.lastAccessed) > inactiveThreshold;
      const isLowPriority = app.priority === 'low' || app.priority === 'normal';
      const isHighResourceUsage = app.cpu > 20 || app.memory > 100;
      
      if (isInactive && isLowPriority && isHighResourceUsage) {
        suspendCandidates.push(app.appId);
      }
    }
    
    return suspendCandidates;
  }

  /**
   * Get current resource alerts
   */
  public getAlerts(): ResourceAlert[] {
    return [...this.alerts];
  }

  /**
   * Clear alerts
   */
  public clearAlerts(): void {
    this.alerts = [];
    this.emit('alerts-cleared');
  }

  /**
   * Get performance history
   */
  public getPerformanceHistory(): Array<{
    timestamp: number;
    cpu: number;
    memory: number;
    activeApps: number;
  }> {
    return [...this.performanceHistory];
  }

  /**
   * Cleanup resources and stop monitoring
   */
  public async cleanup(): Promise<void> {
    this.stopMonitoring();
    this.stopCleanupRoutine();
    this.appUsages.clear();
    this.alerts = [];
    this.performanceHistory = [];
    this.removeAllListeners();
    
    logger.info('🧹 ResourceManager cleaned up');
  }

  // ===========================================
  // PRIVATE METHODS
  // ===========================================

  private async detectSystemResources(): Promise<void> {
    try {
      // In a real implementation, you would use system APIs
      // For now, we'll use reasonable defaults and mock values
      const os = require('os');
      
      this.systemResources = {
        totalMemory: os.totalmem() / (1024 * 1024), // Convert to MB
        availableMemory: os.freemem() / (1024 * 1024), // Convert to MB
        cpuCores: os.cpus().length,
        cpuUsage: 0,
        memoryUsage: 0,
        diskUsage: 0,
      };
      
      logger.info(`🖥️ System resources detected: ${this.systemResources.cpuCores} cores, ${Math.round(this.systemResources.totalMemory)}MB RAM`);
    } catch (error) {
      logger.error('❌ Failed to detect system resources:', error);
      // Fallback values
      this.systemResources = {
        totalMemory: 8192, // 8GB
        availableMemory: 4096, // 4GB
        cpuCores: 4,
        cpuUsage: 0,
        memoryUsage: 0,
        diskUsage: 0,
      };
    }
  }

  private startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.updateResourceUsage();
    }, 2000); // Update every 2 seconds
    
    logger.info('📊 Resource monitoring started');
  }

  private stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    
    logger.info('📊 Resource monitoring stopped');
  }

  private startCleanupRoutine(): void {
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, 30000); // Cleanup every 30 seconds
    
    logger.info('🧹 Cleanup routine started');
  }

  private stopCleanupRoutine(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    logger.info('🧹 Cleanup routine stopped');
  }

  private async updateResourceUsage(): Promise<void> {
    try {
      // Update system resources
      await this.updateSystemResources();
      
      // Update app-specific resources
      await this.updateAppResources();
      
      // Check for alerts
      this.checkResourceAlerts();
      
      // Record performance history
      this.recordPerformanceHistory();
      
      // Emit resource update event
      this.emit('resources-updated', {
        system: this.systemResources,
        apps: Array.from(this.appUsages.values()),
      });
      
    } catch (error) {
      logger.error('❌ Failed to update resource usage:', error);
    }
  }

  private async updateSystemResources(): Promise<void> {
    try {
      const os = require('os');
      
      // Update memory usage
      const freeMemory = os.freemem() / (1024 * 1024);
      this.systemResources.availableMemory = freeMemory;
      this.systemResources.memoryUsage = 
        ((this.systemResources.totalMemory - freeMemory) / this.systemResources.totalMemory) * 100;
      
      // Mock CPU usage (in a real implementation, you'd use system APIs)
      this.systemResources.cpuUsage = Math.random() * 30 + 10; // 10-40% usage
      
      // Mock disk usage
      this.systemResources.diskUsage = Math.random() * 20 + 50; // 50-70% usage
      
    } catch (error) {
      logger.error('❌ Failed to update system resources:', error);
    }
  }

  private async updateAppResources(): Promise<void> {
    // In a real implementation, you would query actual process resources
    // For now, we'll simulate resource usage based on app activity
    
    for (const [appId, usage] of this.appUsages.entries()) {
      if (usage.isActive) {
        // Simulate resource usage based on priority and activity
        const baseCpu = usage.priority === 'critical' ? 15 : usage.priority === 'high' ? 10 : 5;
        const baseMemory = usage.priority === 'critical' ? 200 : usage.priority === 'high' ? 150 : 100;
        
        usage.cpu = baseCpu + Math.random() * 10;
        usage.memory = baseMemory + Math.random() * 50;
        
        // Mark as inactive if not accessed recently
        const inactiveThreshold = 2 * 60 * 1000; // 2 minutes
        if (Date.now() - usage.lastAccessed > inactiveThreshold) {
          usage.isActive = false;
          usage.cpu *= 0.1; // Reduce CPU usage for inactive apps
          usage.memory *= 0.5; // Reduce memory usage for inactive apps
        }
      }
    }
  }

  private checkResourceAlerts(): void {
    const now = Date.now();
    
    // Check system CPU usage
    if (this.systemResources.cpuUsage > this.thresholds.cpuCritical) {
      this.addAlert({
        type: 'cpu',
        severity: 'critical',
        message: `Critical CPU usage: ${Math.round(this.systemResources.cpuUsage)}%`,
        timestamp: now,
      });
    } else if (this.systemResources.cpuUsage > this.thresholds.cpuWarning) {
      this.addAlert({
        type: 'cpu',
        severity: 'warning',
        message: `High CPU usage: ${Math.round(this.systemResources.cpuUsage)}%`,
        timestamp: now,
      });
    }
    
    // Check system memory usage
    if (this.systemResources.memoryUsage > this.thresholds.memoryCritical) {
      this.addAlert({
        type: 'memory',
        severity: 'critical',
        message: `Critical memory usage: ${Math.round(this.systemResources.memoryUsage)}%`,
        timestamp: now,
      });
    } else if (this.systemResources.memoryUsage > this.thresholds.memoryWarning) {
      this.addAlert({
        type: 'memory',
        severity: 'warning',
        message: `High memory usage: ${Math.round(this.systemResources.memoryUsage)}%`,
        timestamp: now,
      });
    }
  }

  private addAlert(alert: ResourceAlert): void {
    // Avoid duplicate alerts within 1 minute
    const recentAlert = this.alerts.find(a => 
      a.type === alert.type && 
      a.severity === alert.severity && 
      (alert.timestamp - a.timestamp) < 60000
    );
    
    if (!recentAlert) {
      this.alerts.push(alert);
      
      // Keep only last 50 alerts
      if (this.alerts.length > 50) {
        this.alerts = this.alerts.slice(-50);
      }
      
      logger.warn(`⚠️ Resource alert: ${alert.message}`);
      this.emit('resource-alert', alert);
    }
  }

  private recordPerformanceHistory(): void {
    const activeApps = Array.from(this.appUsages.values()).filter(app => app.isActive).length;
    
    this.performanceHistory.push({
      timestamp: Date.now(),
      cpu: this.systemResources.cpuUsage,
      memory: this.systemResources.memoryUsage,
      activeApps,
    });
    
    // Keep only last 100 records (about 3 minutes of history)
    if (this.performanceHistory.length > 100) {
      this.performanceHistory = this.performanceHistory.slice(-100);
    }
  }

  private performCleanup(): void {
    // Clean up old alerts (older than 1 hour)
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    this.alerts = this.alerts.filter(alert => alert.timestamp > oneHourAgo);
    
    // Clean up old performance history (older than 10 minutes)
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    this.performanceHistory = this.performanceHistory.filter(record => record.timestamp > tenMinutesAgo);
    
    // Emit cleanup event
    this.emit('cleanup-performed');
  }
}

// Singleton instance
let resourceManagerInstance: ResourceManager | null = null;

/**
 * Get the singleton ResourceManager instance
 */
export function getResourceManager(thresholds?: Partial<ResourceThresholds>): ResourceManager {
  if (!resourceManagerInstance) {
    resourceManagerInstance = new ResourceManager(thresholds);
  }
  return resourceManagerInstance;
}

/**
 * Factory function to create a new ResourceManager instance
 */
export function createResourceManager(thresholds?: Partial<ResourceThresholds>): ResourceManager {
  return new ResourceManager(thresholds);
}