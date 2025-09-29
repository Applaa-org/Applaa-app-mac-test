import { EventEmitter } from 'events';
import { logger } from '../lib/utils';
import { UnifiedPreviewManager } from './UnifiedPreviewManager';
import { ResourceManager } from './ResourceManager';
import { TemplateCacheManager } from './TemplateCacheManager';
import { AppLifecycleManager } from './AppLifecycleManager';
import { PerformanceMonitor } from './PerformanceMonitor';

export interface PerformanceMetrics {
  timestamp: number;
  cpu: {
    usage: number;
    available: number;
    total: number;
  };
  memory: {
    usage: number;
    available: number;
    total: number;
  };
  apps: {
    total: number;
    active: number;
    suspended: number;
    loading: number;
  };
  cache: {
    hitRate: number;
    totalEntries: number;
    evictionCount: number;
    size: number;
  };
  performance: {
    avgResponseTime: number;
    throughput: number;
    errorRate: number;
  };
}

export interface SystemAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  message: string;
  timestamp: number;
  resolved: boolean;
}

export interface PerformanceTrend {
  metric: string;
  values: number[];
  timestamps: number[];
  trend: 'up' | 'down' | 'stable';
}

export class PerformanceDashboard extends EventEmitter {
  private previewManager: UnifiedPreviewManager;
  private resourceManager: ResourceManager;
  private cacheManager: TemplateCacheManager;
  private lifecycleManager: AppLifecycleManager;
  private performanceMonitor: PerformanceMonitor;
  
  private metrics: PerformanceMetrics[] = [];
  private alerts: SystemAlert[] = [];
  private trends: Map<string, PerformanceTrend> = new Map();
  private updateInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  
  private readonly maxMetricsHistory = 1000;
  private readonly updateFrequency = 1000; // 1 second
  private readonly alertThresholds = {
    cpuUsage: 80,
    memoryUsage: 85,
    errorRate: 5,
    responseTime: 2000
  };

  constructor(
    previewManager: UnifiedPreviewManager,
    resourceManager: ResourceManager,
    cacheManager: TemplateCacheManager,
    lifecycleManager: AppLifecycleManager,
    performanceMonitor: PerformanceMonitor
  ) {
    super();
    this.previewManager = previewManager;
    this.resourceManager = resourceManager;
    this.cacheManager = cacheManager;
    this.lifecycleManager = lifecycleManager;
    this.performanceMonitor = performanceMonitor;
    
    this.setupEventListeners();
  }

  /**
   * Start the performance dashboard monitoring
   */
  public start(): void {
    if (this.isRunning) {
      logger.warn('⚠️ Performance dashboard is already running');
      return;
    }

    this.isRunning = true;
    this.updateInterval = setInterval(() => {
      this.collectMetrics();
      this.analyzePerformance();
      this.checkAlerts();
    }, this.updateFrequency);

    logger.info('📊 Performance dashboard started');
    this.emit('dashboard:started');
  }

