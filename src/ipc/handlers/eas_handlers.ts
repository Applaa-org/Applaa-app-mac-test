import { ipcMain } from "electron";
import { spawn, ChildProcess } from "child_process";
import * as fs from "fs";
import * as path from "path";
import log from "electron-log";
import { db } from "../../db";
import { apps } from "../../db/schema";
import { eq } from "drizzle-orm";
import { getDyadAppPath } from "../../paths/paths";

const logger = log.scope('eas-handlers');

interface EASBuildResult {
  success: boolean;
  buildId?: string;
  buildUrl?: string;
  publicUrl?: string;
  qrCode?: string;
  error?: string;
  logs?: string[];
}

interface EASDeployResult {
  success: boolean;
  publicUrl?: string;
  qrCode?: string;
  error?: string;
  logs?: string[];
}

interface EASStatus {
  isLoggedIn: boolean;
  username?: string;
  projects?: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
}

export function registerEASHandlers() {

  // Check EAS CLI status
  ipcMain.handle("eas:status", async () => {
    try {
      logger.log("🔄 Checking EAS CLI status...");
      
      const result = await runEASCommand(["whoami"]);
      
      if (result.success) {
        const username = result.output?.trim();
        logger.log(`✅ EAS CLI logged in as: ${username}`);
        
        return {
          success: true,
          isLoggedIn: true,
          username,
        };
      } else {
        logger.log("❌ EAS CLI not logged in");
        return {
          success: false,
          isLoggedIn: false,
          error: result.error || "Not logged in",
        };
      }
    } catch (error: any) {
      logger.error(`❌ Failed to check EAS status: ${error}`);
      return {
        success: false,
        isLoggedIn: false,
        error: error.message,
      };
    }
  });

  // Login to EAS
  ipcMain.handle("eas:login", async () => {
    try {
      logger.log("🔄 Logging into EAS...");
      
      // Try browser login first (non-interactive)
      const result = await runEASCommand(["login", "--sso"], { interactive: false });
      
      if (result.success) {
        logger.log("✅ Successfully logged into EAS");
        return { success: true };
      } else {
        // Fallback to interactive login
        logger.log("🔄 Trying interactive login...");
        const interactiveResult = await runEASCommand(["login"], { interactive: true });
        
        if (interactiveResult.success) {
          logger.log("✅ Successfully logged into EAS");
          return { success: true };
        } else {
          logger.error(`❌ EAS login failed: ${interactiveResult.error}`);
          return { success: false, error: interactiveResult.error };
        }
      }
    } catch (error: any) {
      logger.error(`❌ EAS login error: ${error}`);
      return { success: false, error: error.message };
    }
  });

  // Login to EAS with token
  ipcMain.handle("eas:login-token", async (event, { token }: { token: string }) => {
    try {
      logger.log("🔄 Logging into EAS with token...");
      
      // Set EAS token as environment variable
      process.env.EAS_TOKEN = token;
      
      // Verify login with token
      const result = await runEASCommand(["whoami"], { interactive: false });
      
      if (result.success) {
        logger.log("✅ Successfully logged into EAS with token");
        return { success: true, username: result.output?.trim() };
      } else {
        logger.error(`❌ EAS token login failed: ${result.error}`);
        return { success: false, error: result.error };
      }
    } catch (error: any) {
      logger.error(`❌ EAS token login error: ${error}`);
      return { success: false, error: error.message };
    }
  });

  // Build app with EAS
  ipcMain.handle("eas:build", async (event, { appId, platform = "all" }: { appId: number; platform?: "all" | "ios" | "android" }) => {
    try {
      logger.log(`🔄 Starting EAS build for app ${appId}, platform: ${platform}`);
      
      // First check if EAS CLI is available
      logger.log("🔍 Checking if EAS CLI is installed...");
      const easCheck = await runEASCommand(["--version"], { cwd: process.cwd() });
      if (!easCheck.success) {
        throw new Error(`EAS CLI not found or not working. Please install it with: npm install -g eas-cli. Error: ${easCheck.error}`);
      }
      logger.log(`✅ EAS CLI version: ${easCheck.output}`);
      
      // Get app data
      const [appData] = await db.select().from(apps).where(eq(apps.id, appId)).limit(1);
      if (!appData) {
        throw new Error("App not found");
      }

      const appPath = getDyadAppPath(appData.path);
      logger.log(`📁 App path: ${appPath}`);
      
      // Check if it's an Expo app
      if (!isExpoApp(appPath)) {
        throw new Error("App is not an Expo app. EAS only works with Expo apps.");
      }

      // Ensure EAS is configured
      await ensureEASConfigured(appPath);

      // Initialize EAS project if needed
      await initializeEASProject(appPath);

      // Setup keystores if needed
      await setupKeystoresIfNeeded(appPath, platform);

      // Try different build profiles in order of preference
      const profiles = ["development", "preview", "production"];
      let buildResult = null;
      let lastError = null;

      for (const profile of profiles) {
        try {
          logger.log(`🔄 Trying build with profile: ${profile}`);
          const buildArgs = ["build", "--platform", platform, "--profile", profile, "--non-interactive", "--clear-cache"];
          buildResult = await runEASCommand(buildArgs, { cwd: appPath });
          
          if (buildResult.success) {
            logger.log(`✅ Build successful with profile: ${profile}`);
            break;
          } else {
            logger.log(`⚠️ Build failed with profile ${profile}: ${buildResult.error}`);
            lastError = buildResult.error;
          }
        } catch (error: any) {
          logger.log(`⚠️ Build error with profile ${profile}: ${error.message}`);
          lastError = error.message;
        }
      }

      if (!buildResult || !buildResult.success) {
        throw new Error(`All build profiles failed. Last error: ${lastError}`);
      }

      const result = buildResult;
      
      if (result.success) {
        // Extract build URL and QR code from output
        const buildUrl = extractBuildUrl(result.output || "");
        const qrCode = extractQRCode(result.output || "");
        const buildId = extractBuildId(result.output || "");
        
        logger.log(`✅ EAS build completed for app ${appId}`);
        
        // Save build URL to database
        if (buildUrl) {
          try {
            await db.update(apps)
              .set({
                easBuildUrl: buildUrl,
                easBuildId: buildId || null,
                lastDeploymentAt: new Date(),
                deploymentStatus: 'deployed'
              })
              .where(eq(apps.id, appId));
            logger.log(`💾 Saved EAS build URL to database: ${buildUrl}`);
          } catch (error: any) {
            logger.error(`⚠️ Failed to save EAS build URL: ${error.message}`);
          }
        } else {
          logger.warn(`⚠️ No build URL found in output: ${result.output}`);
        }
        
        return {
          success: true,
          buildId,
          buildUrl,
          publicUrl: buildUrl,
          qrCode,
          logs: result.logs || [],
        };
      } else {
        logger.error(`❌ EAS build failed for app ${appId}: ${result.error}`);
        logger.error(`Build output: ${result.output}`);
        return {
          success: false,
          error: `Build failed: ${result.error || 'Unknown error'}. Output: ${result.output || 'No output'}`,
          logs: result.logs || [],
        };
      }
    } catch (error: any) {
      logger.error(`❌ EAS build error for app ${appId}: ${error}`);
      return {
        success: false,
        error: error.message,
        logs: [],
      };
    }
  });

  // Deploy app with EAS (for web apps)
  ipcMain.handle("eas:deploy", async (event, { appId }: { appId: number }) => {
    try {
      // Check if user can deploy (Pro tier only)
      const { canDeployAppAsync } = await import("../utils/feature_checks");
      const deployCheck = await canDeployAppAsync();
      if (!deployCheck.allowed) {
        throw new Error(deployCheck.reason || "DEPLOYMENT_NOT_ALLOWED");
      }
      
      logger.log(`🔄 Starting EAS deploy for app ${appId}`);
      
      // Get app data
      const [appData] = await db.select().from(apps).where(eq(apps.id, appId)).limit(1);
      if (!appData) {
        throw new Error("App not found");
      }

      const appPath = getDyadAppPath(appData.path);
      
      // Check if it's an Expo app
      if (!isExpoApp(appPath)) {
        throw new Error("App is not an Expo app. EAS only works with Expo apps.");
      }

      // Ensure EAS is configured
      await ensureEASConfigured(appPath);

      // Initialize EAS project if needed
      await initializeEASProject(appPath);

      // Check EAS authentication status before deploying
      logger.log("🔍 Checking EAS authentication status...");
      const authCheck = await runEASCommand(["whoami"], { cwd: appPath });
      if (!authCheck.success) {
        throw new Error(`EAS authentication failed. Please login first: ${authCheck.error}`);
      }
      logger.log(`✅ EAS authenticated as: ${authCheck.output}`);

      // Export the app for web deployment
      logger.log("🔄 Exporting app for web deployment...");
      const exportResult = await runCommand("npx", ["expo", "export", "--platform", "web"], { cwd: appPath });
      
      if (!exportResult.success) {
        throw new Error(`Failed to export app: ${exportResult.error}`);
      }
      
      logger.log("✅ App exported successfully");

      // Deploy the app with more specific error handling
      logger.log("🚀 Starting EAS deployment...");
      const result = await runEASCommand(["deploy", "--non-interactive"], { cwd: appPath });
      
      if (result.success) {
        // Extract deployment URL from output
        const publicUrl = extractDeployUrl(result.output || "");
        const qrCode = extractQRCode(result.output || "");
        
        logger.log(`✅ EAS deploy completed for app ${appId}`);
        
        // Save deployment URL to database
        if (publicUrl) {
          try {
            await db.update(apps)
              .set({
                easDeploymentUrl: publicUrl,
                lastDeploymentAt: new Date(),
                deploymentStatus: 'deployed'
              })
              .where(eq(apps.id, appId));
            logger.log(`💾 Saved EAS deployment URL to database: ${publicUrl}`);
          } catch (error: any) {
            logger.error(`⚠️ Failed to save EAS deployment URL: ${error.message}`);
          }
        } else {
          logger.warn(`⚠️ No deployment URL found in output: ${result.output}`);
        }
        
        return {
          success: true,
          publicUrl,
          qrCode,
          logs: result.logs || [],
        };
      } else {
        logger.error(`❌ EAS deploy failed for app ${appId}: ${result.error}`);
        logger.error(`Deploy output: ${result.output}`);
        logger.error(`Deploy logs: ${JSON.stringify(result.logs)}`);
        const parsedError = parseGraphQLError(result.error || 'Unknown error');
        return {
          success: false,
          error: `Deploy failed: ${parsedError}. Output: ${result.output || 'No output'}`,
          logs: result.logs || [],
        };
      }
    } catch (error: any) {
      logger.error(`❌ EAS deploy error for app ${appId}: ${error}`);
      const parsedError = parseGraphQLError(error.message || error.toString());
      return {
        success: false,
        error: parsedError,
        logs: [],
      };
    }
  });

  // Get build status
  ipcMain.handle("eas:build-status", async (event, { buildId }: { buildId: string }) => {
    try {
      logger.log(`🔄 Checking EAS build status for ${buildId}`);
      
      const result = await runEASCommand(["build:view", buildId]);
      
      if (result.success) {
        const status = extractBuildStatus(result.output || "");
        const publicUrl = extractBuildUrl(result.output || "");
        
        return {
          success: true,
          status,
          publicUrl,
          logs: result.logs || [],
        };
      } else {
        return {
          success: false,
          error: result.error,
          logs: result.logs || [],
        };
      }
    } catch (error: any) {
      logger.error(`❌ EAS build status error: ${error}`);
      return {
        success: false,
        error: error.message,
        logs: [],
      };
    }
  });

  // List EAS projects
  ipcMain.handle("eas:list-projects", async () => {
    try {
      logger.log("🔄 Listing EAS projects...");
      
      const result = await runEASCommand(["project:list"]);
      
      if (result.success) {
        const projects = extractProjects(result.output || "");
        return {
          success: true,
          projects,
        };
      } else {
        return {
          success: false,
          error: result.error,
          projects: [],
        };
      }
    } catch (error: any) {
      logger.error(`❌ EAS list projects error: ${error}`);
      return {
        success: false,
        error: error.message,
        projects: [],
      };
    }
  });

  // Check if app is ready for EAS build
  ipcMain.handle("eas:check-app-readiness", async (event, { appId }: { appId: number }) => {
    try {
      logger.log(`🔄 Checking EAS readiness for app ${appId}...`);
      
      // Get app data
      const [appData] = await db.select().from(apps).where(eq(apps.id, appId)).limit(1);
      if (!appData) {
        throw new Error("App not found");
      }

      const appPath = getDyadAppPath(appData.path);
      
      // Check if it's an Expo app
      if (!isExpoApp(appPath)) {
        return {
          success: false,
          error: "App is not an Expo app. EAS only works with Expo apps.",
          isExpoApp: false,
        };
      }

      // Check EAS configuration
      try {
        await ensureEASConfigured(appPath);
        return {
          success: true,
          isExpoApp: true,
          isEASConfigured: true,
          message: "App is ready for EAS build",
        };
      } catch (configError: any) {
        return {
          success: false,
          error: configError.message,
          isExpoApp: true,
          isEASConfigured: false,
        };
      }
    } catch (error: any) {
      logger.error(`❌ EAS app readiness check error: ${error}`);
      return {
        success: false,
        error: error.message,
        isExpoApp: false,
        isEASConfigured: false,
      };
    }
  });

  // Check keystore status
  ipcMain.handle("eas:check-keystores", async (event, { appId }: { appId: number }) => {
    try {
      logger.log(`🔄 Checking keystore status for app ${appId}...`);
      
      const app = await db.select().from(apps).where(eq(apps.id, appId)).get();
      if (!app) {
        throw new Error("App not found");
      }
      
      const appPath = getDyadAppPath(app.path);
      
      // Check Android keystore
      const androidResult = await runEASCommand(["credentials", "--platform", "android"], { cwd: appPath });
      const hasAndroidKeystore = androidResult.success && androidResult.output?.includes("Keystore");
      
      // Check iOS keystore
      const iosResult = await runEASCommand(["credentials", "--platform", "ios"], { cwd: appPath });
      const hasIOSKeystore = iosResult.success && iosResult.output?.includes("Distribution Certificate");
      
      logger.log(`📱 Keystore status - Android: ${hasAndroidKeystore}, iOS: ${hasIOSKeystore}`);
      
      return {
        success: true,
        android: hasAndroidKeystore,
        ios: hasIOSKeystore,
        both: hasAndroidKeystore && hasIOSKeystore
      };
    } catch (error: any) {
      logger.error(`❌ Keystore check failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  });

  // Setup keystores from UI
  ipcMain.handle("eas:setup-keystores", async (event, { appId, platforms }: { appId: number; platforms: string[] }) => {
    try {
      logger.log(`🔄 Setting up keystores for app ${appId}, platforms: ${platforms.join(", ")}...`);
      
      const app = await db.select().from(apps).where(eq(apps.id, appId)).get();
      if (!app) {
        throw new Error("App not found");
      }
      
      const appPath = getDyadAppPath(app.path);
      
      // Ensure EAS is configured and initialized
      await ensureEASConfigured(appPath);
      await initializeEASProject(appPath);
      
      const results = [];
      
      for (const platform of platforms) {
        logger.log(`🔧 Setting up ${platform} keystore...`);
        
        try {
          // First check if keystore already exists
          const checkResult = await runEASCommand(["credentials", "--platform", platform], { cwd: appPath });
          
          if (checkResult.success && checkResult.output?.includes("Keystore")) {
            logger.log(`✅ ${platform} keystore already exists`);
            results.push({ platform, success: true, message: "Already exists" });
            continue;
          }
          
          // Try to set up keystore with non-interactive approach
          logger.log(`🔧 Attempting to set up ${platform} keystore...`);
          
          // For now, we'll provide a helpful error message since interactive setup is complex
          results.push({ 
            platform, 
            success: false, 
            error: `Keystore setup requires interactive terminal. Please run 'eas credentials --platform ${platform}' in your terminal, or use the automatic setup during build.`
          });
          
        } catch (error: any) {
          logger.log(`❌ ${platform} keystore setup error: ${error.message}`);
          results.push({ platform, success: false, error: error.message || "Unknown error" });
        }
      }
      
      const allSuccessful = results.every(r => r.success);
      
      return {
        success: allSuccessful,
        results,
        message: allSuccessful ? "All keystores set up successfully!" : "Some keystores failed to set up"
      };
    } catch (error: any) {
      logger.error(`❌ Keystore setup failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  });


}

// Helper functions
async function runEASCommand(args: string[], options: { cwd?: string; interactive?: boolean } = {}): Promise<{ success: boolean; output?: string; error?: string; logs?: string[] }> {
  return new Promise((resolve) => {
    const logs: string[] = [];
    const cwd = options.cwd || process.cwd();
    
    logger.log(`🚀 Running EAS command: eas ${args.join(' ')}`);
    logger.log(`📁 Working directory: ${cwd}`);
    
    const child = spawn("eas", args, {
      cwd,
      stdio: options.interactive ? "inherit" : "pipe",
      shell: true,
      env: { ...process.env }
    });

    let output = "";
    let error = "";

    if (!options.interactive) {
      child.stdout?.on("data", (data) => {
        const text = data.toString();
        output += text;
        logs.push(text);
        logger.log(`📤 EAS stdout: ${text.trim()}`);
      });

      child.stderr?.on("data", (data) => {
        const text = data.toString();
        error += text;
        logs.push(text);
        logger.log(`📥 EAS stderr: ${text.trim()}`);
      });
    }

    child.on("close", (code) => {
      logger.log(`🏁 EAS command finished with exit code: ${code}`);
      logger.log(`📋 Full output: ${output}`);
      if (error) {
        logger.log(`❌ Error output: ${error}`);
      }
      
      if (code === 0) {
        resolve({ success: true, output, logs });
      } else {
        const errorMessage = error || output || `Process exited with code ${code}`;
        resolve({ success: false, error: errorMessage, output, logs });
      }
    });

    child.on("error", (err) => {
      logger.error(`💥 EAS command spawn error: ${err.message}`);
      logger.error(`💥 Error stack: ${err.stack}`);
      resolve({ success: false, error: err.message, logs });
    });
  });
}

async function runCommand(command: string, args: string[], options: { cwd?: string; interactive?: boolean } = {}): Promise<{ success: boolean; output?: string; error?: string; logs?: string[] }> {
  return new Promise((resolve) => {
    const logs: string[] = [];
    
    const child = spawn(command, args, {
      cwd: options.cwd || process.cwd(),
      stdio: options.interactive ? "inherit" : "pipe",
    });

    let output = "";
    let error = "";

    if (!options.interactive) {
      child.stdout?.on("data", (data) => {
        const text = data.toString();
        output += text;
        logs.push(text);
      });

      child.stderr?.on("data", (data) => {
        const text = data.toString();
        error += text;
        logs.push(text);
      });
    }

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ success: true, output, logs });
      } else {
        resolve({ success: false, error: error || `Command failed with code ${code}`, logs });
      }
    });

    child.on("error", (err) => {
      resolve({ success: false, error: err.message, logs });
    });
  });
}

