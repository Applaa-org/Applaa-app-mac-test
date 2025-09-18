import { ipcMain } from "electron";
import { spawn, ChildProcess } from "child_process";
import * as fs from "fs";
import * as path from "path";
import log from "electron-log";
import { db } from "../../db";
import { apps } from "../../db/schema";
import { eq } from "drizzle-orm";
import { getDyadAppPath } from "../../paths/paths";

const logger = log.scope('local-build-handlers');

interface LocalBuildResult {
  success: boolean;
  buildPath?: string;
  buildType?: 'apk' | 'ipa' | 'aab';
  error?: string;
  logs?: string[];
}

// Global build process tracking
let currentBuildProcess: ChildProcess | null = null;

export function registerLocalBuildHandlers() {
  logger.info("🔨 Registering Local Build handlers...");

  // Build Android APK locally
  ipcMain.handle("local-build:android-apk", async (event, { appId }: { appId: number }) => {
    try {
      logger.log(`🔨 Starting local Android APK build for app ${appId}`);
      
      // Get app data
      const [appData] = await db.select().from(apps).where(eq(apps.id, appId)).limit(1);
      if (!appData) {
        throw new Error("App not found");
      }

      const appPath = getDyadAppPath(appData.path);
      logger.log(`Building APK in: ${appPath}`);

      // Check if it's an Expo app
      const packageJsonPath = path.join(appPath, 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        throw new Error("package.json not found - not a valid app");
      }

      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      if (!packageJson.dependencies?.expo) {
        throw new Error("This is not an Expo app - local builds only work with Expo apps");
      }

      // Stop any existing build process
      if (currentBuildProcess) {
        currentBuildProcess.kill('SIGTERM');
        currentBuildProcess = null;
      }

      const logs: string[] = [];
      const buildResult = await buildAndroidAPK(appPath, logs, appId);
      
      return buildResult;
    } catch (error: any) {
      logger.error(`❌ Local Android APK build failed for app ${appId}: ${error.message}`);
      return {
        success: false,
        error: error.message,
        logs: []
      };
    }
  });

  // Build Android AAB locally
  ipcMain.handle("local-build:android-aab", async (event, { appId }: { appId: number }) => {
    try {
      logger.log(`🔨 Starting local Android AAB build for app ${appId}`);
      
      // Get app data
      const [appData] = await db.select().from(apps).where(eq(apps.id, appId)).limit(1);
      if (!appData) {
        throw new Error("App not found");
      }

      const appPath = getDyadAppPath(appData.path);
      logger.log(`Building AAB in: ${appPath}`);

      // Check if it's an Expo app
      const packageJsonPath = path.join(appPath, 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        throw new Error("package.json not found - not a valid app");
      }

      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      if (!packageJson.dependencies?.expo) {
        throw new Error("This is not an Expo app - local builds only work with Expo apps");
      }

      // Stop any existing build process
      if (currentBuildProcess) {
        currentBuildProcess.kill('SIGTERM');
        currentBuildProcess = null;
      }

      const logs: string[] = [];
      const buildResult = await buildAndroidAAB(appPath, logs, appId);
      
      return buildResult;
    } catch (error: any) {
      logger.error(`❌ Local Android AAB build failed for app ${appId}: ${error.message}`);
      return {
        success: false,
        error: error.message,
        logs: []
      };
    }
  });

  // Build iOS IPA locally (requires macOS and Xcode)
  ipcMain.handle("local-build:ios-ipa", async (event, { appId }: { appId: number }) => {
    try {
      logger.log(`🔨 Starting local iOS IPA build for app ${appId}`);
      
      // Check if running on macOS
      if (process.platform !== 'darwin') {
        throw new Error("iOS builds are only supported on macOS with Xcode installed");
      }

      // Get app data
      const [appData] = await db.select().from(apps).where(eq(apps.id, appId)).limit(1);
      if (!appData) {
        throw new Error("App not found");
      }

      const appPath = getDyadAppPath(appData.path);
      logger.log(`Building IPA in: ${appPath}`);

      // Check if it's an Expo app
      const packageJsonPath = path.join(appPath, 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        throw new Error("package.json not found - not a valid app");
      }

      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      if (!packageJson.dependencies?.expo) {
        throw new Error("This is not an Expo app - local builds only work with Expo apps");
      }

      // Stop any existing build process
      if (currentBuildProcess) {
        currentBuildProcess.kill('SIGTERM');
        currentBuildProcess = null;
      }

      const logs: string[] = [];
      const buildResult = await buildIOSIPA(appPath, logs, appId);
      
      return buildResult;
    } catch (error: any) {
      logger.error(`❌ Local iOS IPA build failed for app ${appId}: ${error.message}`);
      return {
        success: false,
        error: error.message,
        logs: []
      };
    }
  });

  // Get build status
  ipcMain.handle("local-build:status", async () => {
    return {
      isBuilding: currentBuildProcess !== null,
      processId: currentBuildProcess?.pid || null
    };
  });

  // Cancel current build
  ipcMain.handle("local-build:cancel", async () => {
    if (currentBuildProcess) {
      currentBuildProcess.kill('SIGTERM');
      currentBuildProcess = null;
      logger.log("🛑 Local build cancelled by user");
      return { success: true };
    }
    return { success: false, error: "No build in progress" };
  });

  logger.info("✅ Local Build handlers registered successfully");
}

