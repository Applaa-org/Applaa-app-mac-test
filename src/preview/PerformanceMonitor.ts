/**
 * 📊 PERFORMANCE MONITOR
 * 
 * Real-time performance tracking and optimization:
 * - Load time monitoring
 * - Memory usage tracking
 * - CPU utilization analysis
 * - Performance bottleneck detection
 * - Optimization recommendations
 */

import { EventEmitter } from 'events';
import log from 'electron-log';
import { PreviewMetrics, PreviewManagerConfig } from './types';
import { AppType } from './types-simple';

const logger = log.scope('performance-monitor');

interface PerformanceSnapshot {
  timestamp: number;
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  cpuUsage: number;
  activeApps: number;
  loadTimes: Record<number, number>;
  errors: number;
}

interface AppPerformanceMetrics {
  appId: number;
  appType: AppType;
  startTime: number;
  loadTime?: number;
  memoryPeak: number;
  cpuPeak: number;
  errorCount: number;
  restartCount: number;
  lastActivity: number;
  healthScore: number;
}

interface PerformanceAlert {
  type: 'memory' | 'cpu' | 'load_time' | 'error_rate' | 'health';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  appId?: number;
  value: number;
  threshold: number;
  timestamp: number;
}

interface PerformanceThresholds {
  memoryWarning: number; // MB
  memoryCritical: number; // MB
  cpuWarning: number; // %
  cpuCritical: number; // %
  loadTimeWarning: number; // ms
  loadTimeCritical: number; // ms
  errorRateWarning: number; // errors per minute
  errorRateCritical: number; // errors per minute
  healthScoreWarning: number; // 0-100
  healthScoreCritical: number; // 0-100
}

/**
 * PerformanceMonitor - Tracks and optimizes preview system performance
 * 
 * Features:
 * 1. Real-time performance metrics collection
 * 2. Automated bottleneck detection
 * 3. Performance alerts and notifications
 * 4. Historical performance analysis
 * 5. Optimization recommendations
 * 6. Health scoring for apps
 */
export class PerformanceMonitor extends EventEmitter {
  private config: PreviewManagerConfig;
  private appMetrics = new Map<number, AppPerformanceMetrics>();
  private snapshots: PerformanceSnapshot[] = [];
  private alerts: PerformanceAlert[] = [];
  private thresholds: PerformanceThresholds;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;
  private startTime = Date.now();

  constructor(config: PreviewManagerConfig) {
    super();
    this.config = config;
    
    // Initialize performance thresholds
    this.thresholds = {
      memoryWarning: 500, // 500MB
      memoryCritical: 1000, // 1GB
      cpuWarning: 70, // 70%
      cpuCritical: 90, // 90%
      loadTimeWarning: 10000, // 10s
      loadTimeCritical: 30000, // 30s
      errorRateWarning: 5, // 5 errors per minute
      errorRateCritical: 15, // 15 errors per minute
      healthScoreWarning: 60, // Score below 60
      healthScoreCritical: 30, // Score below 30
    };
    
    logger.info('📊 PerformanceMonitor initialized');
  }

