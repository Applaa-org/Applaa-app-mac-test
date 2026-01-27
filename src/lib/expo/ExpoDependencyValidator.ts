import fs from 'fs-extra';
import path from 'path';
import { spawn } from 'child_process';

/**
 * 🚨 CRITICAL: Expo Dependency Validator
 * 
 * This validator ensures that all essential Expo dependencies are present
 * before starting the preview. This prevents the "@expo/config-plugins" 
 * and other critical dependency errors that break previews.
 */

interface Logger {
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string, error?: any) => void;
  debug: (message: string) => void;
}

// Simple logger
const logger: Logger = {
  info: (msg) => console.log(`[ExpoDependencyValidator] ${msg}`),
  warn: (msg) => console.warn(`[ExpoDependencyValidator] ${msg}`),
  error: (msg, err) => console.error(`[ExpoDependencyValidator] ${msg}`, err || ''),
  debug: (msg) => console.debug(`[ExpoDependencyValidator] ${msg}`)
};

/**
 * Critical dependencies that MUST be present for Expo to work
 */
const CRITICAL_EXPO_DEPENDENCIES = [
  // Core Expo dependencies
  'expo',
  'expo-router',
  'react',
  'react-native',
  
  // Critical build dependencies
  '@expo/config-plugins',  // 🚨 This was the missing dependency causing the error!
  '@babel/core',
  'typescript',
  
  // Essential runtime dependencies
  'react-native-safe-area-context',
  'react-native-screens',
  '@expo/vector-icons',
  'expo-status-bar',
  'expo-linking',
  
  // Web support dependencies
  'react-dom',
  'react-native-web',
  
  // Common dependencies that prevent bundling errors
  'expo-linear-gradient',
  'react-native-svg',
  'lucide-react-native',
  'expo-font',
  'react-native-gesture-handler',
  'expo-constants',
  'expo-device',
  'expo-splash-screen',
  '@react-native-async-storage/async-storage',
  'expo-system-ui',
  'expo-image'
];

export interface DependencyValidationResult {
  isValid: boolean;
  missingDependencies: string[];
  presentDependencies: string[];
  totalChecked: number;
  criticalMissing: string[];
}

/**
 * Validate that all critical Expo dependencies are present
 */
export async function validateExpoDependencies(appPath: string): Promise<DependencyValidationResult> {
  try {
    logger.info(`🔍 Validating dependencies for: ${appPath}`);
    
    const packageJsonPath = path.join(appPath, 'package.json');
    const nodeModulesPath = path.join(appPath, 'node_modules');
    
    // Check if package.json exists
    if (!fs.existsSync(packageJsonPath)) {
      throw new Error('package.json not found');
    }
    
    // Check if node_modules exists
    if (!fs.existsSync(nodeModulesPath)) {
      logger.warn('node_modules directory not found');
      return {
        isValid: false,
        missingDependencies: CRITICAL_EXPO_DEPENDENCIES,
        presentDependencies: [],
        totalChecked: CRITICAL_EXPO_DEPENDENCIES.length,
        criticalMissing: CRITICAL_EXPO_DEPENDENCIES
      };
    }
    
    // Read package.json
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };
    
    const missingDependencies: string[] = [];
    const presentDependencies: string[] = [];
    const criticalMissing: string[] = [];
    
    // Check each critical dependency
    for (const dep of CRITICAL_EXPO_DEPENDENCIES) {
      const isPresent = await checkDependencyExists(appPath, dep, allDeps);
      
      if (isPresent) {
        presentDependencies.push(dep);
      } else {
        missingDependencies.push(dep);
        
        // Mark critical dependencies that will definitely break the app
        if (['@expo/config-plugins', 'expo', 'expo-router', 'react', 'react-native'].includes(dep)) {
          criticalMissing.push(dep);
        }
      }
    }
    
    const isValid = missingDependencies.length === 0;
    
    logger.info(`📊 Validation complete: ${presentDependencies.length}/${CRITICAL_EXPO_DEPENDENCIES.length} dependencies present`);
    
    if (!isValid) {
      logger.warn(`🚨 Missing ${missingDependencies.length} dependencies: ${missingDependencies.join(', ')}`);
      if (criticalMissing.length > 0) {
        logger.error(`💥 Critical dependencies missing: ${criticalMissing.join(', ')}`);
      }
    } else {
      logger.info('✅ All critical dependencies validated');
    }
    
    return {
      isValid,
      missingDependencies,
      presentDependencies,
      totalChecked: CRITICAL_EXPO_DEPENDENCIES.length,
      criticalMissing
    };
    
  } catch (error) {
    logger.error('Failed to validate dependencies:', error);
    throw error;
  }
}

/**
 * Check if a specific dependency exists (both in package.json and node_modules)
 */
