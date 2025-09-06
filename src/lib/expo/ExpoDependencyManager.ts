import { spawn, ChildProcess } from "child_process";
import path from "path";
import fs from "fs-extra";

/**
 * 🚀 Smart Expo Dependency Manager
 * 
 * Handles Expo dependency installation with conflict resolution,
 * automatic fallbacks, and compatibility checking.
 */

interface Logger {
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string, error?: any) => void;
  debug: (message: string) => void;
}

// Simple logger
const logger: Logger = {
  info: (msg) => console.log(`[ExpoDependencyManager] ${msg}`),
  warn: (msg) => console.warn(`[ExpoDependencyManager] ${msg}`),
  error: (msg, err) => console.error(`[ExpoDependencyManager] ${msg}`, err || ''),
  debug: (msg) => console.debug(`[ExpoDependencyManager] ${msg}`)
};

/**
 * Essential Expo packages that should be installed via `expo install`
 */
const EXPO_PACKAGES = new Set([
  'expo',
  'expo-router',
  'expo-status-bar',
  'expo-font',
  'expo-linear-gradient',
  'expo-splash-screen',
  '@expo/vector-icons',
  'expo-sqlite',
  'expo-notifications',
  'expo-device',
  'expo-constants',
  'expo-application',
  'expo-network',
  'expo-battery',
  'expo-camera',
  'expo-media-library',
  'expo-image-picker',
  'expo-image',
  'expo-location',
  'expo-av',
  'expo-haptics',
  'expo-sharing',
  'expo-intent-launcher',
  'expo-contacts',
  'expo-sensors',
  'expo-file-system',
  'expo-screen-orientation',
  'expo-updates',
  'expo-dev-client',
  'expo-dev-menu',
  'react-native-safe-area-context',
  'react-native-screens',
  'react-native-svg',
  'react-native-gesture-handler',
  '@react-native-async-storage/async-storage'
]);

/**
 * Essential TypeScript and dev dependencies
 */
const ESSENTIAL_DEV_DEPS = [
  'typescript',
  '@types/react',
  '@types/react-native',
  'react-dom',
  'react-native-web'
];

export class ExpoDependencyManager {
  private projectPath: string;
  private packageJsonPath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.packageJsonPath = path.join(projectPath, 'package.json');
  }

  /**
   * Install dependencies with smart Expo-aware strategy
   */
  async installDependencies(packages: string[]): Promise<boolean> {
    try {
      logger.info(`🚀 Installing dependencies: ${packages.join(', ')}`);

      // Separate Expo packages from regular packages
      const expoPackages = packages.filter(pkg => this.isExpoPackage(pkg));
      const regularPackages = packages.filter(pkg => !this.isExpoPackage(pkg));

      // Install Expo packages first with expo install
      if (expoPackages.length > 0) {
        logger.info(`📦 Installing Expo packages: ${expoPackages.join(', ')}`);
        const expoSuccess = await this.installWithExpo(expoPackages);
        if (!expoSuccess) {
          logger.warn("Expo install failed, trying npm with legacy peer deps");
          const npmSuccess = await this.installWithNpm([...expoPackages, ...regularPackages], true);
          return npmSuccess;
        }
      }

      // Install regular packages with npm
      if (regularPackages.length > 0) {
        logger.info(`📦 Installing regular packages: ${regularPackages.join(', ')}`);
        const npmSuccess = await this.installWithNpm(regularPackages, false);
        if (!npmSuccess) {
          return false;
        }
      }

      return true;
    } catch (error) {
      logger.error("Failed to install dependencies:", error);
      return false;
    }
  }

  /**
   * Ensure all essential dependencies are present
   */
  async ensureEssentialDependencies(): Promise<boolean> {
    try {
      if (!fs.existsSync(this.packageJsonPath)) {
        logger.warn("No package.json found");
        return false;
      }

      const packageJson = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf8'));
      const allDeps = { 
        ...packageJson.dependencies, 
        ...packageJson.devDependencies 
      };

      // Check for missing essential dev dependencies
      const missingDevDeps = ESSENTIAL_DEV_DEPS.filter(dep => !allDeps[dep]);
      
      if (missingDevDeps.length > 0) {
        logger.info(`📦 Installing missing dev dependencies: ${missingDevDeps.join(', ')}`);
        const success = await this.installWithNpm(missingDevDeps, false, true);
        if (!success) {
          logger.warn("Failed to install dev dependencies, but continuing");
        }
      }

      // Validate that core Expo packages are compatible
      await this.validateExpoCompatibility();

      return true;
    } catch (error) {
      logger.error("Failed to ensure essential dependencies:", error);
      return false;
    }
  }

  /**
   * Install packages using expo install (recommended for Expo packages)
   */
  private async installWithExpo(packages: string[]): Promise<boolean> {
    return new Promise((resolve) => {
      const child = spawn("npx", ["expo", "install", ...packages], {
        cwd: this.projectPath,
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
   * Install packages using npm with smart conflict resolution
   */
  private async installWithNpm(packages: string[], useLegacyPeerDeps: boolean, isDev: boolean = false): Promise<boolean> {
    return new Promise((resolve) => {
      const args = ["install"];
      
      if (isDev) {
        args.push("--save-dev");
      }
      
      if (useLegacyPeerDeps) {
        args.push("--legacy-peer-deps");
      }
      
      args.push("--prefer-offline", "--no-audit", "--no-fund", ...packages);

      const child = spawn("npm", args, {
        cwd: this.projectPath,
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
        // Don't log npm warnings as errors unless they're actual errors
        if (data.toString().includes('error') || data.toString().includes('ERESOLVE')) {
          logger.debug(`[npm install:err] ${data.toString().trim()}`);
        }
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
            this.installWithNpm(packages, true, isDev).then(resolve);
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

  /**
   * Check if a package is an Expo package
   */
  private isExpoPackage(packageName: string): boolean {
    const cleanName = packageName.split('@')[0]; // Remove version specifier
    return EXPO_PACKAGES.has(cleanName) || cleanName.startsWith('expo-') || cleanName.startsWith('@expo/');
  }

  /**
   * Validate that Expo packages are compatible
   */
  private async validateExpoCompatibility(): Promise<void> {
    try {
      const packageJson = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf8'));
      const deps = packageJson.dependencies || {};

      // Check for common conflicts
      const expoFont = deps['expo-font'];
      const expoVectorIcons = deps['@expo/vector-icons'];

      if (expoFont && expoVectorIcons) {
        logger.info(`📋 Checking compatibility: expo-font@${expoFont} with @expo/vector-icons@${expoVectorIcons}`);
        
        // Extract version numbers for basic compatibility check
        const fontVersion = this.extractVersion(expoFont);
        const vectorIconsVersion = this.extractVersion(expoVectorIcons);
        
        if (fontVersion && fontVersion < 14 && vectorIconsVersion && vectorIconsVersion >= 15) {
          logger.warn("⚠️  Potential compatibility issue detected: expo-font < 14 with @expo/vector-icons >= 15");
          logger.info("💡 Consider updating expo-font to ~14.0.4 or later");
        }
      }
    } catch (error) {
      logger.debug("Could not validate Expo compatibility:", error);
    }
  }

  /**
   * Extract major version number from version string
   */
  private extractVersion(versionStr: string): number | null {
    const match = versionStr.match(/(\d+)/);
    return match ? parseInt(match[1]) : null;
  }
}


