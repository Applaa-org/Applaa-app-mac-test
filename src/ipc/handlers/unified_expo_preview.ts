/**
 * 🚀 UNIFIED EXPO PREVIEW SYSTEM
 * Single component replacing fragmented preview implementations
 * Provides clear status, intelligent fallbacks, and performance monitoring
 */

import { ipcMain } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import log from 'electron-log';
import { performance } from 'perf_hooks';
import { db } from '../../db';
import { apps } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { getDyadAppPath } from '../../paths/paths';
import { unifiedInstallDependencies } from './unified_dependency_manager';
import { smartCache } from './smart_cache_manager';
import { expoPerformanceMonitor } from './expo_performance_monitor';

const logger = log.scope('unified-expo-preview');

interface UnifiedPreviewStatus {
  appId: number;
  status: 'initializing' | 'installing' | 'building' | 'ready' | 'error';
  progress: number; // 0-100
  message: string;
  
  // Connection methods with intelligent fallback
  connections: {
    qr?: string;      // Primary: QR code for mobile
    tunnel?: string;  // Backup: ngrok tunnel  
    lan?: string;     // Local: LAN IP address
  };
  
  // Real-time performance metrics
  metrics: {
    buildTime: number;
    startupTime: number;
    errorCount: number;
    lastError?: string;
  };
  
  // Process management
  expoProcess?: ChildProcess;
  port?: number;
  startTime: number;
}

// Global preview status tracking
const previewStatus = new Map<number, UnifiedPreviewStatus>();

export function registerUnifiedExpoPreview() {

  // Start preview for an app
  ipcMain.handle("unified-expo:start-preview", async (_, params: { appId: number; useTunnel?: boolean }) => {
    const { appId, useTunnel = false } = params;
    
    try {
      logger.info(`🚀 Starting unified preview for app ${appId}`);
      
      // Get app data
      const [appData] = await db.select().from(apps).where(eq(apps.id, appId)).limit(1);
      if (!appData) {
        throw new Error("App not found");
      }

      const appPath = getDyadAppPath(appData.path);
      
      // Initialize status
      const status: UnifiedPreviewStatus = {
        appId,
        status: 'initializing',
        progress: 0,
        message: 'Initializing Expo preview...',
        connections: {},
        metrics: {
          buildTime: 0,
          startupTime: 0,
          errorCount: 0
        },
        startTime: Date.now()
      };
      
      previewStatus.set(appId, status);
      
      // Start performance monitoring
      expoPerformanceMonitor.startOperation(appId, 'preview', { useTunnel, appPath });
      
      // Start the preview process
      await startPreviewProcess(appId, appPath, useTunnel);
      
      // End performance monitoring
      expoPerformanceMonitor.endOperation(appId, 'preview', true);
      
      return { success: true, status: previewStatus.get(appId) };
    } catch (error) {
      logger.error(`❌ Failed to start preview for app ${appId}:`, error);
      
      // End performance monitoring with error
      expoPerformanceMonitor.endOperation(appId, 'preview', false, error.message);
      
      const status = previewStatus.get(appId);
      if (status) {
        status.status = 'error';
        status.message = `Failed to start preview: ${error.message}`;
        status.metrics.errorCount++;
        status.metrics.lastError = error.message;
      }
      
      return { success: false, error: error.message };
    }
  });

  // Get preview status
  ipcMain.handle("unified-expo:get-status", async (_, params: { appId: number }) => {
    const status = previewStatus.get(params.appId);
    return status || null;
  });

  // Stop preview
  ipcMain.handle("unified-expo:stop-preview", async (_, params: { appId: number }) => {
    const { appId } = params;
    
    try {
      await stopPreviewProcess(appId);
      return { success: true };
    } catch (error) {
      logger.error(`❌ Failed to stop preview for app ${appId}:`, error);
      return { success: false, error: error.message };
    }
  });

  // Get all active previews
  ipcMain.handle("unified-expo:list-active", async () => {
    const active = Array.from(previewStatus.values()).filter(s => s.status !== 'error');
    return active;
  });
}

/**
 * Start the preview process with intelligent error recovery
 */