function isExpoApp(appPath: string): boolean {
  try {
    const packageJsonPath = path.join(appPath, "package.json");
    if (!fs.existsSync(packageJsonPath)) {
      return false;
    }
    
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    return !!(packageJson.dependencies?.expo || packageJson.devDependencies?.expo);
  } catch {
    return false;
  }
}

async function ensureEASConfigured(appPath: string): Promise<void> {
  const easJsonPath = path.join(appPath, "eas.json");
  const appJsonPath = path.join(appPath, "app.json");
  const packageJsonPath = path.join(appPath, "package.json");
  
  // Check if it's a valid Expo app
  if (!fs.existsSync(appJsonPath) && !fs.existsSync(packageJsonPath)) {
    throw new Error("Not a valid Expo app directory");
  }
  
  // Check package.json for Expo dependency and add EAS scripts
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    if (!packageJson.dependencies?.expo && !packageJson.devDependencies?.expo) {
      throw new Error("Expo dependency not found in package.json");
    }
    
    // Add EAS build scripts if they don't exist
    if (!packageJson.scripts) {
      packageJson.scripts = {};
    }
    
    const easScripts = {
      "build:android": "eas build --platform android",
      "build:ios": "eas build --platform ios", 
      "build:all": "eas build --platform all",
      "submit:android": "eas submit --platform android",
      "submit:ios": "eas submit --platform ios",
      "update": "eas update"
    };
    
    let scriptsUpdated = false;
    for (const [scriptName, scriptCommand] of Object.entries(easScripts)) {
      if (!packageJson.scripts[scriptName]) {
        packageJson.scripts[scriptName] = scriptCommand;
        scriptsUpdated = true;
      }
    }
    
    if (scriptsUpdated) {
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
      logger.log("✅ Added EAS build scripts to package.json");
    }
  }
  
  // Always recreate eas.json to ensure it's valid
  logger.log("🔄 Creating/updating EAS configuration...");
    
    const easConfig = {
      "cli": {
        "version": ">= 5.9.0",
        "appVersionSource": "remote"
      },
      "build": {
        "development": {
          "developmentClient": true,
          "distribution": "internal"
        },
        "preview": {
          "distribution": "internal"
        },
        "production": {}
      },
      "submit": {
        "production": {}
      }
    };
    
  fs.writeFileSync(easJsonPath, JSON.stringify(easConfig, null, 2));
  logger.log("✅ EAS configuration created/updated");
  
  // Ensure app.json has proper configuration
  if (fs.existsSync(appJsonPath)) {
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf8"));
    if (!appJson.expo) {
      throw new Error("app.json is missing expo configuration");
    }
    if (!appJson.expo.slug) {
      throw new Error("app.json is missing expo.slug");
    }
  }
}

