/**
 * 🎛️ PREVIEW CONTROL PLANE
 * 
 * Inspired by @quests/shim-client architecture
 * Manages app lifecycle with:
 * - Process orchestration
 * - Port management
 * - Health monitoring
 * - Resource coordination
 */

import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as net from 'net';
import log from 'electron-log';
import {
  PreviewManagerConfig,
  PreviewConnection,
  PreviewResource,
  APP_TYPE_CONFIGS,
  PortAllocationError,
} from './types';
import { AppType, AppState, AppPriority } from './types-simple';
import { AppLifecycleManager } from './AppLifecycleManager';
import { ResourceManager } from './ResourceManager';

const logger = log.scope('preview-control-plane');

interface AppProcess {
  appId: number;
  appType: AppType;
  process: ChildProcess;
  ports: number[];
  startTime: number;
  lastHealthCheck: number;
  connections: PreviewConnection[];
  resource: PreviewResource;
  suspended: boolean;
}

/**
 * PreviewControlPlane - Orchestrates app processes and resources
 * 
 * Key responsibilities:
 * 1. Process lifecycle management (start, stop, suspend, resume)
 * 2. Port allocation and management
 * 3. Health monitoring and recovery
 * 4. Resource tracking and optimization
 * 5. Inter-process communication
 */
export class PreviewControlPlane extends EventEmitter {
  private config: PreviewManagerConfig;
  private processes = new Map<number, AppProcess>();
  private allocatedPorts = new Set<number>();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;
  private lifecycleManager?: AppLifecycleManager;
  private resourceManager?: ResourceManager;
  private performanceMetrics = new Map<number, {
    startTime: number;
    loadTime?: number;
    resourceUsage: {
      cpu: number;
      memory: number;
      timestamp: number;
    }[];
  }>();

  constructor(
    config: PreviewManagerConfig,
    lifecycleManager?: AppLifecycleManager,
    resourceManager?: ResourceManager
  ) {
    super();
    this.config = config;
    this.lifecycleManager = lifecycleManager;
    this.resourceManager = resourceManager;
    
    // Setup lifecycle event handlers
    this.setupLifecycleHandlers();
    
    logger.info('🎛️ PreviewControlPlane initialized');
  }

  /**
   * Setup lifecycle event handlers
   */
  private setupLifecycleHandlers(): void {
    if (this.lifecycleManager) {
      this.lifecycleManager.on('app:suspend-requested', (appId: number) => {
        this.handleSuspendRequest(appId);
      });
      
      this.lifecycleManager.on('app:resume-requested', (appId: number) => {
        this.handleResumeRequest(appId);
      });
      
      this.lifecycleManager.on('app:terminate-requested', (appId: number) => {
        this.handleTerminateRequest(appId);
      });
    }
  }

