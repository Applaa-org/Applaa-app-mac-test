import { ipcMain } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import log from 'electron-log';
import { getDyadAppPath } from '../../paths/paths';
import { db } from '../../db';
import { apps } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { execAsync } from '../utils/runShellCommand';
import { unifiedInstallDependencies } from "./unified_dependency_manager";

const logger = log.scope("parallel-prebuild");

interface PrebuildStatus {
  appId: number;
  status: 'starting' | 'installing' | 'warming' | 'ready' | 'failed';
  progress: number;
  message: string;
  startTime: number;
  metroCacheReady: boolean;
  dependenciesInstalled: boolean;
  metroProcess?: ChildProcess;
}

// Track prebuild status for each app
const prebuildStatus = new Map<number, PrebuildStatus>();

/**
 * 🚀 PARALLEL PRE-BUILD SYSTEM
 * 
 * Runs in parallel with LLM chat stream to prepare everything for instant previews:
 * 1. Install dependencies immediately after template copy
 * 2. Warm up Metro cache in background
 * 3. Keep Metro bundler ready for instant preview
 */
export function registerParallelPrebuildSystem() {
  logger.info("🚀 Registering Parallel Pre-Build System for instant previews");

  // Start prebuild process for a new app
  ipcMain.handle("prebuild:start", async (_, params: { appId: number }) => {
    const { appId } = params;
    logger.info(`🚀 Starting parallel prebuild for app ${appId}`);

    try {
      const [appData] = await db.select().from(apps).where(eq(apps.id, appId)).limit(1);
      if (!appData) {
        throw new Error("App not found");
      }

      const appPath = getDyadAppPath(appData.path);
      
      // Initialize prebuild status
      prebuildStatus.set(appId, {
        appId,
        status: 'starting',
        progress: 0,
        message: 'Initializing parallel prebuild...',
        startTime: Date.now(),
        metroCacheReady: false,
        dependenciesInstalled: false
      });

      // Start the prebuild process (non-blocking)
      performParallelPrebuild(appId, appPath);

      return { success: true, message: 'Parallel prebuild started' };
    } catch (error) {
      logger.error(`❌ Failed to start prebuild for app ${appId}:`, error);
      return { success: false, error: error.message };
    }
  });

  // Get prebuild status
  ipcMain.handle("prebuild:status", async (_, params: { appId: number }) => {
    const { appId } = params;
    const status = prebuildStatus.get(appId);
    
    if (!status) {
      return { success: false, error: "No prebuild process found" };
    }

    return {
      success: true,
      status: {
        ...status,
        elapsed: Date.now() - status.startTime,
        metroProcess: status.metroProcess ? 'running' : 'stopped'
      }
    };
  });

  // Stop prebuild process
  ipcMain.handle("prebuild:stop", async (_, params: { appId: number }) => {
    const { appId } = params;
    const status = prebuildStatus.get(appId);
    
    if (status?.metroProcess) {
      try {
        if (process.platform === "win32") {
          spawn("taskkill", ["/pid", status.metroProcess.pid!.toString(), "/f", "/t"]);
        } else {
          status.metroProcess.kill("SIGTERM");
        }
        logger.info(`🛑 Stopped Metro process for app ${appId}`);
      } catch (error) {
        logger.warn(`Warning stopping Metro process:`, error);
      }
    }

    prebuildStatus.delete(appId);
    return { success: true };
  });

  // Check if app is ready for instant preview
  ipcMain.handle("prebuild:is-ready", async (_, params: { appId: number }) => {
    const { appId } = params;
    const status = prebuildStatus.get(appId);
    
    return {
      success: true,
      ready: status?.status === 'ready',
      metroCacheReady: status?.metroCacheReady || false,
      dependenciesInstalled: status?.dependenciesInstalled || false,
      message: status?.message || 'No prebuild process found'
    };
  });
}

/**
 * Performs the actual parallel prebuild process
 */