async function initializeEASProject(appPath: string): Promise<void> {
  logger.log("🔄 Initializing EAS project...");
  
  // Check if project is already initialized by looking for .easrc or checking project status
  const easrcPath = path.join(appPath, ".easrc");
  if (fs.existsSync(easrcPath)) {
    logger.log("✅ EAS project already initialized");
    return;
  }
  
  // Initialize EAS project
  const result = await runEASCommand(["init", "--non-interactive", "--force"], { cwd: appPath });
  
  if (result.success) {
    logger.log("✅ EAS project initialized successfully");
  } else {
    // If init fails, it might already be initialized, try to continue
    logger.log("⚠️ EAS init failed, but continuing with build attempt");
  }
}

async function setupKeystoresIfNeeded(appPath: string, platform: string): Promise<void> {
  logger.log("🔄 Checking keystore status...");
  
  // Check if keystores are already set up
  const platforms = platform === "all" ? ["android", "ios"] : [platform];
  
  for (const platformName of platforms) {
    logger.log(`🔍 Checking ${platformName} keystore...`);
    
    const credentialsResult = await runEASCommand(["credentials", "--platform", platformName], { cwd: appPath });
    
    if (credentialsResult.success) {
      const hasKeystore = credentialsResult.output?.includes("Keystore") || credentialsResult.output?.includes("Distribution Certificate");
      
      if (hasKeystore) {
        logger.log(`✅ ${platformName} keystore already exists`);
        continue;
      }
    }
    
    // Keystore doesn't exist, try to set it up
    logger.log(`🔧 Setting up ${platformName} keystore...`);
    
    try {
      // Try to generate keystore automatically with non-interactive approach
      // This will likely fail but EAS build might handle it
      const setupResult = await runEASCommand(["credentials", "--platform", platformName], { cwd: appPath });
      
      if (setupResult.success) {
        logger.log(`✅ ${platformName} keystore setup completed`);
      } else {
        logger.log(`⚠️ ${platformName} keystore setup failed: ${setupResult.error}`);
        logger.log(`🔄 Continuing with build - EAS might generate keystore automatically`);
        // Continue with build attempt - EAS might handle this
      }
    } catch (error: any) {
      logger.log(`⚠️ ${platformName} keystore setup error: ${error.message}`);
      logger.log(`🔄 Continuing with build - EAS might generate keystore automatically`);
      // Continue with build attempt
    }
  }
}

