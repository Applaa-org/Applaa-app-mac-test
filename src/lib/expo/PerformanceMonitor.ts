/**
 * 📊 Performance Monitor for Expo Builds
 * Real-time monitoring and analytics for build performance optimization
 */

import log from 'electron-log';
import os from 'os';
import { performance } from 'perf_hooks';

const logger = log.scope('PerformanceMonitor');

export interface BuildMetrics {
  appId: number;
  buildId: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  phases: BuildPhaseMetrics[];
  resourceUsage: ResourceUsage;
  errors: BuildError[];
  success: boolean;
}

export interface BuildPhaseMetrics {
  phase: BuildPhase;
  startTime: number;
  endTime?: number;
  duration?: number;
  memoryUsage: number;
  cpuUsage: number;
  diskIO: number;
  networkIO: number;
}

export interface ResourceUsage {
  peakMemory: number;
  averageMemory: number;
  peakCPU: number;
  averageCPU: number;
  diskRead: number;
  diskWrite: number;
  networkIn: number;
  networkOut: number;
}

export interface BuildError {
  timestamp: number;
  phase: BuildPhase;
  error: string;
  stack?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface PerformanceReport {
  appId: number;
  averageBuildTime: number;
  buildTimeHistory: number[];
  bottlenecks: Bottleneck[];
  optimizationSuggestions: OptimizationSuggestion[];
  comparisonWithSimilarApps: PerformanceComparison;
  trends: PerformanceTrend[];
}

export interface Bottleneck {
  phase: BuildPhase;
  avgDuration: number;
  impactScore: number;
  suggestions: string[];
}

export interface OptimizationSuggestion {
  type: 'cache' | 'dependency' | 'resource' | 'configuration';
  title: string;
  description: string;
  estimatedSavings: number; // milliseconds
  difficulty: 'easy' | 'medium' | 'hard';
  impact: 'low' | 'medium' | 'high';
}

export interface PerformanceComparison {
  percentile: number; // 0-100, where this app ranks
  averageForSimilarApps: number;
  bestInClass: number;
  improvementPotential: number;
}

export interface PerformanceTrend {
  metric: string;
  direction: 'improving' | 'degrading' | 'stable';
  changePercent: number;
  timeframe: string;
}

export type BuildPhase = 
  | 'initialization'
  | 'dependency-install'
  | 'dependency-resolution'
  | 'metro-bundling'
  | 'expo-compilation'
  | 'server-startup'
  | 'tunnel-setup'
  | 'complete';

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private activeBuilds = new Map<string, BuildMetrics>();
  private buildHistory = new Map<number, BuildMetrics[]>();
  private resourceMonitors = new Map<string, NodeJS.Timeout>();