  /**
   * Stop the performance dashboard monitoring
   */
  public stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    logger.info('📊 Performance dashboard stopped');
    this.emit('dashboard:stopped');
  }

  /**
   * Get current performance metrics
   */
  public getCurrentMetrics(): PerformanceMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  /**
   * Get historical metrics
   */
  public getHistoricalMetrics(limit?: number): PerformanceMetrics[] {
    const metricsToReturn = limit ? this.metrics.slice(-limit) : this.metrics;
    return [...metricsToReturn];
  }

  /**
   * Get active alerts
   */
  public getActiveAlerts(): SystemAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Get all alerts
   */
  public getAllAlerts(): SystemAlert[] {
    return [...this.alerts];
  }

  /**
   * Get performance trends
   */
  public getPerformanceTrends(): Map<string, PerformanceTrend> {
    return new Map(this.trends);
  }

  /**
   * Resolve an alert
   */
  public resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      this.emit('alert:resolved', alert);
      return true;
    }
    return false;
  }

  /**
   * Get system health score (0-100)
   */
  public getSystemHealthScore(): number {
    const currentMetrics = this.getCurrentMetrics();
    if (!currentMetrics) return 100;

    let score = 100;
    
    // CPU health (25% weight)
    const cpuUsagePercent = (currentMetrics.cpu.usage / currentMetrics.cpu.total) * 100;
    if (cpuUsagePercent > 90) score -= 25;
    else if (cpuUsagePercent > 75) score -= 15;
    else if (cpuUsagePercent > 50) score -= 5;

    // Memory health (25% weight)
    const memoryUsagePercent = (currentMetrics.memory.usage / currentMetrics.memory.total) * 100;
    if (memoryUsagePercent > 90) score -= 25;
    else if (memoryUsagePercent > 75) score -= 15;
    else if (memoryUsagePercent > 50) score -= 5;

    // Performance health (25% weight)
    if (currentMetrics.performance.errorRate > 10) score -= 25;
    else if (currentMetrics.performance.errorRate > 5) score -= 15;
    else if (currentMetrics.performance.errorRate > 1) score -= 5;

    // Cache health (25% weight)
    if (currentMetrics.cache.hitRate < 50) score -= 25;
    else if (currentMetrics.cache.hitRate < 70) score -= 15;
    else if (currentMetrics.cache.hitRate < 85) score -= 5;

    return Math.max(0, score);
  }

  /**
   * Get resource utilization summary
   */
  public getResourceUtilization(): {
    cpu: { used: number; available: number; percentage: number };
    memory: { used: number; available: number; percentage: number };
    apps: { total: number; byState: Record<string, number> };
  } {
    const currentMetrics = this.getCurrentMetrics();
    if (!currentMetrics) {
      return {
        cpu: { used: 0, available: 0, percentage: 0 },
        memory: { used: 0, available: 0, percentage: 0 },
        apps: { total: 0, byState: {} }
      };
    }

    return {
      cpu: {
        used: currentMetrics.cpu.usage,
        available: currentMetrics.cpu.available,
        percentage: (currentMetrics.cpu.usage / currentMetrics.cpu.total) * 100
      },
      memory: {
        used: currentMetrics.memory.usage,
        available: currentMetrics.memory.available,
        percentage: (currentMetrics.memory.usage / currentMetrics.memory.total) * 100
      },
      apps: {
        total: currentMetrics.apps.total,
        byState: {
          active: currentMetrics.apps.active,
          suspended: currentMetrics.apps.suspended,
          loading: currentMetrics.apps.loading
        }
      }
    };
  }

  /**
   * Export performance data for analysis
   */
  public exportData(): {
    metrics: PerformanceMetrics[];
    alerts: SystemAlert[];
    trends: Record<string, PerformanceTrend>;
    summary: {
      healthScore: number;
      utilization: ReturnType<PerformanceDashboard['getResourceUtilization']>;
      activeAlerts: number;
    };
  } {
    return {
      metrics: this.getHistoricalMetrics(),
      alerts: this.getAllAlerts(),
      trends: Object.fromEntries(this.trends),
      summary: {
        healthScore: this.getSystemHealthScore(),
        utilization: this.getResourceUtilization(),
        activeAlerts: this.getActiveAlerts().length
      }
    };
  }

  private setupEventListeners(): void {
    // Listen to preview manager events
    this.previewManager.on('app:started', () => this.emit('metrics:updated'));
    this.previewManager.on('app:stopped', () => this.emit('metrics:updated'));
    
    // Listen to resource manager events
    this.resourceManager.on('resource:allocated', () => this.emit('metrics:updated'));
    this.resourceManager.on('resource:freed', () => this.emit('metrics:updated'));
    
    // Listen to cache manager events
    this.cacheManager.on('template:cached', () => this.emit('metrics:updated'));
    this.cacheManager.on('template:evicted', () => this.emit('metrics:updated'));
    
    // Listen to lifecycle manager events
    this.lifecycleManager.on('state:changed', () => this.emit('metrics:updated'));
  }

  private collectMetrics(): void {
    try {
      const timestamp = Date.now();
      const systemResources = this.resourceManager.getSystemResources();
      const cacheStats = this.cacheManager.getStats();
      const performanceStats = this.performanceMonitor.getStats();
      const appStates = this.lifecycleManager.getAllAppStates();

      // Count apps by state
      const appsByState = {
        total: appStates.length,
        active: appStates.filter(app => app.state === 'running').length,
        suspended: appStates.filter(app => app.state === 'suspended').length,
        loading: appStates.filter(app => app.state === 'loading').length
      };

      const metrics: PerformanceMetrics = {
        timestamp,
        cpu: {
          usage: systemResources.cpu.used,
          available: systemResources.cpu.available,
          total: systemResources.cpu.total
        },
        memory: {
          usage: systemResources.memory.used,
          available: systemResources.memory.available,
          total: systemResources.memory.total
        },
        apps: appsByState,
        cache: {
          hitRate: cacheStats.hitRate,
          totalEntries: cacheStats.totalEntries,
          evictionCount: cacheStats.evictionCount,
          size: cacheStats.totalSize
        },
        performance: {
          avgResponseTime: performanceStats.averageResponseTime,
          throughput: performanceStats.requestsPerSecond,
          errorRate: performanceStats.errorRate
        }
      };

      this.metrics.push(metrics);
      
      // Keep only recent metrics
      if (this.metrics.length > this.maxMetricsHistory) {
        this.metrics = this.metrics.slice(-this.maxMetricsHistory);
      }

      this.emit('metrics:collected', metrics);
    } catch (error) {
      logger.error('❌ Error collecting performance metrics:', error);
    }
  }

  private analyzePerformance(): void {
    if (this.metrics.length < 2) return;

    const recent = this.metrics.slice(-10); // Last 10 data points
    
    // Analyze CPU trend
    this.updateTrend('cpu_usage', recent.map(m => (m.cpu.usage / m.cpu.total) * 100));
    
    // Analyze memory trend
    this.updateTrend('memory_usage', recent.map(m => (m.memory.usage / m.memory.total) * 100));
    
    // Analyze cache hit rate trend
    this.updateTrend('cache_hit_rate', recent.map(m => m.cache.hitRate));
    
    // Analyze response time trend
    this.updateTrend('response_time', recent.map(m => m.performance.avgResponseTime));
    
    // Analyze throughput trend
    this.updateTrend('throughput', recent.map(m => m.performance.throughput));
  }

  private updateTrend(metric: string, values: number[]): void {
    if (values.length < 2) return;

    const timestamps = this.metrics.slice(-values.length).map(m => m.timestamp);
    
    // Calculate trend direction
    const first = values[0];
    const last = values[values.length - 1];
    const change = ((last - first) / first) * 100;
    
    let trend: 'up' | 'down' | 'stable';
    if (Math.abs(change) < 5) trend = 'stable';
    else if (change > 0) trend = 'up';
    else trend = 'down';

    this.trends.set(metric, {
      metric,
      values: [...values],
      timestamps: [...timestamps],
      trend
    });
  }

  private checkAlerts(): void {
    const currentMetrics = this.getCurrentMetrics();
    if (!currentMetrics) return;

    const timestamp = Date.now();
    
    // Check CPU usage
    const cpuUsagePercent = (currentMetrics.cpu.usage / currentMetrics.cpu.total) * 100;
    if (cpuUsagePercent > this.alertThresholds.cpuUsage) {
      this.createAlert('warning', `High CPU usage: ${cpuUsagePercent.toFixed(1)}%`, timestamp);
    }

    // Check memory usage
    const memoryUsagePercent = (currentMetrics.memory.usage / currentMetrics.memory.total) * 100;
    if (memoryUsagePercent > this.alertThresholds.memoryUsage) {
      this.createAlert('warning', `High memory usage: ${memoryUsagePercent.toFixed(1)}%`, timestamp);
    }

    // Check error rate
    if (currentMetrics.performance.errorRate > this.alertThresholds.errorRate) {
      this.createAlert('error', `High error rate: ${currentMetrics.performance.errorRate.toFixed(1)}%`, timestamp);
    }

    // Check response time
    if (currentMetrics.performance.avgResponseTime > this.alertThresholds.responseTime) {
      this.createAlert('warning', `Slow response time: ${currentMetrics.performance.avgResponseTime}ms`, timestamp);
    }

    // Check cache performance
    if (currentMetrics.cache.hitRate < 50) {
      this.createAlert('info', `Low cache hit rate: ${currentMetrics.cache.hitRate.toFixed(1)}%`, timestamp);
    }
  }

  private createAlert(type: SystemAlert['type'], message: string, timestamp: number): void {
    // Check if similar alert already exists and is not resolved
    const existingAlert = this.alerts.find(alert => 
      !alert.resolved && 
      alert.message === message && 
      timestamp - alert.timestamp < 60000 // Within 1 minute
    );

    if (existingAlert) return;

    const alert: SystemAlert = {
      id: `alert_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      message,
      timestamp,
      resolved: false
    };

    this.alerts.push(alert);
    
    // Keep only recent alerts (last 100)
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    this.emit('alert:created', alert);
    logger.info(`🚨 Performance alert: ${message}`);
  }

  /**
   * Reset all metrics and alerts
   */
  public reset(): void {
    this.metrics = [];
    this.alerts = [];
    this.trends.clear();
    this.emit('dashboard:reset');
    logger.info('📊 Performance dashboard reset');
  }

  /**
   * Get dashboard status
   */
  public getStatus(): {
    isRunning: boolean;
    metricsCount: number;
    alertsCount: number;
    healthScore: number;
    uptime: number;
  } {
    return {
      isRunning: this.isRunning,
      metricsCount: this.metrics.length,
      alertsCount: this.getActiveAlerts().length,
      healthScore: this.getSystemHealthScore(),
      uptime: this.metrics.length > 0 ? Date.now() - this.metrics[0].timestamp : 0
    };
  }
}

export default PerformanceDashboard;