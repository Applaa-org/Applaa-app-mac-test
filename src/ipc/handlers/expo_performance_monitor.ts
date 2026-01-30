/**
 * 📊 EXPO PERFORMANCE MONITOR
 * Tracks build times, success rates, and optimization opportunities
 */

import { ipcMain } from 'electron';
import log from 'electron-log';
import { performance } from 'perf_hooks';

const logger = log.scope('expo-perf-monitor');

interface PerformanceMetric {
  appId: number;
  operation: 'create' | 'install' | 'preview' | 'build';
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  error?: string;
  metadata?: any;
}

interface PerformanceStats {
  totalOperations: number;
  successRate: number;
  avgBuildTime: number;
  avgInstallTime: number;
  avgPreviewTime: number;
  commonErrors: { error: string; count: number }[];
  recommendations: string[];
}

class ExpoPerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 1000; // Keep last 1000 metrics

  /**
   * Start tracking an operation
   */
  startOperation(appId: number, operation: PerformanceMetric['operation'], metadata?: any): string {
    const operationId = `${appId}-${operation}-${Date.now()}`;
    
    const metric: PerformanceMetric = {
      appId,
      operation,
      startTime: performance.now(),
      success: false,
      metadata
    };
    
    this.metrics.push(metric);
    this.cleanup();
    
    logger.info(`📊 Started tracking ${operation} for app ${appId}`);
    return operationId;
  }

  /**
   * End tracking an operation
   */
  endOperation(appId: number, operation: PerformanceMetric['operation'], success: boolean, error?: string): void {
    const metric = this.metrics
      .filter(m => m.appId === appId && m.operation === operation && !m.endTime)
      .pop();
    
    if (metric) {
      metric.endTime = performance.now();
      metric.duration = metric.endTime - metric.startTime;
      metric.success = success;
      metric.error = error;
      
      logger.info(`📊 ${operation} for app ${appId}: ${success ? '✅' : '❌'} ${metric.duration.toFixed(2)}ms`);
      
      // Log slow operations
      if (metric.duration > this.getSlowThreshold(operation)) {
        logger.warn(`⚠️ Slow ${operation} detected: ${metric.duration.toFixed(2)}ms (threshold: ${this.getSlowThreshold(operation)}ms)`);
      }
    }
  }

  /**
   * Get performance statistics
   */
  getStats(): PerformanceStats {
    const completedMetrics = this.metrics.filter(m => m.endTime && m.duration);
    
    if (completedMetrics.length === 0) {
      return {
        totalOperations: 0,
        successRate: 0,
        avgBuildTime: 0,
        avgInstallTime: 0,
        avgPreviewTime: 0,
        commonErrors: [],
        recommendations: []
      };
    }
    
    const successCount = completedMetrics.filter(m => m.success).length;
    const successRate = (successCount / completedMetrics.length) * 100;
    
    const buildMetrics = completedMetrics.filter(m => m.operation === 'build');
    const installMetrics = completedMetrics.filter(m => m.operation === 'install');
    const previewMetrics = completedMetrics.filter(m => m.operation === 'preview');
    
    const avgBuildTime = this.calculateAverage(buildMetrics.map(m => m.duration!));
    const avgInstallTime = this.calculateAverage(installMetrics.map(m => m.duration!));
    const avgPreviewTime = this.calculateAverage(previewMetrics.map(m => m.duration!));
    
    // Analyze common errors
    const errorCounts = new Map<string, number>();
    completedMetrics.filter(m => !m.success && m.error).forEach(m => {
      const error = m.error!;
      errorCounts.set(error, (errorCounts.get(error) || 0) + 1);
    });
    
    const commonErrors = Array.from(errorCounts.entries())
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    const recommendations = this.generateRecommendations(completedMetrics);
    
    return {
      totalOperations: completedMetrics.length,
      successRate: Math.round(successRate * 100) / 100,
      avgBuildTime: Math.round(avgBuildTime),
      avgInstallTime: Math.round(avgInstallTime),
      avgPreviewTime: Math.round(avgPreviewTime),
      commonErrors,
      recommendations
    };
  }

  /**
   * Get recent metrics for debugging
   */
  getRecentMetrics(limit = 50): PerformanceMetric[] {
    return this.metrics
      .filter(m => m.endTime)
      .sort((a, b) => (b.endTime || 0) - (a.endTime || 0))
      .slice(0, limit);
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
    logger.info('📊 Performance metrics cleared');
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(metrics: PerformanceMetric[]): string[] {
    const recommendations: string[] = [];
    
    const installMetrics = metrics.filter(m => m.operation === 'install');
    const avgInstallTime = this.calculateAverage(installMetrics.map(m => m.duration!));
    
    if (avgInstallTime > 120000) { // 2 minutes
      recommendations.push('Consider enabling pnpm workspace for faster dependency installation');
    }
    
    const failedInstalls = installMetrics.filter(m => !m.success).length;
    if (failedInstalls > installMetrics.length * 0.2) { // 20% failure rate
      recommendations.push('High dependency installation failure rate - check network connectivity and package versions');
    }
    
    const previewMetrics = metrics.filter(m => m.operation === 'preview');
    const avgPreviewTime = this.calculateAverage(previewMetrics.map(m => m.duration!));
    
    if (avgPreviewTime > 60000) { // 1 minute
      recommendations.push('Preview startup is slow - consider implementing Metro cache warming');
    }
    
    const errorMetrics = metrics.filter(m => !m.success);
    const portErrors = errorMetrics.filter(m => m.error?.includes('port') || m.error?.includes('EADDRINUSE')).length;
    
    if (portErrors > 0) {
      recommendations.push('Port conflicts detected - implement better port allocation strategy');
    }
    
    return recommendations;
  }

  /**
   * Calculate average of numbers
   */
  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  }

  /**
   * Get slow operation threshold
   */
  private getSlowThreshold(operation: PerformanceMetric['operation']): number {
    switch (operation) {
      case 'create': return 10000; // 10 seconds
      case 'install': return 120000; // 2 minutes
      case 'preview': return 60000; // 1 minute
      case 'build': return 30000; // 30 seconds
      default: return 30000;
    }
  }

  /**
   * Cleanup old metrics
   */
  private cleanup(): void {
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }
}

// Export singleton instance
export const expoPerformanceMonitor = new ExpoPerformanceMonitor();

export function registerExpoPerformanceMonitor() {

  // Get performance statistics
  ipcMain.handle("expo-perf:get-stats", async () => {
    return expoPerformanceMonitor.getStats();
  });

  // Get recent metrics
  ipcMain.handle("expo-perf:get-recent", async (_, params: { limit?: number } = {}) => {
    return expoPerformanceMonitor.getRecentMetrics(params.limit);
  });

  // Clear metrics
  ipcMain.handle("expo-perf:clear", async () => {
    expoPerformanceMonitor.clear();
    return { success: true };
  });
}