function extractBuildUrl(output: string): string | undefined {
  const urlMatch = output.match(/https:\/\/expo\.dev\/[^\s]+/);
  return urlMatch ? urlMatch[0] : undefined;
}

function extractDeployUrl(output: string): string | undefined {
  // Look for the actual public URL (not the dashboard URL)
  const publicUrlMatch = output.match(/Deployment URL\s+(https:\/\/[^\s]+\.expo\.app)/);
  if (publicUrlMatch) {
    return publicUrlMatch[1];
  }
  
  // Fallback: look for any .expo.app URL
  const expoAppMatch = output.match(/https:\/\/[^\s]+\.expo\.app/);
  if (expoAppMatch) {
    return expoAppMatch[0];
  }
  
  // Last resort: look for expo.dev URLs (dashboard)
  const urlMatch = output.match(/https:\/\/expo\.dev\/[^\s]+/);
  return urlMatch ? urlMatch[0] : undefined;
}

function extractQRCode(output: string): string | undefined {
  // Look for QR code patterns in the output
  const qrMatch = output.match(/QR code: (.+)/);
  return qrMatch ? qrMatch[1] : undefined;
}

function parseGraphQLError(error: string): string {
  // Common GraphQL error patterns and their solutions
  if (error.includes("GraphQL request failed")) {
    if (error.includes("Unauthorized") || error.includes("401")) {
      return "EAS authentication expired. Please login again using the login button.";
    }
    if (error.includes("Forbidden") || error.includes("403")) {
      return "Access denied. Check your EAS account permissions.";
    }
    if (error.includes("Not Found") || error.includes("404")) {
      return "EAS project not found. Try running 'eas init' first.";
    }
    if (error.includes("Rate limit") || error.includes("429")) {
      return "Rate limit exceeded. Please wait a few minutes and try again.";
    }
    if (error.includes("Network") || error.includes("timeout")) {
      return "Network error. Check your internet connection and try again.";
    }
    return `GraphQL API error: ${error}. This might be a temporary EAS service issue.`;
  }
  return error;
}

function extractBuildId(output: string): string | undefined {
  const idMatch = output.match(/Build ID: ([a-f0-9-]+)/);
  return idMatch ? idMatch[1] : undefined;
}

function extractBuildStatus(output: string): string {
  if (output.includes("finished")) return "finished";
  if (output.includes("in progress")) return "in_progress";
  if (output.includes("errored")) return "errored";
  if (output.includes("cancelled")) return "cancelled";
  return "unknown";
}

function extractProjects(output: string): Array<{ id: string; name: string; slug: string }> {
  try {
    const lines = output.split('\n');
    const projects: Array<{ id: string; name: string; slug: string }> = [];
    
    for (const line of lines) {
      const match = line.match(/([a-f0-9-]+)\s+([^\s]+)\s+([^\s]+)/);
      if (match) {
        projects.push({
          id: match[1],
          name: match[2],
          slug: match[3],
        });
      }
    }
    
    return projects;
  } catch {
    return [];
  }
}