export async function performParallelPrebuild(appId: number, appPath: string): Promise<void> {
  // Initialize prebuild status if not exists
  if (!prebuildStatus.has(appId)) {
    prebuildStatus.set(appId, {
      appId,
      status: 'starting',
      progress: 0,
      message: 'Initializing parallel prebuild...',
      startTime: Date.now(),
      metroCacheReady: false,
      dependenciesInstalled: false
    });
  }
  
  const status = prebuildStatus.get(appId);
  if (!status) return;

  try {
    logger.info(`🔧 Starting parallel prebuild for app ${appId} at ${appPath}`);

    // STEP 1: Install dependencies (critical path)
    status.status = 'installing';
    status.progress = 10;
    status.message = 'Installing dependencies...';
    prebuildStatus.set(appId, status);

    await installDependenciesParallel(appId, appPath);
    
    status.dependenciesInstalled = true;
    status.progress = 50;
    status.message = 'Dependencies installed, warming Metro cache...';
    prebuildStatus.set(appId, status);

    // STEP 2: Warm up Metro cache
    status.status = 'warming';
    status.progress = 60;
    status.message = 'Warming Metro bundler cache...';
    prebuildStatus.set(appId, status);

    await warmMetroCache(appId, appPath);

    status.metroCacheReady = true;
    status.progress = 90;
    status.message = 'Starting background Metro process...';
    prebuildStatus.set(appId, status);

    // STEP 3: Keep Metro warm in background (optional optimization)
    await startBackgroundMetro(appId, appPath);

    // STEP 4: Mark as ready
    status.status = 'ready';
    status.progress = 100;
    status.message = 'Ready for instant preview! 🚀';
    prebuildStatus.set(appId, status);

    const totalTime = Date.now() - status.startTime;
    logger.info(`✅ Parallel prebuild completed for app ${appId} in ${totalTime}ms`);

  } catch (error) {
    logger.error(`❌ Parallel prebuild failed for app ${appId}:`, error);
    status.status = 'failed';
    status.message = `Prebuild failed: ${error.message}`;
    prebuildStatus.set(appId, status);
  }
}

/**
 * Install dependencies with optimized settings
 */
async function installDependenciesParallel(appId: number, appPath: string): Promise<void> {
  logger.info(`📦 Installing dependencies with unified manager for app ${appId}...`);

  const installSuccess = await unifiedInstallDependencies(appPath, appId, 'parallel-prebuild');
  
  if (!installSuccess) {
    throw new Error('Unified dependency installation failed for parallel prebuild');
  }

  logger.info(`✅ Dependencies installed for app ${appId}`);
}

/**
 * Warm up Metro cache by doing a quick build
 */
async function warmMetroCache(appId: number, appPath: string): Promise<void> {
  logger.info(`🔥 Warming Metro cache for app ${appId}...`);

  try {
    // Quick Metro cache warm-up: start bundler, let it compile, then stop
    const metroProcess = spawn('npx', ['expo', 'start', '--clear', '--no-dev', '--minify'], {
      cwd: appPath,
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        EXPO_NO_TELEMETRY: '1',
        EXPO_NO_DOCTOR: '1',
        EXPO_NO_UPDATE_CHECK: '1',
        CI: '1'
      }
    });

    let cacheWarmed = false;
    const timeout = setTimeout(() => {
      if (!cacheWarmed) {
        logger.info(`⏰ Metro cache warming timeout for app ${appId}, stopping...`);
        if (process.platform === "win32") {
          spawn("taskkill", ["/pid", metroProcess.pid!.toString(), "/f", "/t"]);
        } else {
          metroProcess.kill("SIGTERM");
        }
      }
    }, 30000); // 30 second timeout

    metroProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      // Look for signs that Metro is ready and cache is warm
      if (output.includes('Metro waiting') || output.includes('Logs for your project') || output.includes('exp://')) {
        cacheWarmed = true;
        clearTimeout(timeout);
        logger.info(`🔥 Metro cache warmed for app ${appId}, stopping warm-up process...`);
        
        // Stop the warm-up process
        if (process.platform === "win32") {
          spawn("taskkill", ["/pid", metroProcess.pid!.toString(), "/f", "/t"]);
        } else {
          metroProcess.kill("SIGTERM");
        }
      }
    });

    // Wait for process to complete or timeout
    await new Promise<void>((resolve) => {
      metroProcess.on('exit', () => {
        clearTimeout(timeout);
        resolve();
      });
    });

    logger.info(`✅ Metro cache warmed for app ${appId}`);
  } catch (error) {
    logger.warn(`⚠️ Metro cache warming failed for app ${appId}:`, error);
    // Don't throw - cache warming is an optimization, not critical
  }
}