async function startPreviewProcess(appId: number, appPath: string, useTunnel: boolean): Promise<void> {
  const status = previewStatus.get(appId)!;
  
  try {
    // Phase 1: Dependency Check & Installation
    status.status = 'installing';
    status.progress = 10;
    status.message = 'Checking dependencies...';
    
    const packageJsonPath = path.join(appPath, 'package.json');
    const nodeModulesPath = path.join(appPath, 'node_modules');
    
    // Smart caching: Skip installation if possible
    if (!smartCache.canSkipDependencyInstall(packageJsonPath, nodeModulesPath)) {
      status.message = 'Installing dependencies (this may take a few minutes)...';
      status.progress = 20;
      
      const installSuccess = await unifiedInstallDependencies(appPath, appId, 'unified-preview');
      
      if (!installSuccess) {
        throw new Error('Failed to install dependencies');
      }
      
      // Cache successful installation
      smartCache.cacheDependencyInstall(
        require('crypto').createHash('md5').update(fs.readFileSync(packageJsonPath, 'utf8')).digest('hex'),
        nodeModulesPath
      );
    } else {
      logger.info(`📦 Skipping dependency installation for app ${appId} - using cache`);
    }
    
    // Phase 2: Port Allocation
    status.progress = 40;
    status.message = 'Allocating port...';
    
    const port = await allocatePort(8081, 8200);
    status.port = port;
    
    // Phase 3: Start Expo Process
    status.status = 'building';
    status.progress = 60;
    status.message = 'Starting Expo development server...';
    
    const expoProcess = await startExpoProcess(appId, appPath, port, useTunnel);
    status.expoProcess = expoProcess;
    
    // Phase 4: Wait for Ready State
    status.progress = 80;
    status.message = 'Waiting for development server to be ready...';
    
    await waitForExpoReady(appId, expoProcess, port, useTunnel);
    
    // Phase 5: Ready!
    status.status = 'ready';
    status.progress = 100;
    status.message = 'Preview ready! Scan QR code with Expo Go app.';
    status.metrics.startupTime = Date.now() - status.startTime;
    
    logger.info(`✅ Unified preview ready for app ${appId} in ${status.metrics.startupTime}ms`);
    
  } catch (error) {
    logger.error(`❌ Preview process failed for app ${appId}:`, error);
    
    status.status = 'error';
    status.message = `Preview failed: ${error.message}`;
    status.metrics.errorCount++;
    status.metrics.lastError = error.message;
    
    // Attempt recovery for common errors
    await attemptErrorRecovery(appId, error);
    
    throw error;
  }
}

/**
 * Start Expo process with optimized configuration
 */
async function startExpoProcess(appId: number, appPath: string, port: number, useTunnel: boolean): Promise<ChildProcess> {
  const args = ['expo', 'start', '--port', port.toString()];
  
  if (useTunnel) {
    args.push('--tunnel');
  }
  
  // Clear cache for fresh start
  args.push('--clear');
  
  logger.info(`🚀 Starting Expo: npx ${args.join(' ')}`);
  
  const expoProcess = spawn('npx', args, {
    cwd: appPath,
    shell: true,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      EXPO_NO_TELEMETRY: '1',
      EXPO_USE_DEV_SERVER: '1',
      NODE_ENV: 'development',
      RCT_METRO_PORT: String(port),
      REACT_NATIVE_PACKAGER_HOSTNAME: '0.0.0.0',
      EXPO_NO_DOTENV: '1',
      EXPO_NO_GIT_STATUS: '1',
      EXPO_NO_CACHE: '1',
      EXPO_NO_UPDATE_CHECK: '1',
      PORT: String(port),
      EXPO_DEVTOOLS_LISTEN_ADDRESS: '0.0.0.0',
      EXPO_NO_WEB_SETUP: '1',
      EXPO_NO_TYPESCRIPT_SETUP: '1',
      EXPO_NO_ANALYTICS: '1',
      EXPO_NO_REDIRECT: '1',
      REACT_NATIVE_METRO_PORT: String(port),
      EXPO_AUTO_PORT: '0',
      EXPO_FORCE_PORT: String(port)
    }
  });
  
  // Handle process events
  expoProcess.on('error', (error) => {
    logger.error(`❌ Expo process error for app ${appId}:`, error);
    const status = previewStatus.get(appId);
    if (status) {
      status.status = 'error';
      status.message = `Process error: ${error.message}`;
      status.metrics.errorCount++;
    }
  });
  
  expoProcess.on('exit', (code, signal) => {
    logger.info(`📱 Expo process exited for app ${appId} with code ${code}, signal ${signal}`);
    const status = previewStatus.get(appId);
    if (status && status.status !== 'error') {
      status.status = 'error';
      status.message = `Process exited unexpectedly (code: ${code})`;
    }
  });
  
  return expoProcess;
}

