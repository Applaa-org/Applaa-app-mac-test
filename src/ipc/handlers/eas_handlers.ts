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
  logger.info("🚀 Registering EAS handlers...");

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

      // Build the app (use preview profile to avoid keystore issues)
      const buildArgs = ["build", "--platform", platform, "--profile", "preview", "--non-interactive", "--clear-cache"];
      const result = await runEASCommand(buildArgs, { cwd: appPath });
      
      if (result.success) {
        // Extract build URL and QR code from output
        const buildUrl = extractBuildUrl(result.output || "");
        const qrCode = extractQRCode(result.output || "");
        
        logger.log(`✅ EAS build completed for app ${appId}`);
        
        return {
          success: true,
          buildId: extractBuildId(result.output || ""),
          buildUrl,
          publicUrl: buildUrl,
          qrCode,
          logs: result.logs || [],
        };
      } else {
        logger.error(`❌ EAS build failed for app ${appId}: ${result.error}`);
        return {
          success: false,
          error: result.error,
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

      // Export the app for web deployment
      logger.log("🔄 Exporting app for web deployment...");
      const exportResult = await runEASCommand(["export", "--platform", "web"], { cwd: appPath });
      
      if (!exportResult.success) {
        throw new Error(`Failed to export app: ${exportResult.error}`);
      }
      
      logger.log("✅ App exported successfully");

      // Deploy the app
      const result = await runEASCommand(["deploy"], { cwd: appPath });
      
      if (result.success) {
        // Extract deployment URL from output
        const publicUrl = extractDeployUrl(result.output || "");
        const qrCode = extractQRCode(result.output || "");
        
        logger.log(`✅ EAS deploy completed for app ${appId}`);
        
        return {
          success: true,
          publicUrl,
          qrCode,
          logs: result.logs || [],
        };
      } else {
        logger.error(`❌ EAS deploy failed for app ${appId}: ${result.error}`);
        return {
          success: false,
          error: result.error,
          logs: result.logs || [],
        };
      }
    } catch (error: any) {
      logger.error(`❌ EAS deploy error for app ${appId}: ${error}`);
      return {
        success: false,
        error: error.message,
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

  logger.info("✅ EAS handlers registered successfully");
}

// Helper functions
async function runEASCommand(args: string[], options: { cwd?: string; interactive?: boolean } = {}): Promise<{ success: boolean; output?: string; error?: string; logs?: string[] }> {
  return new Promise((resolve) => {
    const logs: string[] = [];
    
    const child = spawn("eas", args, {
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
        resolve({ success: false, error: error || `Process exited with code ${code}`, logs });
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
  
  // Check package.json for Expo dependency
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    if (!packageJson.dependencies?.expo && !packageJson.devDependencies?.expo) {
      throw new Error("Expo dependency not found in package.json");
    }
  }
  
  if (!fs.existsSync(easJsonPath)) {
    logger.log("🔄 Creating EAS configuration...");
    
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
    logger.log("✅ EAS configuration created");
  }
  
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

function extractBuildUrl(output: string): string | undefined {
  const urlMatch = output.match(/https:\/\/expo\.dev\/[^\s]+/);
  return urlMatch ? urlMatch[0] : undefined;
}

function extractDeployUrl(output: string): string | undefined {
  const urlMatch = output.match(/https:\/\/expo\.dev\/[^\s]+/);
  return urlMatch ? urlMatch[0] : undefined;
}

function extractQRCode(output: string): string | undefined {
  // Look for QR code patterns in the output
  const qrMatch = output.match(/QR code: (.+)/);
  return qrMatch ? qrMatch[1] : undefined;
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