/**
 * Start Metro in background for instant preview (optional optimization)
 */
async function startBackgroundMetro(appId: number, appPath: string): Promise<void> {
  const status = prebuildStatus.get(appId);
  if (!status) return;

  try {
    logger.info(`🚀 Starting background Metro for app ${appId}...`);

    // Start Metro in background, ready for instant preview
    const metroProcess = spawn('npx', ['expo', 'start', '--dev-client', '--port', '8081'], {
      cwd: appPath,
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        EXPO_NO_TELEMETRY: '1',
        EXPO_NO_DOCTOR: '1',
        EXPO_NO_UPDATE_CHECK: '1',
        METRO_CACHE: '1'
      }
    });

    status.metroProcess = metroProcess;
    prebuildStatus.set(appId, status);

    // Log Metro output for debugging
    metroProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Metro waiting') || output.includes('exp://')) {
        logger.info(`🚀 Background Metro ready for app ${appId}`);
      }
    });

    metroProcess.stderr?.on('data', (data) => {
      logger.warn(`Metro stderr for app ${appId}:`, data.toString());
    });

    metroProcess.on('exit', (code) => {
      logger.info(`Metro process exited for app ${appId} with code ${code}`);
      if (status.metroProcess === metroProcess) {
        status.metroProcess = undefined;
        prebuildStatus.set(appId, status);
      }
    });

    logger.info(`✅ Background Metro started for app ${appId}`);
  } catch (error) {
    logger.warn(`⚠️ Failed to start background Metro for app ${appId}:`, error);
    // Don't throw - background Metro is an optimization
  }
}

/**
 * Handle dynamic package installation during LLM chat
 */
export async function handleDynamicPackageInstall(appId: number, packages: string[]): Promise<void> {
  const status = prebuildStatus.get(appId);
  if (!status) return;

  logger.info(`📦 Installing dynamic packages for app ${appId}:`, packages);

  try {
    const [appData] = await db.select().from(apps).where(eq(apps.id, appId)).limit(1);
    if (!appData) return;

    const appPath = getDyadAppPath(appData.path);
    
    // Install new packages
    const installCommand = `npm install ${packages.join(' ')} --legacy-peer-deps --no-audit --no-fund`;
    await execAsync(installCommand, {
      cwd: appPath,
      timeout: 60000,
      env: {
        ...process.env,
        CI: '1',
        NPM_CONFIG_AUDIT: 'false',
        NPM_CONFIG_FUND: 'false'
      }
    });

    // Restart Metro if it's running to pick up new packages
    if (status.metroProcess) {
      logger.info(`🔄 Restarting Metro for app ${appId} to pick up new packages...`);
      
      // Stop current Metro
      if (process.platform === "win32") {
        spawn("taskkill", ["/pid", status.metroProcess.pid!.toString(), "/f", "/t"]);
      } else {
        status.metroProcess.kill("SIGTERM");
      }

      // Wait a moment then restart
      setTimeout(() => {
        startBackgroundMetro(appId, appPath);
      }, 2000);
    }

    logger.info(`✅ Dynamic packages installed for app ${appId}`);
  } catch (error) {
    logger.error(`❌ Failed to install dynamic packages for app ${appId}:`, error);
  }
}
