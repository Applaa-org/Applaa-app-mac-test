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
      const emit = (line: string) => {
        try { event.sender.send('local-build:log', { type: 'apk', line }); } catch {}
      };
      const buildResult = await buildAndroidAPK(appPath, logs, appId, emit);
      
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
      const emit = (line: string) => {
        try { event.sender.send('local-build:log', { type: 'aab', line }); } catch {}
      };
      const buildResult = await buildAndroidAAB(appPath, logs, appId, emit);
      
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
      const emit = (line: string) => {
        try { event.sender.send('local-build:log', { type: 'ipa', line }); } catch {}
      };
      const buildResult = await buildIOSIPA(appPath, logs, appId, emit);
      
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

}

/**
 * Build Android APK using Gradle directly
 */
async function buildAndroidAPK(appPath: string, logs: string[], appId: number, emit?: (line: string) => void): Promise<LocalBuildResult> {
  return new Promise(async (resolve) => {
    logs.push("🔨 Starting Android APK build..."); emit?.("🔨 Starting Android APK build...");
    logs.push("📱 This will create a debug APK file"); emit?.("📱 This will create a debug APK file");
    
    const androidPath = path.join(appPath, 'android');
    if (!fs.existsSync(androidPath)) {
      logs.push("📱 Android directory not found. Running expo prebuild to generate native Android files..."); emit?.("📱 Android directory not found. Running expo prebuild to generate native Android files...");
      
      try {
        // Run expo prebuild to generate Android platform files
        const prebuildResult = await runExpoPrebuild(appPath, logs, 'android');
        if (!prebuildResult.success) {
      resolve({
        success: false,
            error: `Failed to generate Android platform files: ${prebuildResult.error}`,
        logs
      });
      return;
        }
        
        logs.push("✅ Android platform files generated successfully!"); emit?.("✅ Android platform files generated successfully!");
        
        // Check again if Android directory exists
        if (!fs.existsSync(androidPath)) {
          resolve({
            success: false,
            error: "Android directory still not found after prebuild. Check your app configuration.",
            logs
          });
          return;
        }
      } catch (error: any) {
        resolve({
          success: false,
          error: `Failed to run expo prebuild: ${error.message}`,
          logs
        });
        return;
      }
    }
    
    // Ensure NDK version is set to use available version
    ensureNDKVersion(androidPath, logs); emit?.("🧩 Ensured NDK version in gradle.properties");
    
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
      const line = text.trim();
      logs.push(line);
      emit?.(line);
      logger.log(`APK Build: ${text.trim()}`);
    });

    currentBuildProcess.stderr?.on('data', (data) => {
      const text = data.toString();
      errorOutput += text;
      const line = `ERROR: ${text.trim()}`;
      logs.push(line);
      emit?.(line);
      logger.error(`APK Build Error: ${text.trim()}`);
    });

    currentBuildProcess.on('close', (code) => {
      currentBuildProcess = null;
      
      if (code === 0) {
        // Look for the generated APK file
        const apkPath = findGeneratedAPK(appPath);
        if (apkPath) {
          logs.push(`✅ APK build completed successfully!`); emit?.("✅ APK build completed successfully!");
          logs.push(`📱 APK location: ${apkPath}`); emit?.(`📱 APK location: ${apkPath}`);
          
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
                logs.push(`💾 APK path saved to database`); emit?.("💾 APK path saved to database");
              })
              .catch((error: any) => {
                logs.push(`⚠️ Failed to save APK path: ${error.message}`); emit?.(`⚠️ Failed to save APK path: ${error.message}`);
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
          logs.push(`⚠️ Build completed but APK file not found`); emit?.("⚠️ Build completed but APK file not found");
          resolve({
            success: false,
            error: "Build completed but APK file not found",
            logs
          });
        }
      } else {
        logs.push(`❌ APK build failed with exit code ${code}`); emit?.(`❌ APK build failed with exit code ${code}`);
        resolve({
          success: false,
          error: `Build failed with exit code ${code}. ${errorOutput}`,
          logs
        });
      }
    });

    currentBuildProcess.on('error', (error) => {
      currentBuildProcess = null;
      logs.push(`❌ Build process error: ${error.message}`); emit?.(`❌ Build process error: ${error.message}`);
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
async function buildAndroidAAB(appPath: string, logs: string[], appId: number, emit?: (line: string) => void): Promise<LocalBuildResult> {
  return new Promise(async (resolve) => {
    logs.push("🔨 Starting Android AAB build..."); emit?.("🔨 Starting Android AAB build...");
    logs.push("📱 This will create a release AAB file for Play Store"); emit?.("📱 This will create a release AAB file for Play Store");
    
    const androidPath = path.join(appPath, 'android');
    if (!fs.existsSync(androidPath)) {
      logs.push("📱 Android directory not found. Running expo prebuild to generate native Android files..."); emit?.("📱 Android directory not found. Running expo prebuild to generate native Android files...");
      
      try {
        // Run expo prebuild to generate Android platform files
        const prebuildResult = await runExpoPrebuild(appPath, logs, 'android');
        if (!prebuildResult.success) {
      resolve({
        success: false,
            error: `Failed to generate Android platform files: ${prebuildResult.error}`,
        logs
      });
      return;
        }
        
        logs.push("✅ Android platform files generated successfully!"); emit?.("✅ Android platform files generated successfully!");
        
        // Check again if Android directory exists
        if (!fs.existsSync(androidPath)) {
          resolve({
            success: false,
            error: "Android directory still not found after prebuild. Check your app configuration.",
            logs
          });
          return;
        }
      } catch (error: any) {
        resolve({
          success: false,
          error: `Failed to run expo prebuild: ${error.message}`,
          logs
        });
        return;
      }
    }
    
    // Ensure NDK version is set to use available version
    ensureNDKVersion(androidPath, logs); emit?.("🧩 Ensured NDK version in gradle.properties");
    
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
      const line = text.trim();
      logs.push(line);
      emit?.(line);
      logger.log(`AAB Build: ${text.trim()}`);
    });

    currentBuildProcess.stderr?.on('data', (data) => {
      const text = data.toString();
      errorOutput += text;
      const line = `ERROR: ${text.trim()}`;
      logs.push(line);
      emit?.(line);
      logger.error(`AAB Build Error: ${text.trim()}`);
    });

    currentBuildProcess.on('close', (code) => {
      currentBuildProcess = null;
      
      if (code === 0) {
        // Look for the generated AAB file
        const aabPath = findGeneratedAAB(appPath);
        if (aabPath) {
          logs.push(`✅ AAB build completed successfully!`); emit?.("✅ AAB build completed successfully!");
          logs.push(`📱 AAB location: ${aabPath}`); emit?.(`📱 AAB location: ${aabPath}`);
          
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
                logs.push(`💾 AAB path saved to database`); emit?.("💾 AAB path saved to database");
              })
              .catch((error: any) => {
                logs.push(`⚠️ Failed to save AAB path: ${error.message}`); emit?.(`⚠️ Failed to save AAB path: ${error.message}`);
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
          logs.push(`⚠️ Build completed but AAB file not found`); emit?.("⚠️ Build completed but AAB file not found");
          resolve({
            success: false,
            error: "Build completed but AAB file not found",
            logs
          });
        }
      } else {
        logs.push(`❌ AAB build failed with exit code ${code}`); emit?.(`❌ AAB build failed with exit code ${code}`);
        resolve({
          success: false,
          error: `Build failed with exit code ${code}. ${errorOutput}`,
          logs
        });
      }
    });

    currentBuildProcess.on('error', (error) => {
      currentBuildProcess = null;
      logs.push(`❌ Build process error: ${error.message}`); emit?.(`❌ Build process error: ${error.message}`);
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
  return new Promise(async (resolve) => {
    logs.push("🔨 Starting iOS IPA build...");
    logs.push("🍎 This will create an IPA file (requires Xcode)");
    
    const iosPath = path.join(appPath, 'ios');
    if (!fs.existsSync(iosPath)) {
      logs.push("📱 iOS directory not found. Running expo prebuild to generate native iOS files...");
      
      try {
        // Run expo prebuild to generate iOS platform files
        const prebuildResult = await runExpoPrebuild(appPath, logs, 'ios');
        if (!prebuildResult.success) {
      resolve({
        success: false,
            error: `Failed to generate iOS platform files: ${prebuildResult.error}`,
        logs
      });
      return;
        }
        
        logs.push("✅ iOS platform files generated successfully!");
        
        // Check again if iOS directory exists
        if (!fs.existsSync(iosPath)) {
          resolve({
            success: false,
            error: "iOS directory still not found after prebuild. Check your app configuration.",
            logs
          });
          return;
        }
      } catch (error: any) {
        resolve({
          success: false,
          error: `Failed to run expo prebuild: ${error.message}`,
          logs
        });
        return;
      }
    }
    
    const workspaceFile = workspaceFiles[0];
    const workspacePath = path.join(iosPath, workspaceFile);
    
    try {
      // Detect the correct scheme name
      const schemeName = await detectSchemeName(workspacePath, logs);
      if (!schemeName) {
        resolve({
          success: false,
          error: "Could not detect scheme name from workspace",
          logs
        });
        return;
      }
      
      logs.push(`📋 Using scheme: ${schemeName}`);
      
      // Create export options plist
      const exportOptionsPath = await createExportOptionsPlist(iosPath, logs);
      
      // Step 1: Create archive
      logs.push("📦 Creating archive...");
      const archivePath = path.join(iosPath, `${schemeName}.xcarchive`);
      
      const archiveResult = await runXcodeBuild([
        '-workspace', workspacePath,
        '-scheme', schemeName,
        '-configuration', 'Release',
        '-destination', 'generic/platform=iOS',
        '-archivePath', archivePath,
        'archive'
      ], iosPath, logs);
      
      if (!archiveResult.success) {
        resolve({
          success: false,
          error: `Archive creation failed: ${archiveResult.error}`,
          logs
        });
        return;
      }
      
      // Step 2: Export IPA from archive
      logs.push("📱 Exporting IPA from archive...");
      const exportPath = path.join(iosPath, 'export');
      
      // Clean up any existing export directory
      if (fs.existsSync(exportPath)) {
        fs.rmSync(exportPath, { recursive: true, force: true });
        logs.push("🧹 Cleaned up existing export directory");
      }
      
      const exportResult = await runXcodeBuild([
        '-exportArchive',
        '-archivePath', archivePath,
        '-exportPath', exportPath,
        '-exportOptionsPlist', exportOptionsPath
      ], iosPath, logs);
      
      if (!exportResult.success) {
        // Try alternative export method if first attempt fails
        logs.push("⚠️ First export attempt failed, trying alternative method...");
        
        // Create a simpler export options plist
        const simpleExportOptionsPath = path.join(iosPath, 'SimpleExportOptions.plist');
        const simplePlistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>development</string>
    <key>compileBitcode</key>
    <false/>
    <key>stripSwiftSymbols</key>
    <true/>
    <key>thinning</key>
    <string>&lt;none&gt;</string>
</dict>
</plist>`;
        
        fs.writeFileSync(simpleExportOptionsPath, simplePlistContent);
        
        const retryResult = await runXcodeBuild([
          '-exportArchive',
          '-archivePath', archivePath,
          '-exportPath', exportPath,
          '-exportOptionsPlist', simpleExportOptionsPath
        ], iosPath, logs);
        
        if (!retryResult.success) {
          resolve({
            success: false,
            error: `IPA export failed after retry: ${retryResult.error}`,
            logs
          });
          return;
        }
      }
      
      // Look for the generated IPA file
      const ipaPath = findGeneratedIPA(appPath);
      if (ipaPath) {
        logs.push(`✅ IPA build completed successfully!`);
        logs.push(`🍎 IPA location: ${ipaPath}`);
        
        // Save IPA path to database
        try {
          await db.update(apps)
            .set({
              localIpaPath: ipaPath,
              localIpaBuiltAt: new Date(),
              lastDeploymentAt: new Date(),
              deploymentStatus: 'deployed'
            })
            .where(eq(apps.id, appId));
          logs.push(`💾 IPA path saved to database`);
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
        logs.push(`🔍 Searched in: ${path.join(iosPath, 'export')}`);
        logs.push(`💡 Make sure your app has proper code signing configured`);
        resolve({
          success: false,
          error: "Build completed but IPA file not found. Check code signing configuration.",
          logs
        });
      }
      
    } catch (error: any) {
      logs.push(`❌ Build process error: ${error.message}`);
      
      // Check for specific Xcode-related errors
      if (error.message.includes('xcode-select: error: tool \'xcodebuild\' requires Xcode')) {
        logs.push(`💡 Xcode Issue Detected:`);
        logs.push(`   You have Xcode Command Line Tools installed, but not the full Xcode app.`);
        logs.push(`   iOS builds require the full Xcode application.`);
        logs.push(`   Solutions:`);
        logs.push(`   1. Install Xcode from the Mac App Store (free)`);
        logs.push(`   2. After installation, run: sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer`);
        logs.push(`   3. Accept the Xcode license: sudo xcodebuild -license accept`);
      resolve({
        success: false,
          error: "Xcode app required for iOS builds. Please install Xcode from the Mac App Store and configure it properly.",
        logs
      });
        return;
      } else if (error.message.includes('SDK "iphoneos" cannot be located')) {
        logs.push(`💡 Xcode SDK Issue Detected:`);
        logs.push(`   The iOS SDK cannot be found. This usually means:`);
        logs.push(`   1. Xcode is not properly installed`);
        logs.push(`   2. Xcode needs to be opened and configured`);
        logs.push(`   3. Command line tools are not properly linked`);
        logs.push(`   Solutions:`);
        logs.push(`   1. Open Xcode app and complete the setup wizard`);
        logs.push(`   2. Run: sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer`);
        logs.push(`   3. Run: sudo xcodebuild -license accept`);
        resolve({
          success: false,
          error: "iOS SDK not found. Please install and configure Xcode properly.",
          logs
        });
        return;
      } else {
        logs.push(`💡 Common issues:`);
        logs.push(`   - Make sure Xcode is installed and up to date`);
        logs.push(`   - Check that your app has proper code signing`);
        logs.push(`   - Ensure the iOS directory was generated by Expo`);
        resolve({
          success: false,
          error: error.message,
          logs
        });
        return;
      }
    } finally {
      // Clean up temporary files
      try {
        const exportOptionsPath = path.join(iosPath, 'ExportOptions.plist');
        const simpleExportOptionsPath = path.join(iosPath, 'SimpleExportOptions.plist');
        
        if (fs.existsSync(exportOptionsPath)) {
          fs.unlinkSync(exportOptionsPath);
        }
        if (fs.existsSync(simpleExportOptionsPath)) {
          fs.unlinkSync(simpleExportOptionsPath);
        }
        
        logs.push("🧹 Cleaned up temporary files");
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
    }
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

  // Look for IPA in the export directory first
  const exportPath = path.join(iosPath, 'export');
  if (fs.existsSync(exportPath)) {
    const ipaFiles = fs.readdirSync(exportPath).filter(file => file.endsWith('.ipa'));
    if (ipaFiles.length > 0) {
      return path.join(exportPath, ipaFiles[0]);
    }
  }

  // Search recursively for .ipa files
  return findFileRecursively(iosPath, '.ipa');
}

/**
 * Detect the correct scheme name from workspace
 */
async function detectSchemeName(workspacePath: string, logs: string[]): Promise<string | null> {
  try {
    logs.push("🔍 Detecting scheme name from workspace...");
    
    // Try to list schemes using xcodebuild
    const result = await runXcodeBuild(['-list', '-workspace', workspacePath], path.dirname(workspacePath), logs);
    
    if (result.success && result.output) {
      const lines = result.output.split('\n');
      let inSchemesSection = false;
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        if (trimmedLine === 'Schemes:') {
          inSchemesSection = true;
          continue;
        }
        
        if (inSchemesSection && trimmedLine && !trimmedLine.startsWith(' ')) {
          // Found a scheme name
          const schemeName = trimmedLine;
          logs.push(`✅ Detected scheme: ${schemeName}`);
          return schemeName;
        }
        
        // Stop if we hit another section
        if (inSchemesSection && trimmedLine && !trimmedLine.startsWith(' ') && trimmedLine !== 'Schemes:') {
          break;
        }
      }
    }
    
    // Fallback to common scheme names
    const commonSchemes = ['App', 'MyApp', 'ExpoApp', 'ReactNativeApp'];
    logs.push(`⚠️ Could not detect scheme, trying common names: ${commonSchemes.join(', ')}`);
    
    return commonSchemes[0]; // Default to 'App'
    
  } catch (error: any) {
    logs.push(`⚠️ Scheme detection failed: ${error.message}`);
    return 'App'; // Fallback
  }
}

/**
 * Detect the correct scheme name from project file
 */
async function detectSchemeNameFromProject(projectPath: string, logs: string[]): Promise<string | null> {
  try {
    logs.push("🔍 Detecting scheme name from project file...");
    
    // Try to list schemes using xcodebuild
    const result = await runXcodeBuild(['-list', '-project', projectPath], path.dirname(projectPath), logs);
    
    if (result.success && result.output) {
      const lines = result.output.split('\n');
      let inSchemesSection = false;
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        if (trimmedLine === 'Schemes:') {
          inSchemesSection = true;
          continue;
        }
        
        if (inSchemesSection && trimmedLine && !trimmedLine.startsWith(' ')) {
          // Found a scheme name
          const schemeName = trimmedLine;
          logs.push(`✅ Detected scheme: ${schemeName}`);
          return schemeName;
        }
        
        // Stop if we hit another section
        if (inSchemesSection && trimmedLine && !trimmedLine.startsWith(' ') && trimmedLine !== 'Schemes:') {
          break;
        }
      }
    }
    
    // Fallback to common scheme names
    const commonSchemes = ['App', 'MyApp', 'ExpoApp', 'ReactNativeApp'];
    logs.push(`⚠️ Could not detect scheme, trying common names: ${commonSchemes.join(', ')}`);
    
    return commonSchemes[0]; // Default to 'App'
    
  } catch (error: any) {
    logs.push(`⚠️ Scheme detection failed: ${error.message}`);
    return 'App'; // Fallback
  }
}

/**
 * Create export options plist for IPA export
 */
async function createExportOptionsPlist(iosPath: string, logs: string[]): Promise<string> {
  const exportOptionsPath = path.join(iosPath, 'ExportOptions.plist');
  
  // Try to detect if we have a development team configured
  let exportMethod = 'development';
  let teamID = '';
  
  try {
    // Check if we can get team info from xcodebuild
    const teamResult = await runXcodeBuild(['-showBuildSettings'], iosPath, []);
    if (teamResult.success && teamResult.output) {
      const teamMatch = teamResult.output.match(/DEVELOPMENT_TEAM = (.+)/);
      if (teamMatch) {
        teamID = teamMatch[1];
        logs.push(`🏢 Found development team: ${teamID}`);
      }
    }
  } catch (error) {
    logs.push(`⚠️ Could not detect development team: ${error}`);
  }
  
  const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>${exportMethod}</string>
    <key>compileBitcode</key>
    <false/>
    <key>stripSwiftSymbols</key>
    <true/>
    <key>uploadBitcode</key>
    <false/>
    <key>uploadSymbols</key>
    <true/>
    <key>thinning</key>
    <string>&lt;none&gt;</string>
    ${teamID ? `<key>teamID</key>\n    <string>${teamID}</string>` : ''}
</dict>
</plist>`;
  
  fs.writeFileSync(exportOptionsPath, plistContent);
  logs.push(`📄 Created export options plist: ${exportOptionsPath}`);
  logs.push(`📋 Export method: ${exportMethod}${teamID ? `, Team: ${teamID}` : ''}`);
  
  return exportOptionsPath;
}

/**
 * Run expo prebuild to generate native platform files
 */
async function runExpoPrebuild(appPath: string, logs: string[], platform?: 'ios' | 'android'): Promise<{ success: boolean; output?: string; error?: string }> {
  return new Promise((resolve) => {
    const args = ['expo', 'prebuild', '--clean'];
    if (platform) {
      args.push('--platform', platform);
    }
    
    logs.push(`🔧 Running: npx ${args.join(' ')}`);
    
    const prebuildProcess = spawn('npx', args, {
      cwd: appPath,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        EXPO_NO_TELEMETRY: '1',
        EXPO_NO_DOCTOR: '1',
        EXPO_NO_UPDATE_CHECK: '1',
        CI: '1'
      }
    });

    let output = '';
    let errorOutput = '';

    prebuildProcess.stdout?.on('data', (data: any) => {
      const text = data.toString();
      output += text;
      logs.push(text.trim());
    });

    prebuildProcess.stderr?.on('data', (data: any) => {
      const text = data.toString();
      errorOutput += text;
      logs.push(`ERROR: ${text.trim()}`);
    });

    prebuildProcess.on('close', async (code: any) => {
      if (code === 0) {
        // 📱 EXPO BUILD FIX: Automatically apply gradle configuration fix
        if (platform === 'android') {
          try {
            logs.push('🔧 Applying automatic gradle configuration fix...');
            const { fixExpoGradleConfig } = await import('../../lib/hermetic-runtime');
            const gradleFixed = await fixExpoGradleConfig(appPath);
            if (gradleFixed) {
              logs.push('✅ Gradle configuration fixed automatically (newArchEnabled=false)');
            } else {
              logs.push('⚠️ Could not fix gradle configuration automatically');
            }
          } catch (error) {
            logs.push(`⚠️ Gradle fix failed, but continuing: ${error}`);
            logger.warn('Gradle fix failed:', error);
          }
        }
        resolve({ success: true, output });
      } else {
        resolve({ success: false, error: errorOutput || `Process exited with code ${code}` });
      }
    });

    prebuildProcess.on('error', (error: any) => {
      resolve({ success: false, error: error.message });
    });
  });
}

/**
 * Run xcodebuild command and return result
 */
async function runXcodeBuild(args: string[], cwd: string, logs: string[]): Promise<{ success: boolean; output?: string; error?: string }> {
  return new Promise((resolve) => {
    logs.push(`🔧 Running: xcodebuild ${args.join(' ')}`);
    
    const process = spawn('xcodebuild', args, {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let errorOutput = '';

    process.stdout?.on('data', (data) => {
      const text = data.toString();
      output += text;
      logs.push(text.trim());
    });

    process.stderr?.on('data', (data) => {
      const text = data.toString();
      errorOutput += text;
      logs.push(`ERROR: ${text.trim()}`);
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, output });
      } else {
        // Extract meaningful error from output (xcodebuild errors are often in stdout)
        const combinedOutput = output + '\n' + errorOutput;
        
        // Try to extract the actual error message
        const errorLines = combinedOutput.split('\n');
        const errorMessages: string[] = [];
        
        // Look for common error patterns
        let archiveFailedIndex = -1;
        
        for (let i = 0; i < errorLines.length; i++) {
          const line = errorLines[i];
          
          // Check for error: patterns (most common)
          if (line.includes('error:') || line.includes('ERROR:') || line.includes('failed:')) {
            errorMessages.push(line.trim());
            // Also include the next few lines for context
            for (let j = 1; j <= 5 && i + j < errorLines.length; j++) {
              const nextLine = errorLines[i + j].trim();
              if (nextLine && !nextLine.startsWith('note:') && !nextLine.startsWith('warning:') && !nextLine.includes('^')) {
                errorMessages.push(nextLine);
              }
            }
          }
          
          // Check for ARCHIVE FAILED and remember its position
          if (line.includes('ARCHIVE FAILED') || line.includes('** ARCHIVE FAILED **')) {
            archiveFailedIndex = i;
            errorMessages.push(line.trim());
            // Get the build command that failed
            if (i + 1 < errorLines.length) {
              errorMessages.push(errorLines[i + 1].trim());
            }
          }
          
          // Check for other common error patterns
          if (line.includes('CodeSign') && line.includes('error')) {
            errorMessages.push(line.trim());
          }
          if (line.includes('Compile') && line.includes('error')) {
            errorMessages.push(line.trim());
          }
          if (line.includes('Ld') && line.includes('error')) {
            errorMessages.push(line.trim());
          }
          if (line.includes('codesign') && (line.includes('error') || line.includes('failed'))) {
            errorMessages.push(line.trim());
          }
        }
        
        // If ARCHIVE FAILED was found, look backwards for the actual error
        if (archiveFailedIndex > 0 && errorMessages.length <= 2) {
          // Look backwards up to 50 lines to find the actual error
          for (let i = archiveFailedIndex - 1; i >= Math.max(0, archiveFailedIndex - 50); i--) {
            const line = errorLines[i].trim();
            if (line.includes('error:') || line.includes('ERROR:') || line.includes('failed:')) {
              errorMessages.unshift(line); // Add to beginning
              // Include surrounding context
              for (let j = 1; j <= 3 && i + j < errorLines.length; j++) {
                const nextLine = errorLines[i + j].trim();
                if (nextLine && !nextLine.startsWith('note:') && !nextLine.startsWith('warning:')) {
                  if (!errorMessages.includes(nextLine)) {
                    errorMessages.push(nextLine);
                  }
                }
              }
              break; // Found the error, stop looking
            }
          }
        }
        
        // If we found specific errors, use them; otherwise use the full output
        const errorMessage = errorMessages.length > 0 
          ? errorMessages.join('\n')
          : (errorOutput || output || `Process exited with code ${code}`);
        
        resolve({ success: false, error: errorMessage });
      }
    });

    process.on('error', (error) => {
      resolve({ success: false, error: error.message });
    });
  });
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
function ensureNDKVersion(androidPath: string, logs: string[]): void {
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