  private constructor() {
    this.startSystemMonitoring();
  }

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * 🚀 Start monitoring a new build
   */
  startBuildMonitoring(appId: number, buildOptions?: any): string {
    const buildId = `${appId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = performance.now();

    const buildMetrics: BuildMetrics = {
      appId,
      buildId,
      startTime,
      phases: [],
      resourceUsage: this.initializeResourceUsage(),
      errors: [],
      success: false
    };

    this.activeBuilds.set(buildId, buildMetrics);
    this.startResourceMonitoring(buildId);

    logger.info(`📊 Started performance monitoring for build ${buildId}`);
    return buildId;
  }

  /**
   * 📈 Track a build phase
   */
  trackBuildPhase(buildId: string, phase: BuildPhase): void {
    const build = this.activeBuilds.get(buildId);
    if (!build) {
      logger.warn(`Build ${buildId} not found for phase tracking`);
      return;
    }

    const now = performance.now();

    // End previous phase if exists
    const lastPhase = build.phases[build.phases.length - 1];
    if (lastPhase && !lastPhase.endTime) {
      lastPhase.endTime = now;
      lastPhase.duration = lastPhase.endTime - lastPhase.startTime;
    }

    // Start new phase
    const phaseMetrics: BuildPhaseMetrics = {
      phase,
      startTime: now,
      memoryUsage: this.getCurrentMemoryUsage(),
      cpuUsage: this.getCurrentCPUUsage(),
      diskIO: 0, // Will be updated by resource monitor
      networkIO: 0 // Will be updated by resource monitor
    };

    build.phases.push(phaseMetrics);
    logger.debug(`📊 Phase ${phase} started for build ${buildId}`);
  }

  /**
   * ❌ Track build error
   */
  trackBuildError(buildId: string, error: string, phase?: BuildPhase, severity: BuildError['severity'] = 'medium'): void {
    const build = this.activeBuilds.get(buildId);
    if (!build) return;

    const buildError: BuildError = {
      timestamp: performance.now(),
      phase: phase || build.phases[build.phases.length - 1]?.phase || 'initialization',
      error,
      severity
    };

    build.errors.push(buildError);
    logger.error(`❌ Build error in ${buildError.phase}:`, error);
  }

  /**
   * ✅ Complete build monitoring
   */
  completeBuildMonitoring(buildId: string, success: boolean = true): BuildMetrics | null {
    const build = this.activeBuilds.get(buildId);
    if (!build) {
      logger.warn(`Build ${buildId} not found for completion`);
      return null;
    }

    const endTime = performance.now();
    build.endTime = endTime;
    build.duration = endTime - build.startTime;
    build.success = success;

    // End last phase
    const lastPhase = build.phases[build.phases.length - 1];
    if (lastPhase && !lastPhase.endTime) {
      lastPhase.endTime = endTime;
      lastPhase.duration = lastPhase.endTime - lastPhase.startTime;
    }

    // Stop resource monitoring
    this.stopResourceMonitoring(buildId);

    // Store in history
    if (!this.buildHistory.has(build.appId)) {
      this.buildHistory.set(build.appId, []);
    }
    this.buildHistory.get(build.appId)!.push(build);

    // Keep only last 50 builds per app
    const history = this.buildHistory.get(build.appId)!;
    if (history.length > 50) {
      history.splice(0, history.length - 50);
    }

    // Remove from active builds
    this.activeBuilds.delete(buildId);

    logger.info(`✅ Build ${buildId} completed in ${build.duration?.toFixed(2)}ms (success: ${success})`);
    return build;
  }

  /**
   * 📊 Generate performance report for an app
   */
  async generatePerformanceReport(appId: number): Promise<PerformanceReport> {
    const history = this.buildHistory.get(appId) || [];
    
    if (history.length === 0) {
      return this.generateEmptyReport(appId);
    }

    const buildTimes = history.map(build => build.duration || 0).filter(time => time > 0);
    const averageBuildTime = buildTimes.reduce((sum, time) => sum + time, 0) / buildTimes.length;

    const bottlenecks = this.identifyBottlenecks(history);
    const optimizationSuggestions = this.generateOptimizationSuggestions(history, bottlenecks);
    const comparison = await this.compareWithSimilarApps(appId, averageBuildTime);
    const trends = this.analyzeTrends(history);

    return {
      appId,
      averageBuildTime,
      buildTimeHistory: buildTimes.slice(-20), // Last 20 builds
      bottlenecks,
      optimizationSuggestions,
      comparisonWithSimilarApps: comparison,
      trends
    };
  }

  /**
   * 🔮 Predict build time based on historical data and current conditions
   */
  async predictBuildTime(appId: number, factors: PredictionFactors = {}): Promise<number> {
    const history = this.buildHistory.get(appId) || [];
    
    if (history.length < 3) {
      // Not enough data for prediction, return conservative estimate
      return 60000; // 60 seconds
    }

    const recentBuilds = history.slice(-10); // Last 10 builds
    const averageTime = recentBuilds.reduce((sum, build) => sum + (build.duration || 0), 0) / recentBuilds.length;

    // Apply factors
    let prediction = averageTime;

    if (factors.hasFileChanges) {
      prediction *= 0.8; // Incremental builds are faster
    }

    if (factors.dependencyChanges) {
      prediction *= 1.5; // Dependency changes slow things down
    }

    if (factors.systemLoad && factors.systemLoad > 0.8) {
      prediction *= 1.3; // High system load slows builds
    }

    if (factors.cacheHit) {
      prediction *= 0.3; // Cache hits are much faster
    }

    return Math.max(prediction, 5000); // Minimum 5 seconds
  }

  /**
   * 🔍 Identify performance bottlenecks
   */
  private identifyBottlenecks(history: BuildMetrics[]): Bottleneck[] {
    const phaseStats = new Map<BuildPhase, { durations: number[], count: number }>();

    // Collect phase duration statistics
    for (const build of history) {
      for (const phase of build.phases) {
        if (!phase.duration) continue;

        if (!phaseStats.has(phase.phase)) {
          phaseStats.set(phase.phase, { durations: [], count: 0 });
        }

        const stats = phaseStats.get(phase.phase)!;
        stats.durations.push(phase.duration);
        stats.count++;
      }
    }

    // Calculate bottlenecks
    const bottlenecks: Bottleneck[] = [];

    for (const [phase, stats] of phaseStats.entries()) {
      const avgDuration = stats.durations.reduce((sum, d) => sum + d, 0) / stats.durations.length;
      
      // Consider a phase a bottleneck if it takes more than 20% of total build time on average
      const impactScore = avgDuration / 60000; // Normalize to expected 60s build
      
      if (impactScore > 0.2) {
        bottlenecks.push({
          phase,
          avgDuration,
          impactScore,
          suggestions: this.getBottleneckSuggestions(phase, avgDuration)
        });
      }
    }

    return bottlenecks.sort((a, b) => b.impactScore - a.impactScore);
  }

  /**
   * 💡 Generate optimization suggestions
   */
  private generateOptimizationSuggestions(history: BuildMetrics[], bottlenecks: Bottleneck[]): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // Cache-based suggestions
    if (bottlenecks.some(b => b.phase === 'dependency-install')) {
      suggestions.push({
        type: 'cache',
        title: 'Enable Dependency Caching',
        description: 'Cache node_modules to skip dependency installation for unchanged packages',
        estimatedSavings: 30000,
        difficulty: 'easy',
        impact: 'high'
      });
    }

    // Resource-based suggestions
    const avgMemoryUsage = history.reduce((sum, build) => sum + build.resourceUsage.averageMemory, 0) / history.length;
    if (avgMemoryUsage > 1000) { // > 1GB
      suggestions.push({
        type: 'resource',
        title: 'Optimize Memory Usage',
        description: 'Close other applications during builds to free up memory',
        estimatedSavings: 10000,
        difficulty: 'easy',
        impact: 'medium'
      });
    }

    // Configuration-based suggestions
    if (bottlenecks.some(b => b.phase === 'metro-bundling')) {
      suggestions.push({
        type: 'configuration',
        title: 'Optimize Metro Configuration',
        description: 'Enable Metro caching and optimize resolver configuration',
        estimatedSavings: 15000,
        difficulty: 'medium',
        impact: 'medium'
      });
    }

    return suggestions.sort((a, b) => {
      const impactWeight = { low: 1, medium: 2, high: 3 };
      const difficultyWeight = { easy: 3, medium: 2, hard: 1 };
      
      const scoreA = impactWeight[a.impact] * difficultyWeight[a.difficulty];
      const scoreB = impactWeight[b.impact] * difficultyWeight[b.difficulty];
      
      return scoreB - scoreA;
    });
  }

  /**
   * 🔄 Resource monitoring helpers
   */
  private startResourceMonitoring(buildId: string): void {
    const monitor = setInterval(() => {
      const build = this.activeBuilds.get(buildId);
      if (!build) {
        clearInterval(monitor);
        return;
      }

      // Update current resource usage
      const currentMemory = this.getCurrentMemoryUsage();
      const currentCPU = this.getCurrentCPUUsage();

      build.resourceUsage.peakMemory = Math.max(build.resourceUsage.peakMemory, currentMemory);
      build.resourceUsage.peakCPU = Math.max(build.resourceUsage.peakCPU, currentCPU);

      // Update current phase if active
      const currentPhase = build.phases[build.phases.length - 1];
      if (currentPhase && !currentPhase.endTime) {
        currentPhase.memoryUsage = Math.max(currentPhase.memoryUsage, currentMemory);
        currentPhase.cpuUsage = Math.max(currentPhase.cpuUsage, currentCPU);
      }
    }, 1000); // Monitor every second

    this.resourceMonitors.set(buildId, monitor);
  }

  private stopResourceMonitoring(buildId: string): void {
    const monitor = this.resourceMonitors.get(buildId);
    if (monitor) {
      clearInterval(monitor);
      this.resourceMonitors.delete(buildId);
    }
  }

  private getCurrentMemoryUsage(): number {
    return process.memoryUsage().heapUsed / 1024 / 1024; // MB
  }

  private getCurrentCPUUsage(): number {
    // Simplified CPU usage - in production would use more sophisticated monitoring
    const cpus = os.cpus();
    return cpus.reduce((sum, cpu) => {
      const total = Object.values(cpu.times).reduce((acc, time) => acc + time, 0);
      const idle = cpu.times.idle;
      return sum + (1 - idle / total) * 100;
    }, 0) / cpus.length;
  }

  private initializeResourceUsage(): ResourceUsage {
    return {
      peakMemory: 0,
      averageMemory: 0,
      peakCPU: 0,
      averageCPU: 0,
      diskRead: 0,
      diskWrite: 0,
      networkIn: 0,
      networkOut: 0
    };
  }

  private startSystemMonitoring(): void {
    // Global system monitoring for overall performance insights
    setInterval(() => {
      const memoryUsage = this.getCurrentMemoryUsage();
      const cpuUsage = this.getCurrentCPUUsage();
      
      if (memoryUsage > 2000) { // > 2GB
        logger.warn(`High memory usage detected: ${memoryUsage.toFixed(2)}MB`);
      }
      
      if (cpuUsage > 90) {
        logger.warn(`High CPU usage detected: ${cpuUsage.toFixed(2)}%`);
      }
    }, 30000); // Check every 30 seconds
  }

  private getBottleneckSuggestions(phase: BuildPhase, avgDuration: number): string[] {
    const suggestions: string[] = [];

    switch (phase) {
      case 'dependency-install':
        suggestions.push('Enable dependency caching');
        suggestions.push('Use faster package manager (pnpm)');
        suggestions.push('Remove unused dependencies');
        break;
      case 'metro-bundling':
        suggestions.push('Enable Metro caching');
        suggestions.push('Optimize resolver configuration');
        suggestions.push('Reduce bundle size');
        break;
      case 'tunnel-setup':
        suggestions.push('Use LAN mode instead of tunnel when possible');
        suggestions.push('Check network connectivity');
        break;
      default:
        suggestions.push('Monitor resource usage during this phase');
    }

    return suggestions;
  }

  private async compareWithSimilarApps(appId: number, averageBuildTime: number): Promise<PerformanceComparison> {
    // In a real implementation, this would compare with anonymized data from other apps
    // For now, return mock comparison data
    return {
      percentile: Math.min(95, Math.max(5, 100 - (averageBuildTime / 600))), // Rough calculation
      averageForSimilarApps: 45000, // 45 seconds
      bestInClass: 15000, // 15 seconds
      improvementPotential: Math.max(0, averageBuildTime - 15000)
    };
  }

  private analyzeTrends(history: BuildMetrics[]): PerformanceTrend[] {
    if (history.length < 5) return [];

    const trends: PerformanceTrend[] = [];
    const recentBuilds = history.slice(-10);
    const olderBuilds = history.slice(-20, -10);

    if (olderBuilds.length > 0) {
      const recentAvg = recentBuilds.reduce((sum, b) => sum + (b.duration || 0), 0) / recentBuilds.length;
      const olderAvg = olderBuilds.reduce((sum, b) => sum + (b.duration || 0), 0) / olderBuilds.length;
      
      const changePercent = ((recentAvg - olderAvg) / olderAvg) * 100;
      
      trends.push({
        metric: 'Build Time',
        direction: changePercent < -5 ? 'improving' : changePercent > 5 ? 'degrading' : 'stable',
        changePercent: Math.abs(changePercent),
        timeframe: 'Last 10 builds'
      });
    }

    return trends;
  }

  private generateEmptyReport(appId: number): PerformanceReport {
    return {
      appId,
      averageBuildTime: 0,
      buildTimeHistory: [],
      bottlenecks: [],
      optimizationSuggestions: [
        {
          type: 'cache',
          title: 'Enable Build Caching',
          description: 'Set up build caching to improve future build times',
          estimatedSavings: 30000,
          difficulty: 'easy',
          impact: 'high'
        }
      ],
      comparisonWithSimilarApps: {
        percentile: 50,
        averageForSimilarApps: 45000,
        bestInClass: 15000,
        improvementPotential: 30000
      },
      trends: []
    };
  }
}

export interface PredictionFactors {
  hasFileChanges?: boolean;
  dependencyChanges?: boolean;
  systemLoad?: number; // 0-1
  cacheHit?: boolean;
  networkSpeed?: number; // Mbps
}


