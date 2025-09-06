import log from "electron-log";

const logger = log.scope("performance");

export interface PerformanceMetric {
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, PerformanceMetric> = new Map();
  private completedMetrics: PerformanceMetric[] = [];

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startOperation(operationId: string, operationName: string, metadata?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      operation: operationName,
      startTime: performance.now(),
      metadata,
    };
    
    this.metrics.set(operationId, metric);
    logger.info(`🚀 [PERF] Started: ${operationName} (ID: ${operationId})`);
  }

  endOperation(operationId: string, additionalMetadata?: Record<string, any>): number | null {
    const metric = this.metrics.get(operationId);
    if (!metric) {
      logger.warn(`⚠️ [PERF] Operation not found: ${operationId}`);
      return null;
    }

    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;
    
    if (additionalMetadata) {
      metric.metadata = { ...metric.metadata, ...additionalMetadata };
    }

    this.completedMetrics.push(metric);
    this.metrics.delete(operationId);

    logger.info(`✅ [PERF] Completed: ${metric.operation} in ${metric.duration.toFixed(2)}ms (ID: ${operationId})`);
    
    return metric.duration;
  }

  getMetrics(): PerformanceMetric[] {
    return [...this.completedMetrics];
  }

  getActiveOperations(): PerformanceMetric[] {
    return Array.from(this.metrics.values());
  }

  generateReport(): string {
    const completed = this.completedMetrics;
    const active = Array.from(this.metrics.values());

    let report = `📊 [PERF] Performance Report (${new Date().toISOString()})\n`;
    report += `═══════════════════════════════════════════════════════════\n`;

    if (completed.length > 0) {
      report += `\n✅ COMPLETED OPERATIONS (${completed.length}):\n`;
      completed
        .sort((a, b) => (b.duration || 0) - (a.duration || 0))
        .slice(0, 10) // Top 10 slowest
        .forEach((metric, index) => {
          report += `${index + 1}. ${metric.operation}: ${metric.duration?.toFixed(2)}ms\n`;
          if (metric.metadata) {
            Object.entries(metric.metadata).forEach(([key, value]) => {
              report += `   └─ ${key}: ${value}\n`;
            });
          }
        });
    }

    if (active.length > 0) {
      report += `\n⏳ ACTIVE OPERATIONS (${active.length}):\n`;
      active.forEach((metric, index) => {
        const elapsed = performance.now() - metric.startTime;
        report += `${index + 1}. ${metric.operation}: ${elapsed.toFixed(2)}ms (running)\n`;
      });
    }

    report += `\n📈 SUMMARY:\n`;
    report += `   Total Completed: ${completed.length}\n`;
    report += `   Currently Active: ${active.length}\n`;
    
    if (completed.length > 0) {
      const totalTime = completed.reduce((sum, m) => sum + (m.duration || 0), 0);
      const avgTime = totalTime / completed.length;
      report += `   Average Duration: ${avgTime.toFixed(2)}ms\n`;
      report += `   Total Time: ${totalTime.toFixed(2)}ms\n`;
    }

    return report;
  }

  clearMetrics(): void {
    this.completedMetrics = [];
    this.metrics.clear();
    logger.info(`🧹 [PERF] Cleared all metrics`);
  }
}

// Convenience functions
export const perfMonitor = PerformanceMonitor.getInstance();

export function startPerf(operationId: string, operationName: string, metadata?: Record<string, any>): void {
  perfMonitor.startOperation(operationId, operationName, metadata);
}

export function endPerf(operationId: string, additionalMetadata?: Record<string, any>): number | null {
  return perfMonitor.endOperation(operationId, additionalMetadata);
}

export function logPerfReport(): void {
  logger.info(perfMonitor.generateReport());
}