  /**
   * Start performance monitoring
   */
  public startMonitoring(): void {
    if (this.isMonitoring) {
      return;
    }

    logger.info('🔍 Starting performance monitoring...');
    
    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.collectPerformanceSnapshot();
      this.analyzePerformance();
      this.cleanupOldData();
    }, 5000); // Every 5 seconds
    
    logger.info('✅ Performance monitoring started');
  }

  /**
   * Stop performance monitoring
   */
  public stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    logger.info('⏹️ Stopping performance monitoring...');
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    this.isMonitoring = false;
    logger.info('✅ Performance monitoring stopped');
  }

  /**
   * Track app start
   */
  public trackAppStart(appId: number, appType: AppType): void {
    const metrics: AppPerformanceMetrics = {
      appId,
      appType,
      startTime: Date.now(),
      memoryPeak: 0,
      cpuPeak: 0,
      errorCount: 0,
      restartCount: 0,
      lastActivity: Date.now(),
      healthScore: 100,
    };
    
    this.appMetrics.set(appId, metrics);
    
    logger.info(`📈 Started tracking app ${appId} (${appType})`);
    this.emit('app:start-tracked', appId, appType);
  }

  /**
   * Track app load completion
   */
  public trackAppLoaded(appId: number): void {
    const metrics = this.appMetrics.get(appId);
    if (!metrics) {
      logger.warn(`⚠️ No metrics found for app ${appId}`);
      return;
    }
    
    const loadTime = Date.now() - metrics.startTime;
    metrics.loadTime = loadTime;
    metrics.lastActivity = Date.now();
    
    // Check load time thresholds
    if (loadTime > this.thresholds.loadTimeCritical) {
      this.createAlert('load_time', 'critical', `App ${appId} took ${loadTime}ms to load`, appId, loadTime, this.thresholds.loadTimeCritical);
    } else if (loadTime > this.thresholds.loadTimeWarning) {
      this.createAlert('load_time', 'medium', `App ${appId} took ${loadTime}ms to load`, appId, loadTime, this.thresholds.loadTimeWarning);
    }
    
    logger.info(`⏱️ App ${appId} loaded in ${loadTime}ms`);
    this.emit('app:loaded', appId, loadTime);
  }

  /**
   * Track app error
   */
  public trackAppError(appId: number, error: Error): void {
    const metrics = this.appMetrics.get(appId);
    if (!metrics) {
      logger.warn(`⚠️ No metrics found for app ${appId}`);
      return;
    }
    
    metrics.errorCount++;
    metrics.lastActivity = Date.now();
    
    // Update health score
    metrics.healthScore = Math.max(0, metrics.healthScore - 10);
    
    // Check error rate
    const errorRate = this.calculateErrorRate(appId);
    if (errorRate > this.thresholds.errorRateCritical) {
      this.createAlert('error_rate', 'critical', `App ${appId} has high error rate: ${errorRate}/min`, appId, errorRate, this.thresholds.errorRateCritical);
    } else if (errorRate > this.thresholds.errorRateWarning) {
      this.createAlert('error_rate', 'medium', `App ${appId} has elevated error rate: ${errorRate}/min`, appId, errorRate, this.thresholds.errorRateWarning);
    }
    
    logger.warn(`❌ App ${appId} error: ${error.message}`);
    this.emit('app:error', appId, error, errorRate);
  }

  /**
   * Track app restart
   */
  public trackAppRestart(appId: number): void {
    const metrics = this.appMetrics.get(appId);
    if (!metrics) {
      logger.warn(`⚠️ No metrics found for app ${appId}`);
      return;
    }
    
    metrics.restartCount++;
    metrics.lastActivity = Date.now();
    
    // Reset some metrics
    metrics.startTime = Date.now();
    metrics.loadTime = undefined;
    
    // Decrease health score for restarts
    metrics.healthScore = Math.max(0, metrics.healthScore - 5);
    
    logger.info(`🔄 App ${appId} restarted (count: ${metrics.restartCount})`);
    this.emit('app:restarted', appId, metrics.restartCount);
  }

  /**
   * Update app resource usage
   */
  public updateAppResources(appId: number, memoryMB: number, cpuPercent: number): void {
    const metrics = this.appMetrics.get(appId);
    if (!metrics) {
      return;
    }
    
    // Update peaks
    metrics.memoryPeak = Math.max(metrics.memoryPeak, memoryMB);
    metrics.cpuPeak = Math.max(metrics.cpuPeak, cpuPercent);
    metrics.lastActivity = Date.now();
    
    // Check memory thresholds
    if (memoryMB > this.thresholds.memoryCritical) {
      this.createAlert('memory', 'critical', `App ${appId} using ${memoryMB}MB memory`, appId, memoryMB, this.thresholds.memoryCritical);
    } else if (memoryMB > this.thresholds.memoryWarning) {
      this.createAlert('memory', 'medium', `App ${appId} using ${memoryMB}MB memory`, appId, memoryMB, this.thresholds.memoryWarning);
    }
    
    // Check CPU thresholds
    if (cpuPercent > this.thresholds.cpuCritical) {
      this.createAlert('cpu', 'critical', `App ${appId} using ${cpuPercent}% CPU`, appId, cpuPercent, this.thresholds.cpuCritical);
    } else if (cpuPercent > this.thresholds.cpuWarning) {
      this.createAlert('cpu', 'medium', `App ${appId} using ${cpuPercent}% CPU`, appId, cpuPercent, this.thresholds.cpuWarning);
    }
    
    // Update health score based on resource usage
    this.updateHealthScore(appId);
  }

  /**
   * Track app stop
   */
  public trackAppStop(appId: number): void {
    const metrics = this.appMetrics.get(appId);
    if (!metrics) {
      return;
    }
    
    const totalRuntime = Date.now() - metrics.startTime;
    
    logger.info(`📊 App ${appId} stopped after ${totalRuntime}ms runtime`);
    logger.info(`📊 App ${appId} stats: Memory peak ${metrics.memoryPeak}MB, CPU peak ${metrics.cpuPeak}%, Errors ${metrics.errorCount}, Restarts ${metrics.restartCount}`);
    
    this.emit('app:stopped', appId, {
      runtime: totalRuntime,
      memoryPeak: metrics.memoryPeak,
      cpuPeak: metrics.cpuPeak,
      errorCount: metrics.errorCount,
      restartCount: metrics.restartCount,
      healthScore: metrics.healthScore,
    });
    
    // Keep metrics for a while for analysis
    setTimeout(() => {
      this.appMetrics.delete(appId);
    }, 300000); // 5 minutes
  }

  /**
   * Get performance metrics for an app
   */
  public getAppMetrics(appId: number): AppPerformanceMetrics | null {
    return this.appMetrics.get(appId) || null;
  }

  /**
   * Get overall system performance
   */
  public getSystemPerformance(): {
    uptime: number;
    activeApps: number;
    totalErrors: number;
    averageLoadTime: number;
    memoryUsage: number;
    cpuUsage: number;
    healthScore: number;
    alerts: PerformanceAlert[];
  } {
    const activeApps = this.appMetrics.size;
    const totalErrors = Array.from(this.appMetrics.values())
      .reduce((sum, metrics) => sum + metrics.errorCount, 0);
    
    const loadTimes = Array.from(this.appMetrics.values())
      .map(m => m.loadTime)
      .filter(t => t !== undefined) as number[];
    
    const averageLoadTime = loadTimes.length > 0 
      ? loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length 
      : 0;
    
    const memoryUsage = Array.from(this.appMetrics.values())
      .reduce((sum, metrics) => sum + metrics.memoryPeak, 0);
    
    const cpuUsage = Array.from(this.appMetrics.values())
      .reduce((sum, metrics) => sum + metrics.cpuPeak, 0);
    
    const healthScores = Array.from(this.appMetrics.values())
      .map(m => m.healthScore);
    
    const averageHealthScore = healthScores.length > 0
      ? healthScores.reduce((sum, score) => sum + score, 0) / healthScores.length
      : 100;
    
    return {
      uptime: Date.now() - this.startTime,
      activeApps,
      totalErrors,
      averageLoadTime,
      memoryUsage,
      cpuUsage,
      healthScore: averageHealthScore,
      alerts: this.getRecentAlerts(),
    };
  }

  /**
   * Get performance recommendations
   */
  public getRecommendations(): Array<{
    type: 'optimization' | 'warning' | 'action';
    priority: 'low' | 'medium' | 'high';
    message: string;
    appId?: number;
  }> {
    const recommendations: Array<{
      type: 'optimization' | 'warning' | 'action';
      priority: 'low' | 'medium' | 'high';
      message: string;
      appId?: number;
    }> = [];
    
    // Analyze app metrics for recommendations
    for (const [appId, metrics] of Array.from(this.appMetrics.entries())) {
      // High memory usage
      if (metrics.memoryPeak > this.thresholds.memoryWarning) {
        recommendations.push({
          type: 'optimization',
          priority: metrics.memoryPeak > this.thresholds.memoryCritical ? 'high' : 'medium',
          message: `App ${appId} is using ${metrics.memoryPeak}MB memory. Consider optimizing memory usage.`,
          appId,
        });
      }
      
      // High error rate
      if (metrics.errorCount > 5) {
        recommendations.push({
          type: 'warning',
          priority: 'high',
          message: `App ${appId} has ${metrics.errorCount} errors. Check logs for issues.`,
          appId,
        });
      }
      
      // Multiple restarts
      if (metrics.restartCount > 3) {
        recommendations.push({
          type: 'action',
          priority: 'high',
          message: `App ${appId} has restarted ${metrics.restartCount} times. Investigate stability issues.`,
          appId,
        });
      }
      
      // Low health score
      if (metrics.healthScore < this.thresholds.healthScoreWarning) {
        recommendations.push({
          type: 'warning',
          priority: metrics.healthScore < this.thresholds.healthScoreCritical ? 'high' : 'medium',
          message: `App ${appId} has low health score (${metrics.healthScore}). Consider restarting or debugging.`,
          appId,
        });
      }
      
      // Slow load times
      if (metrics.loadTime && metrics.loadTime > this.thresholds.loadTimeWarning) {
        recommendations.push({
          type: 'optimization',
          priority: metrics.loadTime > this.thresholds.loadTimeCritical ? 'high' : 'medium',
          message: `App ${appId} takes ${metrics.loadTime}ms to load. Consider optimizing startup time.`,
          appId,
        });
      }
    }
    
    // System-wide recommendations
    const systemPerf = this.getSystemPerformance();
    
    if (systemPerf.activeApps > 10) {
      recommendations.push({
        type: 'optimization',
        priority: 'medium',
        message: `${systemPerf.activeApps} apps are running. Consider suspending unused apps to free resources.`,
      });
    }
    
    if (systemPerf.averageLoadTime > this.thresholds.loadTimeWarning) {
      recommendations.push({
        type: 'optimization',
        priority: 'medium',
        message: `Average load time is ${systemPerf.averageLoadTime}ms. Consider optimizing app startup.`,
      });
    }
    
    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Get recent alerts
   */
  public getRecentAlerts(limit = 10): PerformanceAlert[] {
    return this.alerts
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Clear alerts
   */
  public clearAlerts(): void {
    this.alerts = [];
    logger.info('🧹 Performance alerts cleared');
  }

  /**
   * Export performance data
   */
  public exportPerformanceData(): {
    systemPerformance: ReturnType<typeof this.getSystemPerformance>;
    appMetrics: Record<number, AppPerformanceMetrics>;
    snapshots: PerformanceSnapshot[];
    alerts: PerformanceAlert[];
    recommendations: ReturnType<typeof this.getRecommendations>;
  } {
    const appMetricsObj: Record<number, AppPerformanceMetrics> = {};
    for (const [appId, metrics] of Array.from(this.appMetrics.entries())) {
      appMetricsObj[appId] = { ...metrics };
    }
    
    return {
      systemPerformance: this.getSystemPerformance(),
      appMetrics: appMetricsObj,
      snapshots: [...this.snapshots],
      alerts: [...this.alerts],
      recommendations: this.getRecommendations(),
    };
  }

  /**
   * Collect performance snapshot
   */
  private collectPerformanceSnapshot(): void {
    try {
      const memoryUsage = process.memoryUsage();
      const totalMemory = memoryUsage.heapUsed + memoryUsage.external;
      
      const loadTimes: Record<number, number> = {};
      for (const [appId, metrics] of Array.from(this.appMetrics.entries())) {
        if (metrics.loadTime) {
          loadTimes[appId] = metrics.loadTime;
        }
      }
      
      const snapshot: PerformanceSnapshot = {
        timestamp: Date.now(),
        memoryUsage: {
          used: Math.round(totalMemory / 1024 / 1024), // MB
          total: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
          percentage: (totalMemory / memoryUsage.heapTotal) * 100,
        },
        cpuUsage: process.cpuUsage().user / 1000000, // Convert to seconds
        activeApps: this.appMetrics.size,
        loadTimes,
        errors: Array.from(this.appMetrics.values())
          .reduce((sum, metrics) => sum + metrics.errorCount, 0),
      };
      
      this.snapshots.push(snapshot);
      
      // Emit performance update
      this.emit('performance:snapshot', snapshot);
      
    } catch (error) {
      logger.error('❌ Failed to collect performance snapshot:', error);
    }
  }

  /**
   * Analyze performance trends
   */
  private analyzePerformance(): void {
    if (this.snapshots.length < 2) {
      return;
    }
    
    const latest = this.snapshots[this.snapshots.length - 1];
    const previous = this.snapshots[this.snapshots.length - 2];
    
    // Check for performance degradation
    const memoryIncrease = latest.memoryUsage.used - previous.memoryUsage.used;
    const cpuIncrease = latest.cpuUsage - previous.cpuUsage;
    
    if (memoryIncrease > 50) { // 50MB increase
      logger.warn(`⚠️ Memory usage increased by ${memoryIncrease}MB`);
      this.emit('performance:degradation', 'memory', memoryIncrease);
    }
    
    if (cpuIncrease > 20) { // 20% CPU increase
      logger.warn(`⚠️ CPU usage increased by ${cpuIncrease}%`);
      this.emit('performance:degradation', 'cpu', cpuIncrease);
    }
  }

  /**
   * Create performance alert
   */
  private createAlert(
    type: PerformanceAlert['type'],
    severity: PerformanceAlert['severity'],
    message: string,
    appId?: number,
    value?: number,
    threshold?: number
  ): void {
    const alert: PerformanceAlert = {
      type,
      severity,
      message,
      appId,
      value: value || 0,
      threshold: threshold || 0,
      timestamp: Date.now(),
    };
    
    this.alerts.push(alert);
    
    // Limit alerts to prevent memory issues
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-50);
    }
    
    logger.warn(`🚨 Performance alert: ${message}`);
    this.emit('performance:alert', alert);
  }

  /**
   * Calculate error rate for an app
   */
  private calculateErrorRate(appId: number): number {
    const metrics = this.appMetrics.get(appId);
    if (!metrics) {
      return 0;
    }
    
    const runtimeMinutes = (Date.now() - metrics.startTime) / 60000;
    return runtimeMinutes > 0 ? metrics.errorCount / runtimeMinutes : 0;
  }

  /**
   * Update health score for an app
   */
  private updateHealthScore(appId: number): void {
    const metrics = this.appMetrics.get(appId);
    if (!metrics) {
      return;
    }
    
    let score = 100;
    
    // Deduct points for high resource usage
    if (metrics.memoryPeak > this.thresholds.memoryWarning) {
      score -= 20;
    }
    if (metrics.cpuPeak > this.thresholds.cpuWarning) {
      score -= 15;
    }
    
    // Deduct points for errors and restarts
    score -= metrics.errorCount * 5;
    score -= metrics.restartCount * 10;
    
    // Deduct points for slow load times
    if (metrics.loadTime && metrics.loadTime > this.thresholds.loadTimeWarning) {
      score -= 10;
    }
    
    metrics.healthScore = Math.max(0, Math.min(100, score));
    
    // Check health score thresholds
    if (metrics.healthScore < this.thresholds.healthScoreCritical) {
      this.createAlert('health', 'critical', `App ${appId} has critical health score: ${metrics.healthScore}`, appId, metrics.healthScore, this.thresholds.healthScoreCritical);
    } else if (metrics.healthScore < this.thresholds.healthScoreWarning) {
      this.createAlert('health', 'medium', `App ${appId} has low health score: ${metrics.healthScore}`, appId, metrics.healthScore, this.thresholds.healthScoreWarning);
    }
  }

  /**
   * Clean up old performance data
   */
  private cleanupOldData(): void {
    const now = Date.now();
    const maxAge = 3600000; // 1 hour
    
    // Clean up old snapshots
    this.snapshots = this.snapshots.filter(snapshot => 
      now - snapshot.timestamp < maxAge
    );
    
    // Clean up old alerts
    this.alerts = this.alerts.filter(alert => 
      now - alert.timestamp < maxAge
    );
  }

  /**
   * Get performance statistics
   */
  public getStats(): {
    totalApps: number;
    activeApps: number;
    suspendedApps: number;
    averageActiveTime: number;
    totalResumes: number;
    alerts: PerformanceAlert[];
    systemMetrics: {
      totalMemoryUsage: number;
      totalCpuUsage: number;
      averageHealthScore: number;
    };
  } {
    const totalApps = this.appMetrics.size;
    let activeApps = 0;
    let suspendedApps = 0;
    let totalActiveTime = 0;
    let totalResumes = 0;
    let totalMemoryUsage = 0;
    let totalCpuUsage = 0;
    let totalHealthScore = 0;
    
    for (const metrics of this.appMetrics.values()) {
      // All metrics are considered active since they're in the active map
      activeApps++;
      
      totalActiveTime += metrics.totalActiveTime || 0;
      totalResumes += metrics.restartCount;
      totalMemoryUsage += metrics.memoryPeak;
      totalCpuUsage += metrics.cpuPeak;
      totalHealthScore += metrics.healthScore || 0;
    }
    
    return {
      totalApps,
      activeApps,
      suspendedApps,
      averageActiveTime: totalApps > 0 ? totalActiveTime / totalApps : 0,
      totalResumes,
      alerts: [...this.alerts],
      systemMetrics: {
        totalMemoryUsage,
        totalCpuUsage,
        averageHealthScore: totalApps > 0 ? totalHealthScore / totalApps : 0,
      },
    };
  }

  /**
   * Shutdown the performance monitor
   */
  public async shutdown(): Promise<void> {
    logger.info('🔄 Shutting down PerformanceMonitor...');
    
    this.stopMonitoring();
    
    // Export final performance report
    const finalReport = this.exportPerformanceData();
    logger.info('📊 Final performance report:', JSON.stringify(finalReport.systemPerformance, null, 2));
    
    // Clear all data
    this.appMetrics.clear();
    this.snapshots = [];
    this.alerts = [];
    
    logger.info('✅ PerformanceMonitor shutdown complete');
  }
}