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

// Store error details for retrieval after installation fails
const installationErrors = new Map<string, string>();

/**
 * Get error details from the last installation attempt for an app path
 */
export function getInstallationErrorDetails(appPath: string): string | null {
  const lockKey = path.resolve(appPath);
  return installationErrors.get(lockKey) || null;
}

/**
 * Clear error details for an app path
 */
function clearInstallationErrorDetails(appPath: string): void {
  const lockKey = path.resolve(appPath);
  installationErrors.delete(lockKey);
}

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
  
  // Clear any previous error details
  clearInstallationErrorDetails(appPath);
  
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
  
  // CRITICAL: Delete package-lock.json if it exists to prevent invalid versions from being locked
  const packageLockPath = path.join(appPath, 'package-lock.json');
  if (fs.existsSync(packageLockPath)) {
    logger.info(`🗑️ [${source}] Removing package-lock.json to allow fresh dependency resolution...`);
    try {
      fs.unlinkSync(packageLockPath);
      logger.info(`✅ [${source}] package-lock.json removed`);
    } catch (lockError) {
      logger.warn(`⚠️ [${source}] Could not remove package-lock.json: ${lockError.message}`);
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
  let errorDetails: string[] = [];
  
  for (const strategy of strategies) {
    try {
      logger.info(`📦 [${source}] Trying: ${strategy.name}`);
      
      let result;
      try {
        result = await execAsync(strategy.cmd, {
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
      } catch (execError: any) {
        // execAsync may throw for system errors, but might return result for command failures
        // If it throws, check if it has stdout/stderr in the error object
        if (execError.stdout || execError.stderr) {
          // Treat as result with error
          result = {
            stdout: execError.stdout || '',
            stderr: execError.stderr || '',
            exitCode: execError.code || 1
          };
        } else {
          // Real system error, re-throw
          throw execError;
        }
      }
      
      // Check if command succeeded (exit code 0) or failed but produced output
      if (result.exitCode !== 0 && result.exitCode !== undefined) {
        // Command failed, extract error information
        const stderrOutput = result.stderr || '';
        const stdoutOutput = result.stdout || '';
        const combinedOutput = (stderrOutput + '\n' + stdoutOutput).trim();
        
        // Build detailed error message
        let errorMsg = `Strategy "${strategy.name}" failed with exit code ${result.exitCode}`;
        if (combinedOutput) {
          // Extract last 1500 chars for error context (increased from 1000)
          const errorSnippet = combinedOutput.slice(-1500);
          errorMsg += `\nOutput:\n${errorSnippet}`;
          errorDetails.push(errorMsg);
          logger.warn(`❌ [${source}] ${strategy.name} failed. Output:\n${errorSnippet}`);
        } else {
          errorMsg += ` (no output available)`;
          errorDetails.push(errorMsg);
          logger.warn(`❌ [${source}] ${strategy.name} failed with exit code ${result.exitCode} (no output)`);
        }
        
        // Still check if node_modules was created despite non-zero exit
        if (fs.existsSync(nodeModulesPath)) {
          const expoPath = path.join(nodeModulesPath, 'expo');
          if (fs.existsSync(expoPath)) {
            logger.warn(`⚠️ [${source}] ${strategy.name} had non-zero exit but expo is installed, continuing...`);
            installSuccess = true;
            break;
          }
        }
        
        continue;
      }
      
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
          errorDetails.push(`Strategy "${strategy.name}": node_modules created but expo module not found`);
        }
      } else {
        logger.warn(`⚠️ [${source}] ${strategy.name} completed but no node_modules created`);
        errorDetails.push(`Strategy "${strategy.name}": completed but node_modules directory not created`);
      }
    } catch (error: any) {
      lastError = error;
      
      // Extract error details from exception
      const errorMessage = error.message || String(error);
      let errorOutput = errorMessage;
      
      // Try to get stdout/stderr from error if available
      if (error.stdout || error.stderr) {
        const combined = (error.stderr || '') + '\n' + (error.stdout || '');
        if (combined.trim()) {
          errorOutput = combined.slice(-1000);
          logger.warn(`❌ [${source}] ${strategy.name} error output:\n${errorOutput}`);
        }
      }
      
      errorDetails.push(`Strategy "${strategy.name}" threw error: ${errorMessage}`);
      if (errorOutput && errorOutput !== errorMessage) {
        errorDetails.push(`Error output: ${errorOutput.slice(-500)}`);
      }
      
      logger.warn(`❌ [${source}] ${strategy.name} failed:`, errorMessage);
      if (error.stack) {
        logger.debug(`Error stack: ${error.stack.split('\n').slice(0, 5).join('\n')}`);
      }
      continue;
    }
  }
  
  if (!installSuccess) {
    const errorSummary = errorDetails.length > 0 
      ? `\nInstallation attempts:\n${errorDetails.join('\n')}`
      : '';
    const finalError = lastError 
      ? `${lastError.message || String(lastError)}${errorSummary}`
      : `All ${strategies.length} installation strategies failed${errorSummary}`;
    
    // Store error details for retrieval
    const lockKey = path.resolve(appPath);
    const errorDetailsText = errorDetails.length > 0
      ? `All installation strategies failed:\n${errorDetails.join('\n')}`
      : `All ${strategies.length} installation strategies failed`;
    installationErrors.set(lockKey, errorDetailsText);
    
    logger.error(`❌ [${source}] All installation strategies failed.`);
    logger.error(`Error summary: ${finalError}`);
    
    // Log the last error with full details if available
    if (lastError) {
      const lastErrorDetails = {
        message: lastError.message,
        code: lastError.code,
        signal: lastError.signal,
        stdout: lastError.stdout?.slice(-500),
        stderr: lastError.stderr?.slice(-500)
      };
      logger.error(`Last error details:`, lastErrorDetails);
      
      // Add last error details to stored error
      const storedError = installationErrors.get(lockKey) || '';
      const lastErrorText = `\n\nLast error:\nMessage: ${lastError.message}\nCode: ${lastError.code || 'N/A'}\n${lastError.stdout ? `Stdout: ${lastError.stdout.slice(-500)}` : ''}\n${lastError.stderr ? `Stderr: ${lastError.stderr.slice(-500)}` : ''}`;
      installationErrors.set(lockKey, storedError + lastErrorText);
    }
    
    return false;
  }
  
  // Clear error details on success
  const lockKey = path.resolve(appPath);
  clearInstallationErrorDetails(appPath);
  
  return true;
}

/**
 * Fix BOM and JSON formatting issues in package.json
 * Also fixes invalid package versions that cause ETARGET errors
 */
async function fixPackageJsonIssues(packageJsonPath: string): Promise<void> {
  let content = fs.readFileSync(packageJsonPath, 'utf8');
  
  // Remove BOM if present
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.substring(1);
    logger.info(`🔧 Removed BOM from ${packageJsonPath}`);
  }
  
  // Parse and reformat JSON to ensure it's valid
  let packageJson;
  try {
    packageJson = JSON.parse(content);
  } catch (error) {
    throw new Error(`Invalid JSON in package.json: ${error.message}`);
  }
  
  // Ensure dependencies and devDependencies exist
  if (!packageJson.dependencies) {
    packageJson.dependencies = {};
  }
  if (!packageJson.devDependencies) {
    packageJson.devDependencies = {};
  }
  
  let needsFixing = false;
  
  // CRITICAL: Add npm overrides to force correct versions for transitive dependencies
  // This overrides ANY package's request for these invalid versions, even transitive deps
  if (!packageJson.overrides) {
    packageJson.overrides = {};
    needsFixing = true;
  }
  
  const requiredOverrides = {
    "@react-navigation/core": "^7.0.0",
    "@react-navigation/native": "^7.0.0",
    "@react-navigation/bottom-tabs": "^7.0.0",
    "@react-navigation/native-stack": "^7.0.0",
    "@react-navigation/stack": "^7.0.0"
  };
  
  let overridesAdded = false;
  for (const [pkg, version] of Object.entries(requiredOverrides)) {
    if (!packageJson.overrides[pkg] || packageJson.overrides[pkg] !== version) {
      packageJson.overrides[pkg] = version;
      overridesAdded = true;
      needsFixing = true;
      logger.info(`🔧 Added override: ${pkg} -> ${version}`);
    }
  }
  
  if (overridesAdded) {
    logger.info(`✅ npm overrides configured to force correct React Navigation versions`);
  }
  
  // Fix invalid package versions that cause ETARGET errors
  const versionFixes: Record<string, { invalid: string[]; fix: string }> = {
    "@react-navigation/core": {
      invalid: ["^7.13.5", "7.13.5", "~7.13.5", "7.13", "^7.13", ">=7.13.5", "7.13.5.0"],
      fix: "^7.0.0" // Fix invalid v7 version to valid v7.0.0 (expo-router 5.x requires v7)
    },
    "@react-navigation/native": {
      invalid: ["^7.13.5", "7.13.5"],
      fix: "^7.0.0"
    },
    "@react-navigation/bottom-tabs": {
      invalid: ["^7.13.5", "7.13.5"],
      fix: "^7.0.0"
    },
    "@react-navigation/native-stack": {
      invalid: ["^7.13.5", "7.13.5"],
      fix: "^7.0.0"
    },
    "@react-navigation/stack": {
      invalid: ["^7.13.5", "7.13.5"],
      fix: "^7.0.0"
    },
    "@react-native-async-storage/async-storage": {
      invalid: ["1.25.0"],
      fix: "^1.23.1"
    },
    "@types/react-native": {
      invalid: ["~0.79.0", "~0.80.0"],
      fix: "^0.81.0"
    },
    "expo-battery": {
      invalid: ["~7.0.1"],
      fix: "~6.0.1"
    },
    "typescript": {
      invalid: ["~5.8.3"],
      fix: "~5.3.3"
    }
  };
  
  // Check and fix dependencies
  logger.info(`🔍 Checking package.json for invalid versions...`);
  for (const [pkg, config] of Object.entries(versionFixes)) {
    const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    const currentVersion = allDeps[pkg];
    
    if (currentVersion) {
      logger.info(`Found ${pkg}: ${currentVersion}`);
      
      // Check if version matches any invalid pattern (flexible matching)
      const matchesInvalid = config.invalid.some(inv => {
        // First check exact match (handles most cases)
        if (currentVersion === inv || currentVersion.trim() === inv.trim()) {
          return true;
        }
        
        // Normalize both versions by removing version prefixes
        // Use global flag to replace all prefix characters
        const normalize = (v: string) => v.replace(/^[\^~=<>]+/g, '').trim();
        const normalizedInv = normalize(inv);
        const normalizedCurrent = normalize(currentVersion);
        
        // Check exact match (after normalization)
        if (normalizedCurrent === normalizedInv) {
          return true;
        }
        
        // Check if current version starts with invalid version number
        if (normalizedCurrent.startsWith(normalizedInv)) {
          return true;
        }
        
        // Check if current version contains the invalid version number (without prefix)
        if (currentVersion.includes(normalizedInv)) {
          return true;
        }
        
        // Also check if normalized current starts with any part of normalized invalid
        if (normalizedInv && normalizedCurrent.startsWith(normalizedInv.split('.')[0])) {
          // Check if it's the same major version
          const invMajor = normalizedInv.split('.')[0];
          const currentMajor = normalizedCurrent.split('.')[0];
          if (invMajor === currentMajor && normalizedCurrent.includes(normalizedInv)) {
            return true;
          }
        }
        
        return false;
      });
      
      if (matchesInvalid) {
        if (packageJson.dependencies && packageJson.dependencies[pkg]) {
          const oldVersion = packageJson.dependencies[pkg];
          packageJson.dependencies[pkg] = config.fix;
          needsFixing = true;
          logger.info(`🔧 Fixed ${pkg}: ${oldVersion} -> ${config.fix}`);
        }
        if (packageJson.devDependencies && packageJson.devDependencies[pkg]) {
          const oldVersion = packageJson.devDependencies[pkg];
          packageJson.devDependencies[pkg] = config.fix;
          needsFixing = true;
          logger.info(`🔧 Fixed ${pkg}: ${oldVersion} -> ${config.fix}`);
        }
      } else {
        logger.info(`✓ ${pkg} version ${currentVersion} is valid`);
      }
    }
  }
  
  // Write back the fixed package.json
  const cleanJson = JSON.stringify(packageJson, null, 2);
  fs.writeFileSync(packageJsonPath, cleanJson, 'utf8');
  
  if (needsFixing) {
    // Verify the fix was written
    const verifyContent = fs.readFileSync(packageJsonPath, 'utf8');
    const verifyJson = JSON.parse(verifyContent);
    const verifyDeps = { ...verifyJson.dependencies, ...verifyJson.devDependencies };
    
    logger.info(`✅ Fixed JSON formatting and invalid versions in ${packageJsonPath}`);
    
    // Log what was actually fixed for verification
    for (const [pkg, config] of Object.entries(versionFixes)) {
      if (verifyDeps[pkg]) {
        logger.info(`Verified ${pkg}: ${verifyDeps[pkg]}`);
      }
    }
    
    // Log overrides if they exist
    if (verifyJson.overrides) {
      logger.info(`📋 npm overrides active:`);
      Object.entries(verifyJson.overrides).forEach(([pkg, version]) => {
        logger.info(`  ${pkg}: ${version}`);
      });
    }
  } else {
    logger.info(`🔧 Fixed JSON formatting in ${packageJsonPath}`);
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
