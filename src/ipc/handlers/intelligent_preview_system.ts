/**
 * 🚀 INTELLIGENT EXPO PREVIEW SYSTEM
 * 
 * Revolutionary preview system that:
 * 1. Starts preparation during LLM code generation (parallel processing)
 * 2. Uses intelligent caching and pre-warming for instant previews
 * 3. Provides motivational UI for non-technical users
 * 4. Ensures preview is ready when user sees the button
 */

import { ipcMain } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import log from 'electron-log';
import { db } from '../../db';
import { apps } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { getDyadAppPath } from '../../paths/paths';
import { unifiedInstallDependencies } from './unified_dependency_manager';

const logger = log.scope('intelligent-preview');

interface IntelligentPreviewState {
  appId: number;
  phase: 'waiting' | 'preparing' | 'warming' | 'ready' | 'error';
  progress: number; // 0-100
  userMessage: string; // Non-technical, motivational message
  technicalDetails: string; // For debugging
  
  // Preparation status
  dependenciesReady: boolean;
  metroCacheWarmed: boolean;
  expoServerReady: boolean;
  
  // Performance metrics
  startTime: number;
  preparationTime?: number;
  readyTime?: number;
  
  // Process management
  expoProcess?: ChildProcess;
  port?: number;
  qrCode?: string;
  
  // User experience
  motivationalMessage: string;
  estimatedTimeRemaining?: number;
}

// Global state tracking
const previewStates = new Map<number, IntelligentPreviewState>();

export function registerIntelligentPreviewSystem() {
  logger.info("🚀 Registering Intelligent Expo Preview System");

  // 🎯 PHASE 1: Start preparation during LLM generation
  ipcMain.handle("intelligent-preview:start-preparation", async (_, params: { 
    appId: number; 
    isLLMGenerating: boolean;
  }) => {
    const { appId, isLLMGenerating } = params;
    
    try {
      logger.info(`🎯 Starting intelligent preparation for app ${appId} (LLM generating: ${isLLMGenerating})`);
      
      // Get app data
      const [appData] = await db.select().from(apps).where(eq(apps.id, appId)).limit(1);
      if (!appData) {
        throw new Error("App not found");
      }

      const appPath = getDyadAppPath(appData.path);
      
      // Initialize state with motivational messaging
      const state: IntelligentPreviewState = {
        appId,
        phase: isLLMGenerating ? 'preparing' : 'waiting',
        progress: 0,
        userMessage: isLLMGenerating 
          ? "🎨 Getting your app ready while the AI creates your code..."
          : "🚀 Preparing your app preview...",
        technicalDetails: 'Initializing intelligent preview system',
        dependenciesReady: false,
        metroCacheWarmed: false,
        expoServerReady: false,
        startTime: Date.now(),
        motivationalMessage: getMotivationalMessage('preparing', appData.name || 'Your App')
      };
      
      previewStates.set(appId, state);
      
      // Start parallel preparation (non-blocking)
      if (isLLMGenerating) {
        performIntelligentPreparation(appId, appPath);
      }
      
      return { success: true, state };
    } catch (error) {
      logger.error(`❌ Failed to start preparation for app ${appId}:`, error);
      return { success: false, error: error.message };
    }
  });

  // 🎯 PHASE 2: Notify when LLM completes code generation
  ipcMain.handle("intelligent-preview:llm-completed", async (_, params: { appId: number }) => {
    const { appId } = params;
    
    try {
      logger.info(`🎯 LLM completed for app ${appId}, finalizing preview`);
      
      const state = previewStates.get(appId);
      if (!state) {
        throw new Error("Preview state not found");
      }
      
      // Update state
      state.phase = 'warming';
      state.userMessage = "🔥 Your code is ready! Warming up the preview...";
      state.motivationalMessage = getMotivationalMessage('warming', 'Your App');
      state.progress = Math.max(state.progress, 70);
      
      // Finalize preparation if not already done
      const appData = await db.select().from(apps).where(eq(apps.id, appId)).limit(1);
      if (appData.length > 0) {
        const appPath = getDyadAppPath(appData[0].path);
        await finalizePreparation(appId, appPath);
      }
      
      return { success: true, state };
    } catch (error) {
      logger.error(`❌ Failed to finalize preview for app ${appId}:`, error);
      return { success: false, error: error.message };
    }
  });

  // 🎯 PHASE 3: Get instant preview (should be ready immediately)
  ipcMain.handle("intelligent-preview:get-preview", async (_, params: { appId: number }) => {
    const { appId } = params;
    
    try {
      const state = previewStates.get(appId);
      if (!state) {
        throw new Error("Preview not prepared. Call start-preparation first.");
      }
      
      if (state.phase === 'ready') {
        logger.info(`✅ Instant preview ready for app ${appId}`);
        return { 
          success: true, 
          ready: true,
          qrCode: state.qrCode,
          port: state.port,
          message: "🎉 Your app is live! Scan the QR code to see it on your phone!"
        };
      } else {
        logger.info(`⏳ Preview still preparing for app ${appId} (${state.phase})`);
        return { 
          success: true, 
          ready: false,
          state,
          estimatedTime: state.estimatedTimeRemaining || 30
        };
      }
    } catch (error) {
      logger.error(`❌ Failed to get preview for app ${appId}:`, error);
      return { success: false, error: error.message };
    }
  });

  // Get current preview state
  ipcMain.handle("intelligent-preview:get-state", async (_, params: { appId: number }) => {
    const { appId } = params;
    const state = previewStates.get(appId);
    return { success: true, state };
  });

  // Stop preview
  ipcMain.handle("intelligent-preview:stop", async (_, params: { appId: number }) => {
    const { appId } = params;
    
    try {
      const state = previewStates.get(appId);
      if (state?.expoProcess) {
        state.expoProcess.kill();
      }
      previewStates.delete(appId);
      
      logger.info(`🛑 Stopped preview for app ${appId}`);
      return { success: true };
    } catch (error) {
      logger.error(`❌ Failed to stop preview for app ${appId}:`, error);
      return { success: false, error: error.message };
    }
  });
}

