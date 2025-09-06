import { ipcMain } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import log from 'electron-log';
import { getDyadAppPath } from '../../paths/paths';
import { db } from '../../db';
import { apps } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { execAsync } from '../utils/runShellCommand';
import { unifiedInstallDependencies } from "./unified_dependency_manager";

const logger = log.scope("background-dependency-installer");

// Track installation status to avoid duplicate installs
const installationStatus = new Map<number, {
  status: 'installing' | 'completed' | 'failed',
  timestamp: number,
  promise?: Promise<void>
}>();

/**
 * 🚀 BACKGROUND DEPENDENCY INSTALLER
 * 
 * Automatically installs dependencies for:
 * 1. Existing apps when they're opened (selectedAppId changes)
 * 2. New apps immediately after template copy
 * 
 * This saves significant time by installing dependencies in parallel
 * with other app loading operations.
 */
export function registerBackgroundDependencyInstaller() {
  logger.info("🔧 Registering background dependency installer");

  // IPC handler for checking if dependencies need installation
  ipcMain.handle("check-dependencies-needed", async (_, params: { appId: number }) => {
    const { appId } = params;
    
    try {
      const [appData] = await db.select().from(apps).where(eq(apps.id, appId)).limit(1);
      if (!appData) {
        return { needed: false, reason: "App not found" };
      }

      const appPath = getDyadAppPath(appData.path);
      const nodeModulesPath = path.join(appPath, 'node_modules');
      const packageJsonPath = path.join(appPath, 'package.json');

      // Check if package.json exists
      if (!fs.existsSync(packageJsonPath)) {
        return { needed: false, reason: "No package.json found" };
      }

      // Check if node_modules exists and has content
      if (!fs.existsSync(nodeModulesPath)) {
        return { needed: true, reason: "node_modules missing" };
      }

      // Check if expo module exists (for Expo apps)
      const expoModulePath = path.join(nodeModulesPath, 'expo');
      if (!fs.existsSync(expoModulePath)) {
        return { needed: true, reason: "expo module missing" };
      }

      // Check if TypeScript exists (for type checking)
      const typescriptPath = path.join(nodeModulesPath, 'typescript');
      if (!fs.existsSync(typescriptPath)) {
        return { needed: true, reason: "typescript missing" };
      }

      return { needed: false, reason: "Dependencies already installed" };
    } catch (error) {
      logger.error(`Error checking dependencies for app ${appId}:`, error);
      return { needed: false, reason: `Error checking: ${error}` };
    }
  });

  // IPC handler for starting background dependency installation
  ipcMain.handle("install-dependencies-background", async (_, params: { appId: number }) => {
    const { appId } = params;
    logger.info(`🔧 Background dependency installation requested for app ${appId}`);

    // Check if already installing or completed recently
    const existing = installationStatus.get(appId);
    if (existing) {
      const ageMinutes = (Date.now() - existing.timestamp) / (1000 * 60);
      
      if (existing.status === 'installing') {
        logger.info(`📦 App ${appId} dependencies already installing, returning existing promise`);
        return existing.promise;
      }
      
      if (existing.status === 'completed' && ageMinutes < 5) {
        logger.info(`✅ App ${appId} dependencies installed recently (${ageMinutes.toFixed(1)}m ago), skipping`);
        return;
      }
    }

    // Start new installation
    const installPromise = performBackgroundInstallation(appId);
    installationStatus.set(appId, {
      status: 'installing',
      timestamp: Date.now(),
      promise: installPromise
    });

    return installPromise;
  });

  // IPC handler for getting installation status
  ipcMain.handle("get-dependency-installation-status", async (_, params: { appId: number }) => {
    const { appId } = params;
    const status = installationStatus.get(appId);
    
    if (!status) {
      return { status: 'not_started' };
    }

    return {
      status: status.status,
      timestamp: status.timestamp,
      ageMinutes: (Date.now() - status.timestamp) / (1000 * 60)
    };
  });
}

/**
 * Performs the actual background installation with enhanced error handling
 */
async function performBackgroundInstallation(appId: number): Promise<void> {
  const startTime = performance.now();
  logger.info(`🚀 Starting background dependency installation for app ${appId}`);

  try {
    // Get app data
    const [appData] = await db.select().from(apps).where(eq(apps.id, appId)).limit(1);
    if (!appData) {
      throw new Error("App not found");
    }

    const appPath = getDyadAppPath(appData.path);
    const packageJsonPath = path.join(appPath, 'package.json');
    const nodeModulesPath = path.join(appPath, 'node_modules');

    logger.info(`📂 Installing dependencies for: ${appData.name} at ${appPath}`);

    // Verify package.json exists
    if (!fs.existsSync(packageJsonPath)) {
      logger.warn(`⚠️ No package.json found for app ${appId}, skipping installation`);
      installationStatus.set(appId, { status: 'completed', timestamp: Date.now() });
      return;
    }

    // Use unified dependency manager to prevent conflicts
    const installSuccess = await unifiedInstallDependencies(appPath, appId, 'background-installer');
    
    if (!installSuccess) {
      throw new Error('Unified dependency installation failed');
    }

    // Update status to completed
    installationStatus.set(appId, { status: 'completed', timestamp: Date.now() });
    
    const totalTime = performance.now() - startTime;
    logger.info(`✅ Background dependency installation completed for app ${appId} in ${totalTime.toFixed(2)}ms`);

  } catch (error) {
    logger.error(`❌ Background dependency installation failed for app ${appId}:`, error);
    installationStatus.set(appId, { status: 'failed', timestamp: Date.now() });
    throw error;
  }
}

/**
 * Fix common invalid package versions that cause ETARGET errors
 */
async function fixPackageJsonVersions(packageJsonPath: string, appId: number): Promise<void> {
  try {
    const packageContent = fs.readFileSync(packageJsonPath, 'utf8');
    let packageJson = JSON.parse(packageContent);
    let needsFixing = false;

    // Common invalid versions that need fixing
    const fixes = {
      "@react-native-async-storage/async-storage": {
        invalid: ["1.25.0"],
        fix: "^1.23.1"
      },
      "@types/react-native": {
        invalid: ["~0.79.0"],
        fix: "^0.73.0"
      },
      "expo-battery": {
        invalid: ["~7.0.1"],
        fix: "~6.0.1"
      },
      "typescript": {
        invalid: ["~5.8.3"],
        fix: "~5.3.3"
      },
      "react-native": {
        invalid: ["0.79.5"],
        fix: "0.76.3"
      }
    };

    // Check and fix dependencies
    for (const [pkg, config] of Object.entries(fixes)) {
      const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      if (allDeps[pkg] && config.invalid.includes(allDeps[pkg])) {
        if (packageJson.dependencies && packageJson.dependencies[pkg]) {
          packageJson.dependencies[pkg] = config.fix;
          needsFixing = true;
          logger.info(`🔧 Fixed ${pkg}: ${allDeps[pkg]} -> ${config.fix} for app ${appId}`);
        }
        if (packageJson.devDependencies && packageJson.devDependencies[pkg]) {
          packageJson.devDependencies[pkg] = config.fix;
          needsFixing = true;
          logger.info(`🔧 Fixed ${pkg}: ${allDeps[pkg]} -> ${config.fix} for app ${appId}`);
        }
      }
    }

    // Write back the fixed package.json
    if (needsFixing) {
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8');
      logger.info(`✅ package.json fixed for app ${appId}`);
    }
  } catch (error) {
    logger.warn(`⚠️ Could not fix package.json for app ${appId}:`, error);
  }
}