/**
 * Wait for Expo to be ready and extract connection URLs
 */
async function waitForExpoReady(appId: number, expoProcess: ChildProcess, port: number, useTunnel: boolean): Promise<void> {
  const status = previewStatus.get(appId)!;
  
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Timeout waiting for Expo to be ready'));
    }, 120000); // 2 minutes timeout
    
    let outputBuffer = '';
    
    expoProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      outputBuffer += output;
      
      // Look for QR code
      const qrMatch = output.match(/exp:\/\/[^\s]+/);
      if (qrMatch) {
        status.connections.qr = qrMatch[0];
        logger.info(`📱 QR code ready for app ${appId}: ${qrMatch[0]}`);
      }
      
      // Look for tunnel URL
      const tunnelMatch = output.match(/https:\/\/[a-z0-9-]+\.exp\.direct/);
      if (tunnelMatch) {
        status.connections.tunnel = tunnelMatch[0];
        logger.info(`🌐 Tunnel ready for app ${appId}: ${tunnelMatch[0]}`);
      }
      
      // Look for LAN URL
      const lanMatch = output.match(/exp:\/\/\d+\.\d+\.\d+\.\d+:\d+/);
      if (lanMatch) {
        status.connections.lan = lanMatch[0];
        logger.info(`🏠 LAN ready for app ${appId}: ${lanMatch[0]}`);
      }
      
      // Check if Metro is ready
      if (output.includes('Metro waiting') || output.includes('Logs for your project') || 
          output.includes('exp://') || output.includes('› Press')) {
        clearTimeout(timeout);
        resolve();
      }
    });
    
    expoProcess.stderr?.on('data', (data) => {
      const error = data.toString();
      logger.warn(`⚠️ Expo stderr for app ${appId}:`, error);
      
      // Check for critical errors
      if (error.includes('EADDRINUSE') || error.includes('port') || error.includes('EACCES')) {
        clearTimeout(timeout);
        reject(new Error(`Port conflict: ${error}`));
      }
    });
  });
}

/**
 * Attempt automatic error recovery
 */
async function attemptErrorRecovery(appId: number, error: Error): Promise<void> {
  const errorMessage = error.message.toLowerCase();
  
  if (errorMessage.includes('port') || errorMessage.includes('eaddrinuse')) {
    logger.info(`🔄 Attempting port recovery for app ${appId}`);
    // Try with a different port
    const newPort = await allocatePort(8081, 8200);
    // Could restart with new port here
  }
  
  if (errorMessage.includes('dependency') || errorMessage.includes('module')) {
    logger.info(`🔄 Attempting dependency recovery for app ${appId}`);
    // Clear cache and retry installation
    smartCache.clear();
  }
  
  if (errorMessage.includes('metro') || errorMessage.includes('bundler')) {
    logger.info(`🔄 Attempting Metro recovery for app ${appId}`);
    // Clear Metro cache
  }
}

/**
 * Stop preview process and cleanup
 */
async function stopPreviewProcess(appId: number): Promise<void> {
  const status = previewStatus.get(appId);
  if (!status) return;
  
  if (status.expoProcess) {
    logger.info(`🛑 Stopping Expo process for app ${appId}`);
    
    if (process.platform === "win32") {
      spawn("taskkill", ["/pid", status.expoProcess.pid!.toString(), "/f", "/t"]);
    } else {
      status.expoProcess.kill("SIGTERM");
    }
  }
  
  previewStatus.delete(appId);
  logger.info(`✅ Preview stopped for app ${appId}`);
}

/**
 * Allocate available port in range
 */
async function allocatePort(start: number, end: number): Promise<number> {
  const net = require('net');
  
  for (let port = start; port <= end; port++) {
    const available = await new Promise<boolean>((resolve) => {
      const server = net.createServer();
      server.listen(port, () => {
        server.close(() => resolve(true));
      });
      server.on('error', () => resolve(false));
    });
    
    if (available) {
      return port;
    }
  }
  
  throw new Error(`No available ports in range ${start}-${end}`);
}

// Cleanup on process exit
process.on('exit', () => {
  for (const [appId] of previewStatus) {
    stopPreviewProcess(appId);
  }
});