async function checkDependencyExists(
  appPath: string, 
  dependency: string, 
  allDeps: Record<string, string>
): Promise<boolean> {
  try {
    // First check if it's in package.json
    const inPackageJson = !!allDeps[dependency];
    
    if (!inPackageJson) {
      return false;
    }
    
    // Then check if the actual module exists in node_modules
    const modulePath = path.join(appPath, 'node_modules', dependency);
    const moduleExists = fs.existsSync(modulePath);
    
    if (!moduleExists) {
      logger.debug(`📦 ${dependency} in package.json but missing from node_modules`);
      return false;
    }
    
    // For @expo/config-plugins, also check if the specific file exists
    if (dependency === '@expo/config-plugins') {
      const configPluginsPath = path.join(modulePath, 'build', 'index.js');
      if (!fs.existsSync(configPluginsPath)) {
        logger.debug(`📦 ${dependency} module exists but build/index.js is missing`);
        return false;
      }
    }
    
    return true;
    
  } catch (error) {
    logger.debug(`Error checking dependency ${dependency}:`, error);
    return false;
  }
}

/**
 * Install missing dependencies using the best available package manager
 */
export async function installMissingDependencies(
  appPath: string, 
  missingDependencies: string[]
): Promise<boolean> {
  try {
    logger.info(`📦 Installing ${missingDependencies.length} missing dependencies: ${missingDependencies.join(', ')}`);
    
    // Separate Expo packages from regular packages
    const expoPackages = missingDependencies.filter(dep => 
      dep.startsWith('expo-') || dep.startsWith('@expo/') || dep === 'expo'
    );
    const regularPackages = missingDependencies.filter(dep => !expoPackages.includes(dep));
    
    let allSuccess = true;
    
    // Install Expo packages first using expo install (recommended)
    if (expoPackages.length > 0) {
      logger.info(`📦 Installing Expo packages: ${expoPackages.join(', ')}`);
      const expoSuccess = await installWithExpo(appPath, expoPackages);
      if (!expoSuccess) {
        logger.warn('Expo install failed, trying npm fallback');
        const npmSuccess = await installWithNpm(appPath, expoPackages, true);
        if (!npmSuccess) allSuccess = false;
      }
    }
    
    // Install regular packages with npm
    if (regularPackages.length > 0) {
      logger.info(`📦 Installing regular packages: ${regularPackages.join(', ')}`);
      const npmSuccess = await installWithNpm(appPath, regularPackages, false);
      if (!npmSuccess) allSuccess = false;
    }
    
    if (allSuccess) {
      logger.info('✅ All missing dependencies installed successfully');
    } else {
      logger.error('❌ Some dependencies failed to install');
    }
    
    return allSuccess;
    
  } catch (error) {
    logger.error('Failed to install missing dependencies:', error);
    return false;
  }
}

/**
 * Install packages using expo install
 */
async function installWithExpo(appPath: string, packages: string[]): Promise<boolean> {
  return new Promise((resolve) => {
    logger.info(`🚀 Running: npx expo install ${packages.join(' ')}`);
    
    const child = spawn("npx", ["expo", "install", ...packages], {
      cwd: appPath,
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        EXPO_NO_DOCTOR: "1",
        EXPO_NO_UPDATE_CHECK: "1",
        EXPO_NO_TELEMETRY: "1"
      }
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
      logger.debug(`[expo install] ${data.toString().trim()}`);
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
      logger.debug(`[expo install:err] ${data.toString().trim()}`);
    });

    child.on('close', (code) => {
      if (code === 0) {
        logger.info("✅ Expo install completed successfully");
        resolve(true);
      } else {
        logger.error(`❌ Expo install failed with code ${code}`);
        logger.error("STDOUT:", stdout);
        logger.error("STDERR:", stderr);
        resolve(false);
      }
    });

    child.on('error', (error) => {
      logger.error("❌ Expo install process error:", error);
      resolve(false);
    });

    // Timeout after 2 minutes
    setTimeout(() => {
      child.kill();
      logger.error("❌ Expo install timed out");
      resolve(false);
    }, 120000);
  });
}

/**
 * Install packages using npm
 */
async function installWithNpm(appPath: string, packages: string[], useLegacyPeerDeps: boolean): Promise<boolean> {
  return new Promise((resolve) => {
    const args = ["install", "--prefer-offline", "--no-audit", "--no-fund"];
    
    if (useLegacyPeerDeps) {
      args.push("--legacy-peer-deps");
    }
    
    args.push(...packages);
    
    logger.info(`🚀 Running: npm ${args.join(' ')}`);
    
    const child = spawn("npm", args, {
      cwd: appPath,
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
      logger.debug(`[npm install] ${data.toString().trim()}`);
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
      logger.debug(`[npm install:err] ${data.toString().trim()}`);
    });

    child.on('close', (code) => {
      if (code === 0) {
        logger.info("✅ npm install completed successfully");
        resolve(true);
      } else {
        logger.error(`❌ npm install failed with code ${code}`);
        if (stderr.includes('ERESOLVE') && !useLegacyPeerDeps) {
          logger.info("🔄 Retrying with --legacy-peer-deps");
          // Retry with legacy peer deps
          installWithNpm(appPath, packages, true).then(resolve);
          return;
        }
        logger.error("STDERR:", stderr);
        resolve(false);
      }
    });

    child.on('error', (error) => {
      logger.error("❌ npm install process error:", error);
      resolve(false);
    });

    // Timeout after 3 minutes
    setTimeout(() => {
      child.kill();
      logger.error("❌ npm install timed out");
      resolve(false);
    }, 180000);
  });
}