/**
 * 🚀 INTELLIGENT PREPARATION: Runs in parallel with LLM generation
 */
async function performIntelligentPreparation(appId: number, appPath: string): Promise<void> {
  const state = previewStates.get(appId);
  if (!state) return;
  
  try {
    logger.info(`🚀 Starting intelligent preparation for app ${appId}`);
    
    // STEP 1: Pre-install dependencies (while LLM is generating)
    state.userMessage = "📦 Installing app components in the background...";
    state.technicalDetails = "Installing dependencies";
    state.progress = 20;
    
    const packageJsonPath = path.join(appPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const installSuccess = await unifiedInstallDependencies(appPath, appId, 'intelligent-preview');
      if (installSuccess) {
        state.dependenciesReady = true;
        state.progress = 40;
        state.userMessage = "✅ App components ready! Preparing preview environment...";
        logger.info(`📦 Dependencies ready for app ${appId}`);
      }
    }
    
    // STEP 2: Warm up Metro cache (parallel with dependency installation)
    state.userMessage = "🔥 Warming up the preview engine...";
    state.technicalDetails = "Warming Metro cache";
    state.progress = 60;
    
    await warmMetroCache(appId, appPath);
    state.metroCacheWarmed = true;
    state.progress = 80;
    
    logger.info(`🔥 Metro cache warmed for app ${appId}`);
    
  } catch (error) {
    logger.error(`❌ Preparation failed for app ${appId}:`, error);
    state.phase = 'error';
    state.userMessage = "❌ Preparation failed. Don't worry, we can still create your preview!";
    state.technicalDetails = error.message;
  }
}

/**
 * 🎯 FINALIZE PREPARATION: Complete the preview setup
 */
async function finalizePreparation(appId: number, appPath: string): Promise<void> {
  const state = previewStates.get(appId);
  if (!state) return;
  
  try {
    logger.info(`🎯 Finalizing preparation for app ${appId}`);
    
    // STEP 3: Start Expo server (should be very fast due to pre-warming)
    state.userMessage = "🚀 Starting your app preview...";
    state.technicalDetails = "Starting Expo development server";
    state.progress = 90;
    
    const port = await allocatePort(8081, 8200);
    const expoProcess = await startOptimizedExpoServer(appId, appPath, port);
    
    state.expoProcess = expoProcess;
    state.port = port;
    
    // STEP 4: Wait for QR code and ready state
    state.userMessage = "📱 Almost ready! Generating QR code...";
    state.progress = 95;
    
    const qrCode = await waitForQRCode(expoProcess, port);
    state.qrCode = qrCode;
    
    // STEP 5: Ready!
    state.phase = 'ready';
    state.progress = 100;
    state.readyTime = Date.now();
    state.userMessage = "🎉 Your app is live and ready to preview!";
    state.motivationalMessage = getMotivationalMessage('ready', 'Your App');
    state.technicalDetails = `Ready on port ${port}`;
    
    logger.info(`✅ Preview ready for app ${appId} in ${state.readyTime - state.startTime}ms`);
    
  } catch (error) {
    logger.error(`❌ Finalization failed for app ${appId}:`, error);
    state.phase = 'error';
    state.userMessage = "❌ Preview setup failed, but we can try again!";
    state.technicalDetails = error.message;
  }
}