  /**
   * Initialize the control plane
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      logger.info('🔧 Initializing PreviewControlPlane...');
      
      // Start health monitoring
      this.startHealthMonitoring();
      
      this.isInitialized = true;
      logger.info('✅ PreviewControlPlane initialized successfully');
      
    } catch (error) {
      logger.error('❌ Failed to initialize PreviewControlPlane:', error);
      throw error;
    }
  }

  /**
   * Start an app process
   */
  public async startApp(appId: number, appType: AppType, options: any = {}): Promise<void> {
    try {
      const startTime = Date.now();
      
      // Initialize performance metrics
      this.performanceMetrics.set(appId, {
        startTime,
        resourceUsage: []
      });
      
      logger.info(`🚀 Starting app ${appId} (type: ${appType})`);
      
      // Check if already running
      if (this.processes.has(appId)) {
        throw new Error(`App ${appId} is already running`);
      }
      
      // Check resource availability
      if (this.resourceManager) {
        const canStart = await this.resourceManager.canStartApp(appId, appType);
        if (!canStart) {
          throw new Error(`Insufficient resources to start app ${appId}`);
        }
      }
      
      const appConfig = APP_TYPE_CONFIGS[appType];
      
      // Allocate ports based on app requirements
      const requiredPorts = appConfig.requiredPorts || 1;
      const ports = await this.allocatePorts(appId, requiredPorts);
      
      // Register app with lifecycle manager
      if (this.lifecycleManager) {
        await this.lifecycleManager.registerApp(appId, appType, 'normal');
        await this.lifecycleManager.transitionTo(appId, 'loading');
      }
      
      // Prepare environment
      const env = await this.prepareEnvironment(appId, appType, ports, options);
      
      // Start the process
      const process = await this.spawnProcess(appId, appType, env, options);
      
      // Create app process record
      const appProcess: AppProcess = {
        appId,
        appType,
        process,
        ports,
        startTime: Date.now(),
        lastHealthCheck: Date.now(),
        connections: [],
        resource: {
          appId,
          port: ports[0],
          process: process,
          connections: [],
          lastAccessed: Date.now(),
          isActive: true,
          resourceUsage: {
            memory: 0,
            cpu: 0,
          },
        },
        suspended: false,
      };
      
      this.processes.set(appId, appProcess);
      
      // Register with resource manager
      if (this.resourceManager) {
        await this.resourceManager.registerApp(appId, appType);
      }
      
      // Setup process event handlers
      this.setupProcessHandlers(appProcess);
      
      // Wait for app to be ready
      await this.waitForAppReady(appProcess);
      
      // Record load time
      const loadTime = Date.now() - startTime;
      const metrics = this.performanceMetrics.get(appId);
      if (metrics) {
        metrics.loadTime = loadTime;
      }
      
      // Transition to active state
      if (this.lifecycleManager) {
        await this.lifecycleManager.transitionTo(appId, 'active');
      }
      
      logger.info(`✅ App ${appId} started successfully (load time: ${loadTime}ms)`);
      
    } catch (error) {
      logger.error(`❌ Failed to start app ${appId}:`, error);
      
      // Cleanup on failure
      await this.cleanupFailedStart(appId);
      
      throw new Error(`Failed to start app ${appId}: ${error.message}`);
    }
  }

  /**
   * Handle suspend request from lifecycle manager
   */
  private async handleSuspendRequest(appId: number): Promise<void> {
    try {
      await this.suspendApp(appId);
    } catch (error) {
      logger.error(`❌ Failed to handle suspend request for app ${appId}:`, error);
    }
  }

  /**
   * Handle resume request from lifecycle manager
   */
  private async handleResumeRequest(appId: number): Promise<void> {
    try {
      await this.resumeApp(appId);
    } catch (error) {
      logger.error(`❌ Failed to handle resume request for app ${appId}:`, error);
    }
  }

  /**
   * Handle terminate request from lifecycle manager
   */
  private async handleTerminateRequest(appId: number): Promise<void> {
    try {
      await this.stopApp(appId);
    } catch (error) {
      logger.error(`❌ Failed to handle terminate request for app ${appId}:`, error);
    }
  }

