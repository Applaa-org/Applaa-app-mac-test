/**
 * UNIFIED DEPENDENCY MANAGER
 * Prevents multiple npm install processes from conflicting
 * Ensures only ONE installation happens per app at a time
 */

import * as fs from 'fs';
import * as path from 'path';
import log from 'electron-log';
import { execAsync } from '../utils/runShellCommand';

const logger = log.scope('unified-deps');

interface InstallationLock {
  appPath: string;
  promise: Promise<boolean>;
  startTime: number;
}

// Global lock to prevent concurrent installations
const installationLocks = new Map<string, InstallationLock>();

/**
 * UNIFIED npm install that prevents conflicts
 * Only allows ONE installation per app path at a time
 */
export async function unifiedInstallDependencies(
  appPath: string, 
  appId?: number,
  source: string = 'unknown'
): Promise<boolean> {
  const lockKey = path.resolve(appPath);
  
  // Check if installation is already in progress
  const existingLock = installationLocks.get(lockKey);
  if (existingLock) {
    logger.info(`📦 [${source}] Installation already in progress for ${appPath}, waiting...`);
    return await existingLock.promise;
  }
  
  // Create new installation lock
  const installPromise = performInstallation(appPath, appId, source);
  installationLocks.set(lockKey, {
    appPath,
    promise: installPromise,
    startTime: Date.now()
  });
  
  // Clean up lock when done
  installPromise.finally(() => {
    installationLocks.delete(lockKey);
  });
  
  return await installPromise;
}

/**
 * Perform the actual installation with multiple fallback strategies
 */
async function performInstallation(
  appPath: string, 
  appId?: number,
  source: string = 'unknown'
): Promise<boolean> {
  const startTime = performance.now();
  logger.info(`📦 [${source}] Starting unified dependency installation for ${appPath}`);
  
  const packageJsonPath = path.join(appPath, 'package.json');
  const nodeModulesPath = path.join(appPath, 'node_modules');
  
  // Check if package.json exists
  if (!fs.existsSync(packageJsonPath)) {
    logger.warn(`⚠️ [${source}] No package.json found at ${appPath}`);
    return false;
  }
  
  // Check if node_modules already exists and is valid
  if (fs.existsSync(nodeModulesPath)) {
    const expoPath = path.join(nodeModulesPath, 'expo');
    if (fs.existsSync(expoPath)) {
      logger.info(`✅ [${source}] Dependencies already installed at ${appPath}`);
      return true;
    }
  }
  
  // Fix package.json BOM and formatting issues
  try {
    await fixPackageJsonIssues(packageJsonPath);
  } catch (error) {
    logger.warn(`⚠️ [${source}] Could not fix package.json: ${error.message}`);
  }
  
  // 🚀 ENHANCED INSTALLATION STRATEGIES with Expo-specific optimizations
  // Prioritize reliable strategies first, avoid problematic pnpm commands
  const strategies = [
    { 
      name: 'npm install --legacy-peer-deps (Expo optimized)', 
      cmd: 'npm install --legacy-peer-deps --no-audit --no-fund',
      env: { EXPO_NO_DOCTOR: '1', EXPO_NO_TELEMETRY: '1' },
      timeout: 180000 // 3 minutes
    },
    { 
      name: 'expo install (Expo SDK compatible)', 
      cmd: 'npx expo install --fix',
      env: { EXPO_NO_DOCTOR: '1', EXPO_NO_TELEMETRY: '1' },
      timeout: 180000 // 3 minutes
    },
    { 
      name: 'npm install --force (fallback)', 
      cmd: 'npm install --force --no-audit --no-fund',
      env: { EXPO_NO_DOCTOR: '1' },
      timeout: 240000 // 4 minutes
    },
    { 
      name: 'npm install (basic)', 
      cmd: 'npm install --no-optional',
      env: {},
      timeout: 300000 // 5 minutes
    }
  ];
  
  let installSuccess = false;
  let lastError: any = null;
  
  for (const strategy of strategies) {
    try {
      logger.info(`📦 [${source}] Trying: ${strategy.name}`);
      
      await execAsync(strategy.cmd, {
        cwd: appPath,
        timeout: strategy.timeout,
        env: {
          ...process.env,
          ...strategy.env,
          CI: '1',
          NPM_CONFIG_AUDIT: 'false',
          NPM_CONFIG_FUND: 'false',
          NPM_CONFIG_PROGRESS: 'false',
          NPM_CONFIG_LOGLEVEL: 'error',
          EXPO_NO_DOCTOR: '1',
          EXPO_NO_UPDATE_CHECK: '1',
          EXPO_NO_TELEMETRY: '1',
          EXPO_NO_WEB_SETUP: '1',
          EXPO_NO_TYPESCRIPT_SETUP: '1'
        }
      });
      
      // Verify installation success
      if (fs.existsSync(nodeModulesPath)) {
        const expoPath = path.join(nodeModulesPath, 'expo');
        if (fs.existsSync(expoPath)) {
          installSuccess = true;
          const totalTime = performance.now() - startTime;
          logger.info(`✅ [${source}] ${strategy.name} succeeded in ${totalTime.toFixed(2)}ms`);
          break;
        } else {
          logger.warn(`⚠️ [${source}] ${strategy.name} created node_modules but expo module missing`);
        }
      } else {
        logger.warn(`⚠️ [${source}] ${strategy.name} completed but no node_modules created`);
      }
    } catch (error) {
      lastError = error;
      logger.warn(`❌ [${source}] ${strategy.name} failed:`, error.message);
      continue;
    }
  }
  
  if (!installSuccess) {
    logger.error(`❌ [${source}] All installation strategies failed. Last error:`, lastError);
    return false;
  }
  
  return true;
}

/**
 * Fix BOM and JSON formatting issues in package.json
 */
async function fixPackageJsonIssues(packageJsonPath: string): Promise<void> {
  let content = fs.readFileSync(packageJsonPath, 'utf8');
  
  // Remove BOM if present
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.substring(1);
          logger.info(`🔧 Removed BOM from ${packageJsonPath}`);
  }
  
  // Parse and reformat JSON to ensure it's valid
  try {
    const jsonObj = JSON.parse(content);
    const cleanJson = JSON.stringify(jsonObj, null, 2);
    fs.writeFileSync(packageJsonPath, cleanJson, 'utf8');
    logger.info(`🔧 Fixed JSON formatting in ${packageJsonPath}`);
  } catch (error) {
    throw new Error(`Invalid JSON in package.json: ${error.message}`);
  }
}

/**
 * Check if dependencies are already installed
 */
export function areDependenciesInstalled(appPath: string): boolean {
  const nodeModulesPath = path.join(appPath, 'node_modules');
  const expoPath = path.join(nodeModulesPath, 'expo');
  
  return fs.existsSync(nodeModulesPath) && fs.existsSync(expoPath);
}

/**
 * Get current installation status
 */
export function getInstallationStatus(appPath: string): {
  isInstalling: boolean;
  isInstalled: boolean;
  startTime?: number;
} {
  const lockKey = path.resolve(appPath);
  const lock = installationLocks.get(lockKey);
  
  return {
    isInstalling: !!lock,
    isInstalled: areDependenciesInstalled(appPath),
    startTime: lock?.startTime
  };
}