/**
 * Build Android APK using Gradle directly
 */
async function buildAndroidAPK(appPath: string, logs: string[], appId: number): Promise<LocalBuildResult> {
  return new Promise((resolve) => {
    logs.push("🔨 Starting Android APK build...");
    logs.push("📱 This will create a debug APK file");
    
    const androidPath = path.join(appPath, 'android');
    if (!fs.existsSync(androidPath)) {
      resolve({
        success: false,
        error: "Android directory not found. Make sure this is an Expo app with Android support.",
        logs
      });
      return;
    }
    
    // Ensure NDK version is set to use available version
    await ensureNDKVersion(androidPath, logs);
    
    // Use Gradle directly to build APK without installing
    currentBuildProcess = spawn('./gradlew', ['app:assembleDebug', '-x', 'lint', '-x', 'test'], {
      cwd: androidPath,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let errorOutput = '';

    currentBuildProcess.stdout?.on('data', (data) => {
      const text = data.toString();
      output += text;
      logs.push(text.trim());
      logger.log(`APK Build: ${text.trim()}`);
    });

    currentBuildProcess.stderr?.on('data', (data) => {
      const text = data.toString();
      errorOutput += text;
      logs.push(`ERROR: ${text.trim()}`);
      logger.error(`APK Build Error: ${text.trim()}`);
    });

    currentBuildProcess.on('close', (code) => {
      currentBuildProcess = null;
      
      if (code === 0) {
        // Look for the generated APK file
        const apkPath = findGeneratedAPK(appPath);
        if (apkPath) {
          logs.push(`✅ APK build completed successfully!`);
          logs.push(`📱 APK location: ${apkPath}`);
          
          // Save APK path to database
          try {
            db.update(apps)
              .set({
                localApkPath: apkPath,
                localApkBuiltAt: new Date(),
                lastDeploymentAt: new Date(),
                deploymentStatus: 'deployed'
              })
              .where(eq(apps.id, appId))
              .then(() => {
                logs.push(`💾 APK path saved to database`);
              })
              .catch((error: any) => {
                logs.push(`⚠️ Failed to save APK path: ${error.message}`);
              });
          } catch (error: any) {
            logs.push(`⚠️ Failed to save APK path: ${error.message}`);
          }
          
          resolve({
            success: true,
            buildPath: apkPath,
            buildType: 'apk',
            logs
          });
        } else {
          logs.push(`⚠️ Build completed but APK file not found`);
          resolve({
            success: false,
            error: "Build completed but APK file not found",
            logs
          });
        }
      } else {
        logs.push(`❌ APK build failed with exit code ${code}`);
        resolve({
          success: false,
          error: `Build failed with exit code ${code}. ${errorOutput}`,
          logs
        });
      }
    });

    currentBuildProcess.on('error', (error) => {
      currentBuildProcess = null;
      logs.push(`❌ Build process error: ${error.message}`);
      resolve({
        success: false,
        error: error.message,
        logs
      });
    });
  });
}

/**
 * Build Android AAB using Gradle directly
 */
async function buildAndroidAAB(appPath: string, logs: string[], appId: number): Promise<LocalBuildResult> {
  return new Promise((resolve) => {
    logs.push("🔨 Starting Android AAB build...");
    logs.push("📱 This will create a release AAB file for Play Store");
    
    const androidPath = path.join(appPath, 'android');
    if (!fs.existsSync(androidPath)) {
      resolve({
        success: false,
        error: "Android directory not found. Make sure this is an Expo app with Android support.",
        logs
      });
      return;
    }
    
    // Ensure NDK version is set to use available version
    await ensureNDKVersion(androidPath, logs);
    
    // Use Gradle directly to build AAB without installing
    currentBuildProcess = spawn('./gradlew', ['app:bundleRelease', '-x', 'lint', '-x', 'test'], {
      cwd: androidPath,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let errorOutput = '';

    currentBuildProcess.stdout?.on('data', (data) => {
      const text = data.toString();
      output += text;
      logs.push(text.trim());
      logger.log(`AAB Build: ${text.trim()}`);
    });

    currentBuildProcess.stderr?.on('data', (data) => {
      const text = data.toString();
      errorOutput += text;
      logs.push(`ERROR: ${text.trim()}`);
      logger.error(`AAB Build Error: ${text.trim()}`);
    });

    currentBuildProcess.on('close', (code) => {
      currentBuildProcess = null;
      
      if (code === 0) {
        // Look for the generated AAB file
        const aabPath = findGeneratedAAB(appPath);
        if (aabPath) {
          logs.push(`✅ AAB build completed successfully!`);
          logs.push(`📱 AAB location: ${aabPath}`);
          
          // Save AAB path to database
          try {
            db.update(apps)
              .set({
                localAabPath: aabPath,
                localAabBuiltAt: new Date(),
                lastDeploymentAt: new Date(),
                deploymentStatus: 'deployed'
              })
              .where(eq(apps.id, appId))
              .then(() => {
                logs.push(`💾 AAB path saved to database`);
              })
              .catch((error: any) => {
                logs.push(`⚠️ Failed to save AAB path: ${error.message}`);
              });
          } catch (error: any) {
            logs.push(`⚠️ Failed to save AAB path: ${error.message}`);
          }
          
          resolve({
            success: true,
            buildPath: aabPath,
            buildType: 'aab',
            logs
          });
        } else {
          logs.push(`⚠️ Build completed but AAB file not found`);
          resolve({
            success: false,
            error: "Build completed but AAB file not found",
            logs
          });
        }
      } else {
        logs.push(`❌ AAB build failed with exit code ${code}`);
        resolve({
          success: false,
          error: `Build failed with exit code ${code}. ${errorOutput}`,
          logs
        });
      }
    });

    currentBuildProcess.on('error', (error) => {
      currentBuildProcess = null;
      logs.push(`❌ Build process error: ${error.message}`);
      resolve({
        success: false,
        error: error.message,
        logs
      });
    });
  });
}

/**
 * Build iOS IPA using xcodebuild directly
 */
async function buildIOSIPA(appPath: string, logs: string[], appId: number): Promise<LocalBuildResult> {
  return new Promise((resolve) => {
    logs.push("🔨 Starting iOS IPA build...");
    logs.push("🍎 This will create an IPA file (requires Xcode)");
    
    const iosPath = path.join(appPath, 'ios');
    if (!fs.existsSync(iosPath)) {
      resolve({
        success: false,
        error: "iOS directory not found. Make sure this is an Expo app with iOS support.",
        logs
      });
      return;
    }
    
    // Find the .xcworkspace file
    const workspaceFiles = fs.readdirSync(iosPath).filter(file => file.endsWith('.xcworkspace'));
    if (workspaceFiles.length === 0) {
      resolve({
        success: false,
        error: "No .xcworkspace file found in iOS directory",
        logs
      });
      return;
    }
    
    const workspaceFile = workspaceFiles[0];
    const workspacePath = path.join(iosPath, workspaceFile);
    
    // Use xcodebuild to create archive and export IPA
    currentBuildProcess = spawn('xcodebuild', [
      '-workspace', workspacePath,
      '-scheme', 'App', // Default scheme name for Expo apps
      '-configuration', 'Release',
      '-archivePath', path.join(iosPath, 'App.xcarchive'),
      'archive'
    ], {
      cwd: iosPath,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let errorOutput = '';

    currentBuildProcess.stdout?.on('data', (data) => {
      const text = data.toString();
      output += text;
      logs.push(text.trim());
      logger.log(`IPA Build: ${text.trim()}`);
    });

    currentBuildProcess.stderr?.on('data', (data) => {
      const text = data.toString();
      errorOutput += text;
      logs.push(`ERROR: ${text.trim()}`);
      logger.error(`IPA Build Error: ${text.trim()}`);
    });

    currentBuildProcess.on('close', (code) => {
      currentBuildProcess = null;
      
      if (code === 0) {
        // Look for the generated IPA file
        const ipaPath = findGeneratedIPA(appPath);
        if (ipaPath) {
          logs.push(`✅ IPA build completed successfully!`);
          logs.push(`🍎 IPA location: ${ipaPath}`);
          
          // Save IPA path to database
          try {
            db.update(apps)
              .set({
                localIpaPath: ipaPath,
                localIpaBuiltAt: new Date(),
                lastDeploymentAt: new Date(),
                deploymentStatus: 'deployed'
              })
              .where(eq(apps.id, appId))
              .then(() => {
                logs.push(`💾 IPA path saved to database`);
              })
              .catch((error: any) => {
                logs.push(`⚠️ Failed to save IPA path: ${error.message}`);
              });
          } catch (error: any) {
            logs.push(`⚠️ Failed to save IPA path: ${error.message}`);
          }
          
          resolve({
            success: true,
            buildPath: ipaPath,
            buildType: 'ipa',
            logs
          });
        } else {
          logs.push(`⚠️ Build completed but IPA file not found`);
          resolve({
            success: false,
            error: "Build completed but IPA file not found",
            logs
          });
        }
      } else {
        logs.push(`❌ IPA build failed with exit code ${code}`);
        resolve({
          success: false,
          error: `Build failed with exit code ${code}. ${errorOutput}`,
          logs
        });
      }
    });

    currentBuildProcess.on('error', (error) => {
      currentBuildProcess = null;
      logs.push(`❌ Build process error: ${error.message}`);
      resolve({
        success: false,
        error: error.message,
        logs
      });
    });
  });
}

/**
 * Find the generated APK file
 */
function findGeneratedAPK(appPath: string): string | null {
  const androidPath = path.join(appPath, 'android');
  if (!fs.existsSync(androidPath)) {
    return null;
  }

  // Look for APK in the typical Android build output directory
  const apkPaths = [
    path.join(androidPath, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk'),
    path.join(androidPath, 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk'),
  ];

  for (const apkPath of apkPaths) {
    if (fs.existsSync(apkPath)) {
      return apkPath;
    }
  }

  // Search recursively for .apk files
  return findFileRecursively(androidPath, '.apk');
}

/**
 * Find the generated AAB file
 */
function findGeneratedAAB(appPath: string): string | null {
  const androidPath = path.join(appPath, 'android');
  if (!fs.existsSync(androidPath)) {
    return null;
  }

  // Look for AAB in the typical Android build output directory
  const aabPath = path.join(androidPath, 'app', 'build', 'outputs', 'bundle', 'release', 'app-release.aab');
  
  if (fs.existsSync(aabPath)) {
    return aabPath;
  }

  // Search recursively for .aab files
  return findFileRecursively(androidPath, '.aab');
}

/**
 * Find the generated IPA file
 */
function findGeneratedIPA(appPath: string): string | null {
  const iosPath = path.join(appPath, 'ios');
  if (!fs.existsSync(iosPath)) {
    return null;
  }

  // Search recursively for .ipa files
  return findFileRecursively(iosPath, '.ipa');
}

/**
 * Recursively search for a file with specific extension
 */
function findFileRecursively(dir: string, extension: string): string | null {
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        const found = findFileRecursively(fullPath, extension);
        if (found) return found;
      } else if (item.endsWith(extension)) {
        return fullPath;
      }
    }
  } catch (error) {
    // Ignore permission errors
  }
  
  return null;
}

/**
 * Ensure NDK version is set to use available version
 */
async function ensureNDKVersion(androidPath: string, logs: string[]): Promise<void> {
  try {
    const gradlePropertiesPath = path.join(androidPath, 'gradle.properties');
    
    if (!fs.existsSync(gradlePropertiesPath)) {
      logs.push("⚠️ gradle.properties not found, creating one...");
      fs.writeFileSync(gradlePropertiesPath, '');
    }
    
    let gradleProperties = fs.readFileSync(gradlePropertiesPath, 'utf8');
    
    // Check if NDK version is already specified
    if (!gradleProperties.includes('android.ndkVersion')) {
      // Add NDK version to use the available version
      const ndkVersion = '26.1.10909125'; // The version we found installed
      gradleProperties += `\n# Use available NDK version\nandroid.ndkVersion=${ndkVersion}\n`;
      
      fs.writeFileSync(gradlePropertiesPath, gradleProperties);
      logs.push(`✅ Set NDK version to ${ndkVersion} in gradle.properties`);
    } else {
      logs.push("ℹ️ NDK version already specified in gradle.properties");
    }
  } catch (error: any) {
    logs.push(`⚠️ Could not set NDK version: ${error.message}`);
  }
}