  /**
   * Stop an app process
   */
  public async stopApp(appId: number, cleanup: boolean = true): Promise<void> {
    try {
      const appProcess = this.processes.get(appId);
      if (!appProcess) {
        logger.warn(`⚠️ No process found for app ${appId}`);
        return;
      }
      
      logger.info(`🛑 Stopping app ${appId}`);
      
      // Transition to terminating state
      if (this.lifecycleManager) {
        await this.lifecycleManager.transitionTo(appId, 'terminated');
      }
      
      // Graceful shutdown first
      if (appProcess.process && !appProcess.process.killed) {
        appProcess.process.kill('SIGTERM');
        
        // Wait for graceful shutdown
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => {
            // Force kill if not gracefully stopped
            if (!appProcess.process.killed) {
              logger.warn(`⚠️ Force killing app ${appId}`);
              appProcess.process.kill('SIGKILL');
            }
            resolve();
          }, 5000);
          
          appProcess.process.once('exit', () => {
            clearTimeout(timeout);
            resolve();
          });
        });
      }
      
      // Cleanup resources
      if (cleanup) {
        await this.cleanupAppResources(appProcess);
      }
      
      // Unregister from managers
      if (this.lifecycleManager) {
        await this.lifecycleManager.unregisterApp(appId);
      }
      if (this.resourceManager) {
        await this.resourceManager.unregisterApp(appId);
      }
      
      // Clean up performance metrics
      this.performanceMetrics.delete(appId);
      
      // Remove from processes map
      this.processes.delete(appId);
      
      logger.info(`✅ App ${appId} stopped successfully`);
      
    } catch (error) {
      logger.error(`❌ Failed to stop app ${appId}:`, error);
      throw error;
    }
  }

  /**
   * Suspend an app process
   */
  public async suspendApp(appId: number): Promise<void> {
    try {
      const appProcess = this.processes.get(appId);
      if (!appProcess) {
        throw new Error(`No process found for app ${appId}`);
      }
      
      logger.info(`😴 Suspending app ${appId}`);
      
      // Transition to suspended state
      if (this.lifecycleManager) {
        await this.lifecycleManager.transitionTo(appId, 'suspended');
      }
      
      // Send suspend signal (SIGSTOP)
      if (appProcess.process && !appProcess.process.killed) {
        appProcess.process.kill('SIGSTOP');
      }
      
      appProcess.suspended = true;
      
      // Update resource manager
      if (this.resourceManager) {
        await this.resourceManager.suspendApp(appId);
      }
      
      this.emit('app:suspended', appId);
      
    } catch (error) {
      logger.error(`❌ Failed to suspend app ${appId}:`, error);
      throw error;
    }
  }

  /**
   * Resume a suspended app process
   */
  public async resumeApp(appId: number): Promise<void> {
    try {
      const appProcess = this.processes.get(appId);
      if (!appProcess) {
        throw new Error(`No process found for app ${appId}`);
      }
      
      if (!appProcess.suspended) {
        logger.warn(`⚠️ App ${appId} is not suspended`);
        return;
      }
      
      logger.info(`🔄 Resuming app ${appId}`);
      
      // Transition to active state
      if (this.lifecycleManager) {
        await this.lifecycleManager.transitionTo(appId, 'active');
      }
      
      // Send resume signal (SIGCONT)
      if (appProcess.process && !appProcess.process.killed) {
        appProcess.process.kill('SIGCONT');
      }
      
      appProcess.suspended = false;
      appProcess.resource.lastAccessed = Date.now();
      
      // Update resource manager
      if (this.resourceManager) {
        await this.resourceManager.resumeApp(appId);
      }
      
      // Wait for app to be ready again
      await this.waitForAppReady(appProcess);
      
      this.emit('app:resumed', appId);
      
    } catch (error) {
      logger.error(`❌ Failed to resume app ${appId}:`, error);
      throw error;
    }
  }

  /**
   * Get system metrics
   */
  public getSystemMetrics() {
    const activeProcesses = Array.from(this.processes.values()).filter(p => !p.suspended);
    const suspendedProcesses = Array.from(this.processes.values()).filter(p => p.suspended);
    
    return {
      totalMemoryUsage: activeProcesses.reduce((sum, p) => sum + p.resource.resourceUsage.memory, 0),
      totalCpuUsage: activeProcesses.reduce((sum, p) => sum + p.resource.resourceUsage.cpu, 0),
      activeAppCount: activeProcesses.length,
      suspendedAppCount: suspendedProcesses.length,
    };
  }

  /**
   * Allocate ports for an app
   */
  private async allocatePorts(appId: number, requiredPorts: number): Promise<number[]> {
    const ports: number[] = [];
    
    for (let i = 0; i < requiredPorts; i++) {
      const port = await this.findAvailablePort();
      if (!port) {
        // Cleanup already allocated ports
        ports.forEach(p => this.allocatedPorts.delete(p));
        throw new PortAllocationError(appId, [3000, 9000]);
      }
      
      ports.push(port);
      this.allocatedPorts.add(port);
    }
    
    logger.info(`🔌 Allocated ports for app ${appId}: ${ports.join(', ')}`);
    return ports;
  }

  /**
   * Find an available port
   */
  private async findAvailablePort(startPort: number = 3000): Promise<number | null> {
    for (let port = startPort; port <= startPort + 1000; port++) {
      if (this.allocatedPorts.has(port)) {
        continue;
      }
      
      if (await this.isPortAvailable(port)) {
        return port;
      }
    }
    
    return null;
  }

  /**
   * Check if a port is available
   */
  private async isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = net.createServer();
      
      server.listen(port, () => {
        server.close(() => resolve(true));
      });
      
      server.on('error', () => resolve(false));
    });
  }

  /**
   * Prepare environment for app startup
   */
  private async prepareEnvironment(
    appId: number,
    appType: AppType,
    ports: number[],
    options: any
  ): Promise<Record<string, string>> {
    const env = { ...process.env };
    const appConfig = APP_TYPE_CONFIGS[appType];
    
    // Set port environment variables
    if (ports.length > 0) {
      env.PORT = ports[0].toString();
      env.DEV_SERVER_PORT = ports[0].toString();
    }
    
    // App-specific environment setup
    switch (appType) {
      case 'expo':
        env.EXPO_DEVTOOLS_LISTEN_ADDRESS = '0.0.0.0';
        env.EXPO_USE_FAST_RESOLVER = 'true';
        if (ports[1]) env.EXPO_DEVTOOLS_PORT = ports[1].toString();
        break;
        
      case 'react':
        env.BROWSER = 'none'; // Prevent auto-opening browser
        env.FAST_REFRESH = 'true';
        break;
        
      case 'vue':
        env.VUE_CLI_SERVICE_CONFIG_PATH = './vue.config.js';
        break;
        
      case 'nextjs':
        env.NEXT_TELEMETRY_DISABLED = '1';
        break;
    }
    
    // Add custom environment variables from options
    if (options.env) {
      Object.assign(env, options.env);
    }
    
    return env;
  }

  /**
   * Spawn the app process
   */
  private async spawnProcess(
    appId: number,
    appType: AppType,
    env: Record<string, string>,
    options: any
  ): Promise<ChildProcess> {
    const appConfig = APP_TYPE_CONFIGS[appType];
    const workingDir = options.workingDir || process.cwd();
    
    // Determine command and args based on app type
    let command: string;
    let args: string[];
    
    switch (appType) {
      case 'expo':
        command = 'npx';
        args = ['expo', 'start', '--dev-client', '--clear'];
        break;
        
      case 'react':
        command = 'npm';
        args = ['start'];
        break;
        
      case 'vue':
        command = 'npm';
        args = ['run', 'serve'];
        break;
        
      case 'nextjs':
        command = 'npm';
        args = ['run', 'dev'];
        break;
        
      default:
        command = 'npm';
        args = ['start'];
    }
    
    // Override command if specified in options
    if (options.command) {
      command = options.command;
      args = options.args || [];
    }
    
    logger.info(`🔧 Spawning process: ${command} ${args.join(' ')} (cwd: ${workingDir})`);
    
    const childProcess = spawn(command, args, {
      cwd: workingDir,
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
    });
    
    return childProcess;
  }

  /**
   * Setup event handlers for a process
   */
  private setupProcessHandlers(appProcess: AppProcess): void {
    const { appId, process } = appProcess;
    
    process.stdout?.on('data', (data: Buffer) => {
      const output = data.toString();
      this.handleProcessOutput(appProcess, output, 'stdout');
    });
    
    process.stderr?.on('data', (data: Buffer) => {
      const output = data.toString();
      this.handleProcessOutput(appProcess, output, 'stderr');
    });
    
    process.on('exit', (code: number | null, signal: string | null) => {
      logger.info(`📤 App ${appId} exited with code ${code}, signal ${signal}`);
      this.handleProcessExit(appProcess, code, signal);
    });
    
    process.on('error', (error: Error) => {
      logger.error(`❌ App ${appId} process error:`, error);
      this.emit('app:error', appId, error);
    });
  }

  /**
   * Handle process output
   */
  private handleProcessOutput(appProcess: AppProcess, output: string, stream: 'stdout' | 'stderr'): void {
    const { appId, appType } = appProcess;
    
    // Parse output for important information
    const lines = output.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      // Check for server ready indicators
      if (this.isServerReadyOutput(line, appType)) {
        this.handleServerReady(appProcess, line);
      }
      
      // Check for error indicators
      if (this.isErrorOutput(line)) {
        this.emit('app:error', appId, new Error(line));
      }
      
      // Extract URLs and connections
      const urls = this.extractUrlsFromOutput(line);
      if (urls.length > 0) {
        this.updateAppConnections(appProcess, urls);
      }
      
      // Emit progress updates
      const progress = this.extractProgressFromOutput(line, appType);
      if (progress !== null) {
        this.emit('app:progress', appId, progress, line.trim());
      }
    }
    
    // Emit raw output for logging
    this.emit('app:output', appId, { stream, data: output });
  }

  /**
   * Check if output indicates server is ready
   */
  private isServerReadyOutput(line: string, appType: AppType): boolean {
    const readyPatterns = {
      expo: [/Metro waiting on/, /Expo DevTools/, /QR code/],
      react: [/webpack compiled/, /Local:.*http/, /compiled successfully/],
      vue: [/App running at/, /Local:.*http/],
      nextjs: [/ready - started server/, /Local:.*http/],
    };
    
    const patterns = readyPatterns[appType] || readyPatterns.react;
    return patterns.some(pattern => pattern.test(line));
  }

  /**
   * Check if output indicates an error
   */
  private isErrorOutput(line: string): boolean {
    const errorPatterns = [
      /error/i,
      /failed/i,
      /cannot/i,
      /unable to/i,
      /EADDRINUSE/,
      /ENOENT/,
    ];
    
    return errorPatterns.some(pattern => pattern.test(line));
  }

  /**
   * Extract URLs from process output
   */
  private extractUrlsFromOutput(line: string): string[] {
    const urlPattern = /https?:\/\/[^\s]+/g;
    return line.match(urlPattern) || [];
  }

  /**
   * Extract progress information from output
   */
  private extractProgressFromOutput(line: string, appType: AppType): number | null {
    // This is a simplified implementation - you'd want more sophisticated parsing
    if (line.includes('compiling')) return 25;
    if (line.includes('compiled')) return 75;
    if (line.includes('ready')) return 100;
    return null;
  }

  /**
   * Handle server ready event
   */
  private handleServerReady(appProcess: AppProcess, output: string): void {
    const { appId } = appProcess;
    
    logger.info(`✅ App ${appId} server is ready`);
    
    // Update connections if not already set
    if (appProcess.connections.length === 0) {
      this.generateDefaultConnections(appProcess);
    }
    
    this.emit('app:ready', appId, appProcess.connections);
  }

  /**
   * Generate default connections for an app
   */
  private generateDefaultConnections(appProcess: AppProcess): void {
    const { appType, ports } = appProcess;
    const connections: PreviewConnection[] = [];
    
    if (ports.length > 0) {
      const mainPort = ports[0];
      
      connections.push({
        type: 'web',
        url: `http://localhost:${mainPort}`,
        isActive: true,
        label: 'Local Development',
      });
      
      // Add app-specific connections
      if (appType === 'expo' && ports.length > 1) {
        connections.push({
          type: 'expo',
          url: `exp://localhost:${ports[1]}`,
          isActive: false,
          label: 'Expo DevTools',
        });
      }
    }
    
    appProcess.connections = connections;
  }

  /**
   * Update app connections from parsed output
   */
  private updateAppConnections(appProcess: AppProcess, urls: string[]): void {
    for (const url of urls) {
      const existing = appProcess.connections.find(c => c.url === url);
      if (!existing) {
        appProcess.connections.push({
          type: url.startsWith('https') ? 'web' : 'local',
          url,
          isActive: false,
          label: this.generateConnectionLabel(url),
        });
      }
    }
  }

  /**
   * Generate a label for a connection
   */
  private generateConnectionLabel(url: string): string {
    if (url.includes('localhost')) return 'Local Development';
    if (url.includes('ngrok')) return 'Tunnel (ngrok)';
    if (url.includes('expo')) return 'Expo DevTools';
    return 'External URL';
  }

  /**
   * Handle process exit
   */
  private handleProcessExit(appProcess: AppProcess, code: number | null, signal: string | null): void {
    const { appId } = appProcess;
    
    if (code === 0) {
      logger.info(`✅ App ${appId} exited gracefully`);
    } else {
      logger.warn(`⚠️ App ${appId} exited with code ${code}`);
      this.emit('app:error', appId, new Error(`Process exited with code ${code}`));
    }
    
    // Cleanup resources
    this.cleanupAppResources(appProcess);
    
    // Remove from processes map
    this.processes.delete(appId);
    
    this.emit('app:exit', appId, code, signal);
  }

  /**
   * Wait for app to be ready
   */
  private async waitForAppReady(appProcess: AppProcess, timeout: number = 60000): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`App ${appProcess.appId} failed to start within ${timeout}ms`));
      }, timeout);
      
      const onReady = () => {
        clearTimeout(timeoutId);
        this.off('app:ready', onReady);
        this.off('app:error', onError);
        resolve();
      };
      
      const onError = (appId: number, error: Error) => {
        if (appId === appProcess.appId) {
          clearTimeout(timeoutId);
          this.off('app:ready', onReady);
          this.off('app:error', onError);
          reject(error);
        }
      };
      
      this.on('app:ready', onReady);
      this.on('app:error', onError);
    });
  }

  /**
   * Cleanup resources for an app
   */
  private async cleanupAppResources(appProcess: AppProcess): Promise<void> {
    const { appId, ports } = appProcess;
    
    // Free allocated ports
    ports.forEach(port => {
      this.allocatedPorts.delete(port);
      logger.info(`🔌 Freed port ${port} for app ${appId}`);
    });
    
    // Additional cleanup can be added here (temp files, etc.)
  }

  /**
   * Cleanup failed start attempt
   */
  private async cleanupFailedStart(appId: number): Promise<void> {
    const appProcess = this.processes.get(appId);
    if (appProcess) {
      await this.cleanupAppResources(appProcess);
      this.processes.delete(appId);
    }
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 30000); // Check every 30 seconds
  }

  /**
   * Perform health check on all processes
   */
  private async performHealthCheck(): Promise<void> {
    const now = Date.now();
    
    for (const [appId, appProcess] of Array.from(this.processes.entries())) {
      try {
        // Update resource usage
        await this.updateResourceUsage(appProcess);
        
        // Check if process is still alive
        if (appProcess.process.killed || appProcess.process.exitCode !== null) {
          logger.warn(`⚠️ Dead process detected for app ${appId}`);
          this.emit('app:error', appId, new Error('Process died unexpectedly'));
          continue;
        }
        
        appProcess.lastHealthCheck = now;
        
      } catch (error) {
        logger.error(`❌ Health check failed for app ${appId}:`, error);
      }
    }
  }

  /**
   * Update resource usage for an app
   */
  private async updateResourceUsage(appProcess: AppProcess): Promise<void> {
    try {
      if (!appProcess.process || appProcess.process.killed) {
        return;
      }
      
      // Get process stats (simplified - in real implementation, use proper system monitoring)
      const pid = appProcess.process.pid;
      if (!pid) return;
      
      // Mock resource usage calculation
      const cpuUsage = Math.random() * 100; // 0-100%
      const memoryUsage = Math.random() * 1024 * 1024 * 100; // 0-100MB
      
      appProcess.resource.resourceUsage.cpu = cpuUsage;
      appProcess.resource.resourceUsage.memory = memoryUsage;
      appProcess.resource.lastAccessed = Date.now();
      
      // Record performance metrics
      const metrics = this.performanceMetrics.get(appProcess.appId);
      if (metrics) {
        metrics.resourceUsage.push({
          cpu: cpuUsage,
          memory: memoryUsage,
          timestamp: Date.now()
        });
        
        // Keep only last 100 measurements to prevent memory bloat
        if (metrics.resourceUsage.length > 100) {
          metrics.resourceUsage = metrics.resourceUsage.slice(-100);
        }
      }
      
    } catch (error) {
      logger.error(`❌ Failed to update resource usage for app ${appProcess.appId}:`, error);
    }
  }

  /**
   * Get performance metrics for an app
   */
  public getAppMetrics(appId: number): {
    startTime: number;
    loadTime?: number;
    averageCpu: number;
    averageMemory: number;
    peakCpu: number;
    peakMemory: number;
    uptime: number;
  } | null {
    const metrics = this.performanceMetrics.get(appId);
    if (!metrics) {
      return null;
    }
    
    const resourceUsage = metrics.resourceUsage;
    const now = Date.now();
    
    let averageCpu = 0;
    let averageMemory = 0;
    let peakCpu = 0;
    let peakMemory = 0;
    
    if (resourceUsage.length > 0) {
      averageCpu = resourceUsage.reduce((sum, usage) => sum + usage.cpu, 0) / resourceUsage.length;
      averageMemory = resourceUsage.reduce((sum, usage) => sum + usage.memory, 0) / resourceUsage.length;
      peakCpu = Math.max(...resourceUsage.map(usage => usage.cpu));
      peakMemory = Math.max(...resourceUsage.map(usage => usage.memory));
    }
    
    return {
      startTime: metrics.startTime,
      loadTime: metrics.loadTime,
      averageCpu,
      averageMemory,
      peakCpu,
      peakMemory,
      uptime: now - metrics.startTime
    };
  }

  /**
   * Generate performance report for all apps
   */
  public generatePerformanceReport(): {
    totalApps: number;
    activeApps: number;
    suspendedApps: number;
    averageLoadTime: number;
    systemResourceUsage: {
      totalCpu: number;
      totalMemory: number;
    };
    appMetrics: Array<{
      appId: number;
      type: string;
      metrics: ReturnType<typeof this.getAppMetrics>;
    }>;
  } {
    const activeApps = Array.from(this.processes.values()).filter(p => !p.suspended).length;
    const suspendedApps = Array.from(this.processes.values()).filter(p => p.suspended).length;
    
    const loadTimes = Array.from(this.performanceMetrics.values())
      .map(m => m.loadTime)
      .filter((time): time is number => time !== undefined);
    
    const averageLoadTime = loadTimes.length > 0 
      ? loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length 
      : 0;
    
    let totalCpu = 0;
    let totalMemory = 0;
    
    const appMetrics = Array.from(this.processes.entries()).map(([appId, process]) => {
      const metrics = this.getAppMetrics(appId);
      if (metrics) {
        totalCpu += metrics.averageCpu;
        totalMemory += metrics.averageMemory;
      }
      
      return {
        appId,
        type: process.appType,
        metrics
      };
    });
    
    return {
      totalApps: this.processes.size,
      activeApps,
      suspendedApps,
      averageLoadTime,
      systemResourceUsage: {
        totalCpu,
        totalMemory
      },
      appMetrics
    };
  }

  /**
   * Shutdown the control plane
   */
  public async shutdown(): Promise<void> {
    logger.info('🔄 Shutting down PreviewControlPlane...');
    
    // Stop health monitoring
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    // Stop all processes
    const stopPromises = Array.from(this.processes.keys()).map(appId => 
      this.stopApp(appId)
    );
    await Promise.all(stopPromises);
    
    this.isInitialized = false;
    logger.info('✅ PreviewControlPlane shutdown complete');
  }
}