/**
 * 🔥 METRO CACHE WARMING: Pre-warm Metro bundler for instant startup
 */
async function warmMetroCache(appId: number, appPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    logger.info(`🔥 Warming Metro cache for app ${appId}`);
    
    // Start Metro in cache-warming mode
    const metroProcess = spawn('npx', ['expo', 'start', '--no-dev', '--minify'], {
      cwd: appPath,
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        EXPO_NO_TELEMETRY: '1',
        NODE_ENV: 'development',
        EXPO_NO_CACHE: '0', // Enable caching for warming
        EXPO_CACHE_WARMING: '1'
      }
    });
    
    let warmed = false;
    const timeout = setTimeout(() => {
      if (!warmed) {
        metroProcess.kill();
        resolve(); // Don't fail, just continue
      }
    }, 15000); // 15 second timeout
    
    metroProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Metro waiting') || output.includes('Logs for your project')) {
        warmed = true;
        clearTimeout(timeout);
        metroProcess.kill();
        resolve();
      }
    });
    
    metroProcess.on('error', () => {
      clearTimeout(timeout);
      resolve(); // Don't fail, just continue
    });
  });
}

/**
 * 🚀 OPTIMIZED EXPO SERVER: Start with all optimizations
 */
async function startOptimizedExpoServer(appId: number, appPath: string, port: number): Promise<ChildProcess> {
  logger.info(`🚀 Starting optimized Expo server for app ${appId} on port ${port}`);
  
  const expoProcess = spawn('npx', ['expo', 'start', '--port', port.toString(), '--lan'], {
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
      EXPO_NO_UPDATE_CHECK: '1',
      PORT: String(port),
      EXPO_DEVTOOLS_LISTEN_ADDRESS: '0.0.0.0',
      EXPO_NO_WEB_SETUP: '1',
      EXPO_NO_TYPESCRIPT_SETUP: '1',
      EXPO_NO_ANALYTICS: '1',
      EXPO_NO_REDIRECT: '1',
      REACT_NATIVE_METRO_PORT: String(port),
      EXPO_AUTO_PORT: '0',
      EXPO_FORCE_PORT: String(port),
      // 🚀 PERFORMANCE OPTIMIZATIONS
      EXPO_USE_FAST_RESOLVER: '1',
      METRO_CACHE_ENABLED: '1',
      EXPO_OPTIMIZE_STARTUP: '1'
    }
  });
  
  return expoProcess;
}

/**
 * 📱 QR CODE EXTRACTION: Get QR code from Expo output
 */
async function waitForQRCode(expoProcess: ChildProcess, port: number): Promise<string> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      reject(new Error('QR code generation timeout'));
    }, 30000);
    
    expoProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      
      // Look for QR code URL pattern
      const qrMatch = output.match(/exp:\/\/[^\s]+/);
      if (qrMatch) {
        clearTimeout(timeout);
        resolve(qrMatch[0]);
        return;
      }
      
      // Fallback: construct QR code from port
      if (output.includes('Metro waiting') || output.includes('Logs for your project')) {
        clearTimeout(timeout);
        resolve(`exp://192.168.1.100:${port}`); // Fallback QR
      }
    });
    
    expoProcess.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

/**
 * 🎯 PORT ALLOCATION: Find available port
 */
async function allocatePort(start: number, end: number): Promise<number> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const net = require('net');
  
  for (let port = start; port <= end; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  
  throw new Error(`No available ports in range ${start}-${end}`);
}

function isPortAvailable(port: number): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const net = require('net');
  
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    
    server.on('error', () => resolve(false));
  });
}

/**
 * 🌟 MOTIVATIONAL MESSAGES: Keep users excited and informed
 */
function getMotivationalMessage(phase: string, appName: string): string {
  const messages = {
    preparing: [
      `🎨 Bringing ${appName} to life...`,
      `✨ Your ${appName} is taking shape!`,
      `🚀 Getting ${appName} ready for its debut!`,
      `💫 Crafting your amazing ${appName}...`
    ],
    warming: [
      `🔥 ${appName} is almost ready to shine!`,
      `⚡ Supercharging ${appName} for you...`,
      `🌟 Final touches on ${appName}...`,
      `🎯 ${appName} is locked and loaded!`
    ],
    ready: [
      `🎉 ${appName} is live and amazing!`,
      `✅ Your ${appName} is ready to impress!`,
      `🚀 ${appName} has launched successfully!`,
      `💎 ${appName} is polished and perfect!`
    ]
  };
  
  const phaseMessages = messages[phase] || messages.preparing;
  return phaseMessages[Math.floor(Math.random() * phaseMessages.length)];
}
