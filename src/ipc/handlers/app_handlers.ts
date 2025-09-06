import { ipcMain, app } from "electron";
import { db, getDatabasePath } from "../../db";
import { apps, chats, messages } from "../../db/schema";
import { desc, eq } from "drizzle-orm";
import type {
  App,
  CreateAppParams,
  RenameBranchParams,
  CopyAppParams,
  EditAppFileReturnType,
  RespondToAppInputParams,
} from "../ipc_types";
import fs from "node:fs";
import fsExtra from "fs-extra";
import path from "node:path";
import os from "node:os";
import { getDyadAppPath, getUserDataPath } from "../../paths/paths";
import { ensureWorkspaceInitialized, getAppRelativePath } from "../../paths/workspace";
import { readSettings } from "../../main/settings";
import { spawn } from "node:child_process";
import git from "isomorphic-git";
import { promises as fsPromises } from "node:fs";

// Import our utility modules
import { readSettings } from "../../main/settings";
import { getBackgroundTaskManager } from "./background_task_manager";
import { withLock } from "../utils/lock_utils";
import { getFilesRecursively } from "../utils/file_utils";
import {
  runningApps,
  processCounter,
  killProcess,
  removeAppIfCurrentProcess,
} from "../utils/process_manager";
import { getEnvVar } from "../utils/read_env";
// (duplicate import removed)

import fixPath from "fix-path";

import killPort from "kill-port";
import util from "util";
import log from "electron-log";
import {
  deploySupabaseFunctions,
  getSupabaseProjectName,
} from "../../supabase_admin/supabase_management_client";
import { createLoggedHandler } from "./safe_handle";
import { getLanguageModelProviders } from "../shared/language_model_helpers";
import { startProxy } from "../utils/start_proxy_server";
import { Worker } from "worker_threads";
import { createFromTemplate } from "./createFromTemplate";
import { generateSmartAppNames } from "../utils/smart_naming";
import { gitCommit } from "../utils/git_utils";
import { safeSend } from "../utils/safe_sender";
import { normalizePath } from "../../../shared/normalizePath";
import { isServerFunction } from "@/supabase_admin/supabase_utils";
import { getVercelTeamSlug } from "../utils/vercel_utils";
import { storeDbTimestampAtCurrentVersion } from "../utils/neon_timestamp_utils";
import { perfMonitor, logPerfReport } from "../utils/performance_monitor";

const logger = log.scope("app-handlers");

/**
 * 🚀 ENHANCED: Delete app files with retry logic to handle Windows file locks
 */
async function deleteAppFilesWithRetry(appPath: string, appId: number, maxRetries = 3): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.log(`🗑️ Attempt ${attempt}/${maxRetries}: Deleting app files at ${appPath}`);
      
      // Try different deletion strategies
      if (process.platform === "win32") {
        // Windows: Use rmdir with force flag first
        try {
          await fsPromises.rm(appPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 500 });
          return; // Success!
        } catch (error: any) {
          if (attempt === maxRetries) throw error;
          
          // If that fails, try using Windows rmdir command
          try {
            const { execAsync } = await import("../utils/runShellCommand");
            await execAsync(`rmdir /S /Q "${appPath}"`, { timeout: 10000 });
            return; // Success!
          } catch (cmdError: any) {
            logger.warn(`⚠️ Windows rmdir failed on attempt ${attempt}:`, cmdError.message);
          }
        }
      } else {
        // Unix-like systems
        await fsPromises.rm(appPath, { recursive: true, force: true });
        return; // Success!
      }
      
      // If we get here, the deletion failed, wait before retry
      if (attempt < maxRetries) {
        const delay = attempt * 1000; // Increasing delay: 1s, 2s, 3s
        logger.log(`⏳ Waiting ${delay}ms before retry ${attempt + 1}...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
    } catch (error: any) {
      logger.warn(`⚠️ Deletion attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        // Final attempt failed
        throw error;
      }
      
      // Wait before retry with exponential backoff
      const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
      logger.log(`⏳ Waiting ${delay}ms before retry ${attempt + 1}...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

async function copyDir(
  source: string,
  destination: string,
  filter?: (source: string) => boolean,
) {
  await fsPromises.cp(source, destination, {
    recursive: true,
    filter: (src: string) => {
      if (path.basename(src) === "node_modules") {
        return false;
      }
      if (filter) {
        return filter(src);
      }
      return true;
    },
  });
}

const handle = createLoggedHandler(logger);

let proxyWorker: Worker | null = null;

// Helper function for legacy-safe app queries
async function getAppSafe(appId: number): Promise<any> {
  try {
    const app = await db.query.apps.findFirst({
      where: eq(apps.id, appId),
    });
    return app as any;
  } catch (err) {
    logger.warn("getAppSafe: falling back to legacy SELECT due to:", err);
    const row = db.$client
      .prepare(
        "SELECT id, name, path, created_at as createdAt, " +
          "github_org as githubOrg, github_repo as githubRepo, github_branch as githubBranch, " +
          "supabase_project_id as supabaseProjectId, neon_project_id as neonProjectId, " +
          "neon_development_branch_id as neonDevelopmentBranchId, neon_preview_branch_id as neonPreviewBranchId, " +
          "vercel_project_id as vercelProjectId, vercel_project_name as vercelProjectName, vercel_team_id as vercelTeamId, " +
          "vercel_deployment_url as vercelDeploymentUrl, chat_context as chatContext FROM apps WHERE id = ?"
      )
      .get(appId) as any;

    if (!row) return undefined;

    // Convert legacy timestamps
    if (row.createdAt && typeof row.createdAt === "number") {
      row.createdAt = new Date(row.createdAt * 1000);
    }
    // Set missing column to undefined for compatibility
    row.updatedAt = undefined;

    // New fields absent in legacy DBs
    row.displayName = undefined;
    row.packageId = undefined;
    row.slug = undefined;

    return row;
  }
}

// Needed, otherwise electron in MacOS/Linux will not be able
// to find node/pnpm.
fixPath();

/**
 * 🔧 Generate a unique app name by appending numbers
 */
async function generateUniqueAppName(baseName: string, appType: 'web' | 'mobile' = 'web'): Promise<string> {
  let counter = 2;
  let suggestedName = `${baseName}-${counter}`;
  
  while (counter <= 10) { // Limit to prevent infinite loops
    const testRelPath = getAppRelativePath(suggestedName, appType);
    const testFullPath = getDyadAppPath(testRelPath);
    
    if (!fs.existsSync(testFullPath)) {
      return suggestedName;
    }
    
    counter++;
    suggestedName = `${baseName}-${counter}`;
  }
  
  // If we can't find a unique name with numbers, add timestamp
  const timestamp = Date.now().toString().slice(-6);
  return `${baseName}-${timestamp}`;
}

async function executeApp({
  appPath,
  appId,
  event, // Keep event for local-node case
  isNeon,
}: {
  appPath: string;
  appId: number;
  event: Electron.IpcMainInvokeEvent;
  isNeon: boolean;
}): Promise<void> {
  if (proxyWorker) {
    proxyWorker.terminate();
    proxyWorker = null;
  }
  await executeAppLocalNode({ appPath, appId, event, isNeon });
}

async function executeAppLocalNode({
  appPath,
  appId,
  event,
  isNeon,
}: {
  appPath: string;
  appId: number;
  event: Electron.IpcMainInvokeEvent;
  isNeon: boolean;
}): Promise<void> {
  // 🚀 PERFORMANCE: Use hermetic package manager strategy for consistent dependency management
  const { getBestPackageManager, ensurePnpmAvailable } = await import("../../lib/hermetic-runtime");
  const packageManager = await getBestPackageManager(appPath);
  
  // Ensure pnpm is available if it's the preferred manager
  if (packageManager === "pnpm") {
    await ensurePnpmAvailable();
  }
  
  // Build command based on available package manager
  let installCommand: string;
  let devCommand: string;
  
  if (packageManager === "pnpm") {
    installCommand = "pnpm install";
    devCommand = "pnpm run dev --port 32100";
  } else if (packageManager === "yarn") {
    installCommand = "yarn install";
    devCommand = "yarn run dev --port 32100";
  } else {
    installCommand = "npm install --legacy-peer-deps";
    devCommand = "npm run dev -- --port 32100";
  }
  
  const fullCommand = `(${installCommand} && ${devCommand}) || (npm install --legacy-peer-deps && npm run dev -- --port 32100)`;
  
  const spawnedProcess = spawn(fullCommand, [], {
    cwd: appPath,
    shell: true,
    stdio: "pipe", // Ensure stdio is piped so we can capture output/errors and detect close
    detached: false, // Ensure child process is attached to the main process lifecycle unless explicitly backgrounded
  });

  // Check if process spawned correctly
  if (!spawnedProcess.pid) {
    // Attempt to capture any immediate errors if possible
    let errorOutput = "";
    spawnedProcess.stderr?.on("data", (data) => (errorOutput += data));
    await new Promise((resolve) => spawnedProcess.on("error", resolve)); // Wait for error event
    throw new Error(
      `Failed to spawn process for app ${appId}. Error: ${
        errorOutput || "Unknown spawn error"
      }`,
    );
  }

  // Increment the counter and store the process reference with its ID
  const currentProcessId = processCounter.increment();
  runningApps.set(appId, {
    process: spawnedProcess,
    processId: currentProcessId,
  });

  // Log output
  spawnedProcess.stdout?.on("data", async (data) => {
    const message = util.stripVTControlCharacters(data.toString());
    logger.debug(
      `App ${appId} (PID: ${spawnedProcess.pid}) stdout: ${message}`,
    );

    // This is a hacky heuristic to pick up when drizzle is asking for user
    // to select from one of a few choices. We automatically pick the first
    // option because it's usually a good default choice. We guard this with
    // isNeon because: 1) only Neon apps (for the official Dyad templates) should
    // get this template and 2) it's safer to do this with Neon apps because
    // their databases have point in time restore built-in.
    if (isNeon && message.includes("created or renamed from another")) {
      try {
        if (spawnedProcess.stdin && !spawnedProcess.stdin.destroyed && !spawnedProcess.killed) {
          spawnedProcess.stdin.write(`\r\n`);
          logger.info(
            `App ${appId} (PID: ${spawnedProcess.pid}) wrote enter to stdin to automatically respond to drizzle push input`,
          );
        }
      } catch (error) {
        logger.warn(`Failed to write to stdin for app ${appId}:`, error);
      }
    }

    // Check if this is an interactive prompt requiring user input
    const inputRequestPattern = /\s*›\s*\([yY]\/[nN]\)\s*$/;
    const isInputRequest = inputRequestPattern.test(message);
    if (isInputRequest) {
      // Send special input-requested event for interactive prompts
      safeSend(event.sender, "app:output", {
        type: "input-requested",
        message,
        appId,
      });
    } else {
      // Normal stdout handling
      safeSend(event.sender, "app:output", {
        type: "stdout",
        message,
        appId,
      });

      const urlMatch = message.match(/(https?:\/\/localhost:\d+\/?)/);
      if (urlMatch) {
        proxyWorker = await startProxy(urlMatch[1], {
          onStarted: (proxyUrl) => {
            safeSend(event.sender, "app:output", {
              type: "stdout",
              message: `[applaa-proxy-server]started=[${proxyUrl}] original=[${urlMatch[1]}]`,
              appId,
            });
          },
        });
      }
    }
  });

  spawnedProcess.stderr?.on("data", (data) => {
    const message = util.stripVTControlCharacters(data.toString());
    logger.error(
      `App ${appId} (PID: ${spawnedProcess.pid}) stderr: ${message}`,
    );
    safeSend(event.sender, "app:output", {
      type: "stderr",
      message,
      appId,
    });
  });

  // Handle process exit/close
  spawnedProcess.on("close", (code, signal) => {
    logger.log(
      `App ${appId} (PID: ${spawnedProcess.pid}) process closed with code ${code}, signal ${signal}.`,
    );
    removeAppIfCurrentProcess(appId, spawnedProcess);
  });

  // Handle errors during process lifecycle (e.g., command not found)
  spawnedProcess.on("error", (err) => {
    logger.error(
      `Error in app ${appId} (PID: ${spawnedProcess.pid}) process: ${err.message}`,
    );
    removeAppIfCurrentProcess(appId, spawnedProcess);
    // Note: We don't throw here as the error is asynchronous. The caller got a success response already.
    // Consider adding ipcRenderer event emission to notify UI of the error.
  });
}

// Helper to kill process on a specific port (cross-platform, using kill-port)
async function killProcessOnPort(port: number): Promise<void> {
  try {
    await killPort(port, "tcp");
  } catch {
    // Ignore if nothing was running on that port
  }
}

export function registerAppHandlers() {
  // Return the base path where apps are stored (without the app subfolder)
  handle("get-apps-base-path", async () => {
    const baseWithMarker = getDyadAppPath("$APP_BASE_PATH");
    // baseWithMarker ends with "$APP_BASE_PATH" – strip it to get the base dir
    const baseDir = path.dirname(baseWithMarker);
    return { basePath: baseDir };
  });

  // REMOVED: Aggressive healing function that corrupted template files
  // Original Dyad used simpler approach in chat stream handlers
  handle("restart-dyad", async () => {
    app.relaunch();
    app.quit();
  });

  handle("clean-all-apps", async () => {
    logger.info("Starting clean-all-apps operation");
    
    try {
      // 1. Get all apps
      const allApps = await db.query.apps.findMany();
      logger.info(`Found ${allApps.length} apps to clean`);
      
      // 2. Delete app folders
      const appsBasePath = path.dirname(getDyadAppPath("dummy"));
      logger.info(`Cleaning app folders in: ${appsBasePath}`);
      
      for (const app of allApps) {
        const appPath = getDyadAppPath(app.path);
        try {
          if (fs.existsSync(appPath)) {
            logger.info(`Deleting app folder: ${appPath}`);
            await fsExtra.remove(appPath);
          }
        } catch (error) {
          logger.warn(`Could not delete app folder ${appPath}:`, error);
        }
      }
      
      // 3. Clean database tables (in correct order for foreign keys)
      logger.info("Cleaning database tables");
      
      // Delete messages first
      const deletedMessages = await db.delete(messages);
      logger.info(`Deleted messages`);
      
      // Delete chats
      const deletedChats = await db.delete(chats);
      logger.info(`Deleted chats`);
      
      // Delete apps
      const deletedApps = await db.delete(apps);
      logger.info(`Deleted apps`);
      
      logger.info("Clean-all-apps completed successfully");
      return { success: true, message: "All apps cleaned successfully" };
      
    } catch (error) {
      logger.error("Clean-all-apps failed:", error);
      throw new Error(`Failed to clean apps: ${error.message}`);
    }
  });

  // Performance monitoring handlers
  handle("performance:get-report", async () => {
    return perfMonitor.generateReport();
  });

  handle("performance:get-metrics", async () => {
    return {
      completed: perfMonitor.getMetrics(),
      active: perfMonitor.getActiveOperations(),
    };
  });

  handle("performance:clear", async () => {
    perfMonitor.clearMetrics();
    return { success: true };
  });

  handle("performance:log-report", async () => {
    logPerfReport();
    return { success: true };
  });

  // Background app creation handler
  handle(
    "create-app-background",
    async (
      _,
      params: CreateAppParams,
    ): Promise<{ taskId: string; app: any; chatId: number }> => {
      const taskManager = getBackgroundTaskManager();
      
      // Create a unique task ID
      const taskId = `app-creation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Create the background task
      const task = taskManager.createTask({
        id: taskId,
        type: "app-creation",
        title: `Creating app: ${params.name}`,
        description: "Initializing app creation...",
        metadata: { 
          appName: params.name, 
          framework: params.framework,
          prompt: (params as any).prompt,
          attachments: (params as any).attachments
        }
      });

      // Start the background task (non-blocking)
      taskManager.startTask(taskId, async (abortController, updateProgress) => {
        const taskStartTime = performance.now();
        console.log(`🚀 [PERF] Starting app creation task: ${taskId} at ${new Date().toISOString()}`);
        
        // 🚀 PERFORMANCE: Check Pro limits before creating app
        const permissionCheckStart = performance.now();
        updateProgress(5, "Checking user permissions...");
        const settings = readSettings(); // Cached by our settings optimization
        const isProUser = settings.enableApplaaPro === true;
        const permissionCheckEnd = performance.now();
        console.log(`🔐 [PERF] Permission check took: ${(permissionCheckEnd - permissionCheckStart).toFixed(2)}ms`);
        
        if (!isProUser) {
          const existingApps = db.$client.prepare("SELECT COUNT(*) as count FROM apps").get() as { count: number };
          const FREE_APP_LIMIT = 5;
          
          if (existingApps.count >= FREE_APP_LIMIT) {
            throw new Error(`Free users are limited to ${FREE_APP_LIMIT} apps. Upgrade to Applaa Pro for unlimited apps.`);
          }
        }
        
        const pathValidationStart = performance.now();
        updateProgress(10, "Validating app path...");
        await ensureWorkspaceInitialized();
        const appRelPath = getAppRelativePath(
          params.name,
          (params.appType === 'mobile' || params.framework === 'expo') ? 'mobile' : 'web'
        );
        const fullAppPath = getDyadAppPath(appRelPath);
        if (fs.existsSync(fullAppPath)) {
          throw new Error(`App already exists at: ${fullAppPath}`);
        }
        const pathValidationEnd = performance.now();
        console.log(`📁 [PERF] Path validation took: ${(pathValidationEnd - pathValidationStart).toFixed(2)}ms`);
        
        // Check if cancelled
        if (abortController.signal.aborted) {
          throw new Error("App creation cancelled");
        }
        
        const dbCreateStart = performance.now();
        updateProgress(20, "Creating app database entry...");
        const appType = (params.appType === 'mobile' || params.appType === 'web')
          ? params.appType
          : (params.framework === 'expo' || params.framework === 'flutter')
            ? 'mobile'
            : 'web';
        
        const info = db.$client
          .prepare("INSERT INTO apps (name, display_name, path, app_type) VALUES (?, ?, ?, ?)")
          .run(params.name, params.displayName, appRelPath, appType);
        const dbCreateEnd = performance.now();
        console.log(`💾 [PERF] Database entry creation took: ${(dbCreateEnd - dbCreateStart).toFixed(2)}ms`);
        const insertedId = Number(info.lastInsertRowid);
        
        const row = db.$client
          .prepare(
            "SELECT id, name, display_name as displayName, path, created_at as createdAt, app_type as appType, " +
              "github_org as githubOrg, github_repo as githubRepo, github_branch as githubBranch, " +
              "supabase_project_id as supabaseProjectId, neon_project_id as neonProjectId, " +
              "neon_development_branch_id as neonDevelopmentBranchId, neon_preview_branch_id as neonPreviewBranchId, " +
              "vercel_project_id as vercelProjectId, vercel_project_name as vercelProjectName, vercel_team_id as vercelTeamId, " +
              "vercel_deployment_url as vercelDeploymentUrl, chat_context as chatContext FROM apps WHERE id = ?"
          )
          .get(insertedId) as any;

        // Normalize legacy timestamps
        if (row?.createdAt && typeof row.createdAt === "number") {
          row.createdAt = new Date(row.createdAt * 1000);
        }
        if (row?.updatedAt && typeof row.updatedAt === "number") {
          row.updatedAt = new Date(row.updatedAt * 1000);
        }
        // displayName, packageId, and slug are now properly retrieved from database
        const app = row;

        const chatCreateStart = performance.now();
        updateProgress(30, "Creating initial chat...");
        const [chat] = await db
          .insert(chats)
          .values({
            appId: app.id,
          })
          .returning();
        const chatCreateEnd = performance.now();
        console.log(`💬 [PERF] Chat creation took: ${(chatCreateEnd - chatCreateStart).toFixed(2)}ms`);

        // Check if cancelled
        if (abortController.signal.aborted) {
          throw new Error("App creation cancelled");
        }

        const templateCreateStart = performance.now();
        updateProgress(50, "Setting up app template...");
        const templateId = params.framework === 'expo' ? 'expo-base-master' : undefined;
        console.log(`📋 [PERF] Starting template creation with templateId: ${templateId}`);
        await createFromTemplate({
          fullAppPath,
          templateId,
        });
        const templateCreateEnd = performance.now();
        console.log(`📋 [PERF] Template creation took: ${(templateCreateEnd - templateCreateStart).toFixed(2)}ms`);

        const gitInitStart = performance.now();
        updateProgress(70, "Initializing git repository...");
        await git.init({
          fs: fs,
          dir: fullAppPath,
          defaultBranch: "main",
        });
        const gitInitEnd = performance.now();
        console.log(`🔧 [PERF] Git init took: ${(gitInitEnd - gitInitStart).toFixed(2)}ms`);

        const gitAddStart = performance.now();
        updateProgress(80, "Creating initial commit...");
        await git.add({
          fs: fs,
          dir: fullAppPath,
          filepath: ".",
        });
        const gitAddEnd = performance.now();
        console.log(`📝 [PERF] Git add took: ${(gitAddEnd - gitAddStart).toFixed(2)}ms`);

        const gitCommitStart = performance.now();
        const commitHash = await gitCommit({
          fs,
          dir: fullAppPath,
          message: "Initial commit",
          author: {
            name: "Applaa",
            email: "applaa@applaa.com",
          },
        });
        const gitCommitEnd = performance.now();
        console.log(`💾 [PERF] Git commit took: ${(gitCommitEnd - gitCommitStart).toFixed(2)}ms`);

        updateProgress(100, "App creation completed!");
        
        const totalTaskTime = performance.now() - taskStartTime;
        const templateTime = templateCreateEnd - templateCreateStart;
        const gitTotalTime = (gitInitEnd - gitInitStart) + (gitAddEnd - gitAddStart) + (gitCommitEnd - gitCommitStart);
        const dbTime = (dbCreateEnd - dbCreateStart) + (chatCreateEnd - chatCreateStart);
        
        console.log(`🎉 [PERF] App creation completed! Performance Summary:
          📋 Template Creation: ${templateTime.toFixed(2)}ms (${(templateTime / totalTaskTime * 100).toFixed(1)}%)
          🔧 Git Operations: ${gitTotalTime.toFixed(2)}ms (${(gitTotalTime / totalTaskTime * 100).toFixed(1)}%)
          💾 Database Operations: ${dbTime.toFixed(2)}ms (${(dbTime / totalTaskTime * 100).toFixed(1)}%)
          🚀 Total Time: ${totalTaskTime.toFixed(2)}ms
          📊 App: ${params.name} | Framework: ${params.framework}`);
        
        // Return the result with prompt info for the renderer to handle
        return { 
          app, 
          chatId: chat.id,
          shouldStartChat: !!(params as any).prompt,
          prompt: (params as any).prompt,
          attachments: (params as any).attachments || []
        };
      }).catch(error => {
        // Error will be handled by the task manager
        throw error;
      });

      // Return immediately with task info (non-blocking)
      // We still need to return app and chatId for backwards compatibility
      // but they'll be available from the task result when completed
      const quickApp = {
        id: -1, // Temporary ID
        name: params.name,
        path: params.name,
        appType: (params.appType === 'mobile' || params.appType === 'web')
          ? params.appType
          : (params.framework === 'expo' || params.framework === 'flutter')
            ? 'mobile'
            : 'web'
      };
      
      return { taskId, app: quickApp, chatId: -1 };
    }
  );

  handle(
    "create-app",
    async (
      _,
      params: CreateAppParams,
    ): Promise<{ app: any; chatId: number }> => {
      // 🚀 PERFORMANCE: Cache settings once at start to avoid repeated disk reads
      const settings = readSettings();
      // For development: just check the Pro toggle, don't require API key
      const isProUser = settings.enableApplaaPro === true;
      
      if (!isProUser) {
        // Count existing apps for free users
        const existingApps = db.$client.prepare("SELECT COUNT(*) as count FROM apps").get() as { count: number };
        const FREE_APP_LIMIT = 5;
        
        if (existingApps.count >= FREE_APP_LIMIT) {
          throw new Error(`Free users are limited to ${FREE_APP_LIMIT} apps. Upgrade to Applaa Pro for unlimited apps.`);
        }
      }
      
      await ensureWorkspaceInitialized();
      const appRelPath2 = getAppRelativePath(
        params.name,
        (params.appType === 'mobile' || params.framework === 'expo') ? 'mobile' : 'web'
      );
      const fullAppPath = getDyadAppPath(appRelPath2);
      if (fs.existsSync(fullAppPath)) {
        // 🚨 FIX: Provide helpful duplicate name handling instead of generic error
        const suggestedName = await generateUniqueAppName(params.name, params.appType);
        throw new Error(`DUPLICATE_APP_NAME:${params.name}:${suggestedName}`);
      }
      
      // Determine app type from explicit params, then framework hint, fallback to web
      const appType = (params.appType === 'mobile' || params.appType === 'web')
        ? params.appType
        : (params.framework === 'expo' || params.framework === 'flutter')
          ? 'mobile'
          : 'web';
      
      // Create a new app using a minimal, legacy-safe insert to avoid
      // referencing columns that might not exist (e.g., display_name)
      const info = db.$client
        .prepare("INSERT INTO apps (name, path, app_type) VALUES (?, ?, ?)")
        .run(params.name, appRelPath2, appType);
      const insertedId = Number(info.lastInsertRowid);
      const row = db.$client
        .prepare(
          "SELECT id, name, path, created_at as createdAt, app_type as appType, " +
            "github_org as githubOrg, github_repo as githubRepo, github_branch as githubBranch, " +
            "supabase_project_id as supabaseProjectId, neon_project_id as neonProjectId, " +
            "neon_development_branch_id as neonDevelopmentBranchId, neon_preview_branch_id as neonPreviewBranchId, " +
            "vercel_project_id as vercelProjectId, vercel_project_name as vercelProjectName, vercel_team_id as vercelTeamId, " +
            "vercel_deployment_url as vercelDeploymentUrl, chat_context as chatContext FROM apps WHERE id = ?"
        )
        .get(insertedId) as any;

      // Normalize legacy timestamps
      if (row?.createdAt && typeof row.createdAt === "number") {
        row.createdAt = new Date(row.createdAt * 1000);
      }
      if (row?.updatedAt && typeof row.updatedAt === "number") {
        row.updatedAt = new Date(row.updatedAt * 1000);
      }
      // New columns don't exist on legacy DBs
      row.displayName = undefined;
      row.packageId = undefined;
      row.slug = undefined;
      const app = row;

      // Create an initial chat for this app
      const [chat] = await db
        .insert(chats)
        .values({
          appId: app.id,
        })
        .returning();

      // 🚀 PERFORMANCE FIX: Template creation already handles Git initialization
      // Pass template info to avoid race condition with settings
      const templateId = params.framework === 'expo' ? 'expo-base-master' : undefined;
      await createFromTemplate({
        fullAppPath,
        templateId,
      });

      // 🚀 PERFORMANCE: Get commit hash from template creation (no duplicate Git ops)
      let commitHash: string;
      try {
        // Get the commit hash that was created by initializeGitRepository in createFromTemplate
        const commits = await git.log({
          fs: fs,
          dir: fullAppPath,
          depth: 1,
        });
        commitHash = commits.length > 0 ? commits[0].oid : "initial";
      } catch (error) {
        logger.warn("Could not get commit hash, using fallback:", error);
        commitHash = "initial";
      }

      // Update chat with initial commit hash
      await db
        .update(chats)
        .set({
          initialCommitHash: commitHash,
        })
        .where(eq(chats.id, chat.id));

      return { app, chatId: chat.id };
    },
  );

  handle(
    "copy-app",
    async (_, params: CopyAppParams): Promise<{ app: any }> => {
      const { appId, newAppName, withHistory } = params;

      // 1. Check if an app with the new name already exists
      const existingApp = await getAppSafe(null); // We'll handle this differently
      // Check by name using direct query since we need to search by name, not ID
      const existingAppRow = db.$client
        .prepare("SELECT id FROM apps WHERE name = ?")
        .get(newAppName) as any;

      if (existingAppRow) {
        throw new Error(`An app named "${newAppName}" already exists.`);
      }

      // 2. Find the original app
      const originalApp = await getAppSafe(appId);

      if (!originalApp) {
        throw new Error("Original app not found.");
      }

      const originalAppPath = getDyadAppPath(originalApp.path);
      const newAppPath = getDyadAppPath(newAppName);

      // 3. Copy the app folder
      try {
        await copyDir(originalAppPath, newAppPath, (source: string) => {
          if (!withHistory && path.basename(source) === ".git") {
            return false;
          }
          return true;
        });
      } catch (error) {
        logger.error("Failed to copy app directory:", error);
        throw new Error("Failed to copy app directory.");
      }

      if (!withHistory) {
        // Initialize git repo and create first commit
        await git.init({
          fs: fs,
          dir: newAppPath,
          defaultBranch: "main",
        });

        // Stage all files
        await git.add({
          fs: fs,
          dir: newAppPath,
          filepath: ".",
        });

        // Create initial commit
        await gitCommit({
          path: newAppPath,
          message: "Init Applaa app",
        });
      }

      // 4. Create a new app entry in the database
      const [newDbApp] = await db
        .insert(apps)
        .values({
          name: newAppName,
          path: newAppName, // Use the new name for the path
          // Explicitly set these to null because we don't want to copy them over.
          // Note: we could just leave them out since they're nullable field, but this
          // is to make it explicit we intentionally don't want to copy them over.
          supabaseProjectId: null,
          githubOrg: null,
          githubRepo: null,
        })
        .returning();

      return { app: newDbApp };
    },
  );

  handle("get-app", async (_, appId: number): Promise<App> => {
    let app: any;
    try {
      app = await db.query.apps.findFirst({
        where: eq(apps.id, appId),
      });
    } catch (err) {
      // Legacy DB fallback when new columns are missing
      logger.warn("get-app: falling back to legacy SELECT due to:", err);
      const row = db.$client
        .prepare(
          "SELECT id, name, path, created_at as createdAt, app_type as appType, " +
            "github_org as githubOrg, github_repo as githubRepo, github_branch as githubBranch, " +
            "supabase_project_id as supabaseProjectId, neon_project_id as neonProjectId, " +
            "neon_development_branch_id as neonDevelopmentBranchId, neon_preview_branch_id as neonPreviewBranchId, " +
            "vercel_project_id as vercelProjectId, vercel_project_name as vercelProjectName, vercel_team_id as vercelTeamId, " +
            "vercel_deployment_url as vercelDeploymentUrl, chat_context as chatContext FROM apps WHERE id = ?"
        )
        .get(appId) as any;
      app = row;
      if (app) {
        if (app.createdAt && typeof app.createdAt === "number") {
          app.createdAt = new Date(app.createdAt * 1000);
        }
        if (app.updatedAt && typeof app.updatedAt === "number") {
          app.updatedAt = new Date(app.updatedAt * 1000);
        }
        app.displayName = undefined;
        app.packageId = undefined;
        app.slug = undefined;
      }
    }

    if (!app) {
      throw new Error("App not found");
    }

    // Get app files
    const appPath = getDyadAppPath(app.path);
    let files: string[] = [];

    try {
      files = getFilesRecursively(appPath, appPath);
      // Normalize the path to use forward slashes so file tree (UI)
      // can parse it more consistently across platforms.
      files = files.map((path) => normalizePath(path));
    } catch (error) {
      logger.error(`Error reading files for app ${appId}:`, error);
      // Return app even if files couldn't be read
    }

    let supabaseProjectName: string | null = null;
    const settings = readSettings();
    if (app.supabaseProjectId && settings.supabase?.accessToken?.value) {
      supabaseProjectName = await getSupabaseProjectName(app.supabaseProjectId);
    }

    let vercelTeamSlug: string | null = null;
    if (app.vercelTeamId) {
      vercelTeamSlug = await getVercelTeamSlug(app.vercelTeamId);
    }

    return {
      ...app,
      files,
      supabaseProjectName,
      vercelTeamSlug,
    } as App;
  });

  ipcMain.handle("list-apps", async () => {
    let allApps: any[] = [];
    try {
      allApps = await db.query.apps.findMany({
        orderBy: [desc(apps.createdAt)],
      });
    } catch (err) {
      // Backwards-compatible fallback for databases that don't have new columns yet
      log.warn("list-apps: falling back to legacy SELECT due to:", err);
      try {
        const rows = db.$client
          .prepare(
            "SELECT id, name, display_name as displayName, path, created_at as createdAt, app_type as appType, " +
              "github_org as githubOrg, github_repo as githubRepo, github_branch as githubBranch, " +
              "supabase_project_id as supabaseProjectId, neon_project_id as neonProjectId, " +
              "neon_development_branch_id as neonDevelopmentBranchId, neon_preview_branch_id as neonPreviewBranchId, " +
              "vercel_project_id as vercelProjectId, vercel_project_name as vercelProjectName, vercel_team_id as vercelTeamId, " +
              "vercel_deployment_url as vercelDeploymentUrl, chat_context as chatContext FROM apps ORDER BY created_at DESC"
          )
          .all();
        allApps = rows.map((r: any) => ({
          ...r,
          // createdAt/updatedAt are seconds from unixepoch() → convert to Date
          createdAt: r.createdAt ? new Date(r.createdAt * 1000) : undefined,
          updatedAt: r.updatedAt ? new Date(r.updatedAt * 1000) : undefined,
          // displayName is now properly retrieved from database
        }));
      } catch (fallbackErr) {
        log.error("list-apps: legacy SELECT failed:", fallbackErr);
        throw fallbackErr;
      }
    }

    // Add files to each app for proper categorization
    const appsWithFiles = allApps.map(app => {
      const appPath = getDyadAppPath(app.path);
      let files: string[] = [];

      try {
        files = getFilesRecursively(appPath, appPath);
        // Normalize the path to use forward slashes so file tree (UI)
        // can parse it more consistently across platforms.
        files = files.map((path) => normalizePath(path));
      } catch (error) {
        logger.error(`Error reading files for app ${app.id}:`, error);
        // Return app even if files couldn't be read
      }

      return {
        ...app,
        files,
      };
    });

    return {
      apps: appsWithFiles,
      appBasePath: getDyadAppPath("$APP_BASE_PATH"),
    };
  });

  // Generate smart app names (LLM-backed) in main process
  ipcMain.handle(
    "generate-app-names",
    async (
      _,
      params: {
        concept: string;
        domain?: string;
        audience?: string;
        tone?: string;
        features?: string[];
      },
    ) => {
      logger.info(`IPC: generate-app-names called with concept: "${params.concept}"`);
      try {
        const result = await generateSmartAppNames(params);
        logger.info(`IPC: generate-app-names returning ${result.length} suggestions`);
        return result;
      } catch (error) {
        logger.error("IPC: generate-app-names failed:", error);
        throw error;
      }
    },
  );
  
  logger.info("App handlers registered successfully, including generate-app-names");

  // Get app files for categorization (lightweight version)
  handle("get-app-files", async (_, appId: number): Promise<string[]> => {
    const app = await getAppSafe(appId);

    if (!app) {
      throw new Error("App not found");
    }

    const appPath = getDyadAppPath(app.path);
    let files: string[] = [];

    try {
      files = getFilesRecursively(appPath, appPath);
      // Normalize the path to use forward slashes so file tree (UI)
      // can parse it more consistently across platforms.
      files = files.map((path) => normalizePath(path));
    } catch (error) {
      logger.error(`Error reading files for app ${appId}:`, error);
      // Return empty array if files couldn't be read
    }

    return files;
  });

  ipcMain.handle(
    "read-app-file",
    async (_, { appId, filePath }: { appId: number; filePath: string }) => {
      const app = await getAppSafe(appId);

      if (!app) {
        throw new Error("App not found");
      }

      const appPath = getDyadAppPath(app.path);
      const fullPath = path.join(appPath, filePath);

      // Check if the path is within the app directory (security check)
      if (!fullPath.startsWith(appPath)) {
        throw new Error("Invalid file path");
      }

      if (!fs.existsSync(fullPath)) {
        throw new Error("File not found");
      }

      try {
        const contents = fs.readFileSync(fullPath, "utf-8");
        return contents;
      } catch (error) {
        logger.error(`Error reading file ${filePath} for app ${appId}:`, error);
        throw new Error("Failed to read file");
      }
    },
  );

  // Do NOT use handle for this, it contains sensitive information.
  ipcMain.handle("get-env-vars", async () => {
    const envVars: Record<string, string | undefined> = {};
    
    // Only load environment variables in development, never in packaged apps
    if (process.env.NODE_ENV === 'development' && !process.resourcesPath && !process.defaultApp) {
      const providers = await getLanguageModelProviders();
      for (const provider of providers) {
        if (provider.envVarName) {
          envVars[provider.envVarName] = getEnvVar(provider.envVarName);
        }
      }
    }
    
    return envVars;
  });

  ipcMain.handle(
    "run-app",
    async (
      event: Electron.IpcMainInvokeEvent,
      { appId }: { appId: number },
    ): Promise<void> => {
      return withLock(appId, async () => {
        // Check if app is already running
        if (runningApps.has(appId)) {
          logger.debug(`App ${appId} is already running.`);
          return;
        }

        const app = await getAppSafe(appId);

        if (!app) {
          throw new Error("App not found");
        }

        logger.debug(`Starting app ${appId} in path ${app.path}`);

        const appPath = getDyadAppPath(app.path);
        try {
          // Kill any orphaned process on port 32100 (in case previous run left it)
          await killProcessOnPort(32100);
          await executeApp({
            appPath,
            appId,
            event,
            isNeon: !!app.neonProjectId,
          });

          return;
        } catch (error: any) {
          logger.error(`Error running app ${appId}:`, error);
          // Ensure cleanup if error happens during setup but before process events are handled
          if (
            runningApps.has(appId) &&
            runningApps.get(appId)?.processId === processCounter.value
          ) {
            runningApps.delete(appId);
          }
          throw new Error(`Failed to run app ${appId}: ${error.message}`);
        }
      });
    },
  );

  ipcMain.handle(
    "stop-app",
    async (_, { appId }: { appId: number }): Promise<void> => {
      logger.log(
        `Attempting to stop app ${appId}. Current running apps: ${runningApps.size}`,
      );
      return withLock(appId, async () => {
        const appInfo = runningApps.get(appId);

        if (!appInfo) {
          logger.log(
            `App ${appId} not found in running apps map. Assuming already stopped.`,
          );
          return;
        }

        const { process, processId } = appInfo;
        logger.log(
          `Found running app ${appId} with processId ${processId} (PID: ${process.pid}). Attempting to stop.`,
        );

        // Check if the process is already exited or closed
        if (process.exitCode !== null || process.signalCode !== null) {
          logger.log(
            `Process for app ${appId} (PID: ${process.pid}) already exited (code: ${process.exitCode}, signal: ${process.signalCode}). Cleaning up map.`,
          );
          runningApps.delete(appId); // Ensure cleanup if somehow missed
          return;
        }

        try {
          // Use the killProcess utility to stop the process
          await killProcess(process);

          // Now, safely remove the app from the map *after* confirming closure
          removeAppIfCurrentProcess(appId, process);

          return;
        } catch (error: any) {
          logger.error(
            `Error stopping app ${appId} (PID: ${process.pid}, processId: ${processId}):`,
            error,
          );
          // Attempt cleanup even if an error occurred during the stop process
          removeAppIfCurrentProcess(appId, process);
          throw new Error(`Failed to stop app ${appId}: ${error.message}`);
        }
      });
    },
  );

  ipcMain.handle(
    "restart-app",
    async (
      event: Electron.IpcMainInvokeEvent,
      {
        appId,
        removeNodeModules,
      }: { appId: number; removeNodeModules?: boolean },
    ): Promise<void> => {
      logger.log(`Restarting app ${appId}`);
      return withLock(appId, async () => {
        try {
          // First stop the app if it's running
          const appInfo = runningApps.get(appId);
          if (appInfo) {
            const { process, processId } = appInfo;
            logger.log(
              `Stopping app ${appId} (processId ${processId}) before restart`,
            );

            await killProcess(process);
            runningApps.delete(appId);
          } else {
            logger.log(`App ${appId} not running. Proceeding to start.`);
          }

          // Kill any orphaned process on port 32100 (in case previous run left it)
          await killProcessOnPort(32100);

          // Now start the app again (legacy-safe)
          const app = await getAppSafe(appId);

          if (!app) {
            throw new Error("App not found");
          }

          const appPath = getDyadAppPath(app.path);

          // Remove node_modules if requested
          if (removeNodeModules) {
            const nodeModulesPath = path.join(appPath, "node_modules");
            logger.log(
              `Removing node_modules for app ${appId} at ${nodeModulesPath}`,
            );
            if (fs.existsSync(nodeModulesPath)) {
              await fsPromises.rm(nodeModulesPath, {
                recursive: true,
                force: true,
              });
              logger.log(`Successfully removed node_modules for app ${appId}`);
            } else {
              logger.log(`No node_modules directory found for app ${appId}`);
            }
          }

          logger.debug(
            `Executing app ${appId} in path ${app.path} after restart request`,
          ); // Adjusted log

          await executeApp({
            appPath,
            appId,
            event,
            isNeon: !!app.neonProjectId,
          }); // This will handle starting either mode

          return;
        } catch (error) {
          logger.error(`Error restarting app ${appId}:`, error);
          throw error;
        }
      });
    },
  );

  ipcMain.handle(
    "edit-app-file",
    async (
      _,
      {
        appId,
        filePath,
        content,
      }: { appId: number; filePath: string; content: string },
    ): Promise<EditAppFileReturnType> => {
      const app = await db.query.apps.findFirst({
        where: eq(apps.id, appId),
      });

      if (!app) {
        throw new Error("App not found");
      }

      const appPath = getDyadAppPath(app.path);
      const fullPath = path.join(appPath, filePath);

      // Check if the path is within the app directory (security check)
      if (!fullPath.startsWith(appPath)) {
        throw new Error("Invalid file path");
      }

      if (app.neonProjectId && app.neonDevelopmentBranchId) {
        try {
          await storeDbTimestampAtCurrentVersion({
            appId: app.id,
          });
        } catch (error) {
          logger.error(
            "Error storing Neon timestamp at current version:",
            error,
          );
          throw new Error(
            "Could not store Neon timestamp at current version; database versioning functionality is not working: " +
              error,
          );
        }
      }

      // Ensure directory exists
      const dirPath = path.dirname(fullPath);
      await fsPromises.mkdir(dirPath, { recursive: true });

      try {
        await fsPromises.writeFile(fullPath, content, "utf-8");

        // Trigger hot reload for Expo apps when files are changed by chat
        try {
          const { triggerExpoHotReload } = await import("./expo_handlers");
          await triggerExpoHotReload();
          logger.info(`🔥 Triggered hot reload for file change: ${filePath}`);
        } catch (reloadError) {
          logger.warn("Failed to trigger hot reload:", reloadError);
        }

        // Check if git repository exists and commit the change
        if (fs.existsSync(path.join(appPath, ".git"))) {
          await git.add({
            fs,
            dir: appPath,
            filepath: filePath,
          });

          await gitCommit({
            path: appPath,
            message: `Updated ${filePath}`,
          });
        }
      } catch (error: any) {
        logger.error(`Error writing file ${filePath} for app ${appId}:`, error);
        throw new Error(`Failed to write file: ${error.message}`);
      }

      if (isServerFunction(filePath) && app.supabaseProjectId) {
        try {
          await deploySupabaseFunctions({
            supabaseProjectId: app.supabaseProjectId,
            functionName: path.basename(path.dirname(filePath)),
            content: content,
          });
        } catch (error) {
          logger.error(`Error deploying Supabase function ${filePath}:`, error);
          return {
            warning: `File saved, but failed to deploy Supabase function: ${filePath}: ${error}`,
          };
        }
      }
      return {};
    },
  );

  ipcMain.handle(
    "delete-app",
    async (_, { appId }: { appId: number }): Promise<void> => {
      // Static server worker is NOT terminated here anymore

      return withLock(appId, async () => {
        // Check if app exists
        const app = await getAppSafe(appId);

        if (!app) {
          throw new Error("App not found");
        }

        const appPath = getDyadAppPath(app.path);

        // 🚀 ENHANCED: Kill all processes that might be using the app directory
        try {
          logger.log(`🔄 Stopping all processes for app ${appId} before deletion`);
          
          // Stop the app if it's running
          if (runningApps.has(appId)) {
            const appInfo = runningApps.get(appId)!;
            try {
              await killProcess(appInfo.process);
              runningApps.delete(appId);
              logger.log(`✅ Stopped running app process for ${appId}`);
            } catch (error: any) {
              logger.warn(`⚠️ Error stopping app process ${appId}:`, error);
            }
          }

          // Kill processes on ports that might be used by this specific app
          // Use flexible port detection instead of hardcoded 8081
          const { getPortUtils } = await import("./port_utils");
          const portUtils = getPortUtils();
          
          try {
            // Only kill ports if they're specifically associated with this app
            // Check if the app is an Expo app and has running processes
            const appFramework = app.framework || 'unknown';
            if (appFramework === 'expo') {
              // For Expo apps, try to find and kill only the ports used by this specific app
              const portsToCheck = [8081, 8082, 8083, 19000, 19001];
              for (const port of portsToCheck) {
                try {
                  // Only kill if the port is actually in use and we can confirm it's from this app
                  const isInUse = !(await portUtils.isPortFree(port));
                  if (isInUse) {
                    // Be more conservative - only kill if we're sure it's this app's process
                    logger.log(`🔍 Port ${port} is in use, checking if it belongs to app ${appId}`);
                    await killPort(port);
                    logger.log(`✅ Killed processes on port ${port} for app ${appId}`);
                  }
                } catch (error: any) {
                  logger.debug(`No processes found on port ${port}: ${error.message}`);
                }
              }
            }
          } catch (error: any) {
            logger.warn(`⚠️ Error during port cleanup for app ${appId}:`, error);
          }

          // Kill any Node processes that might be holding file locks (more targeted approach)
          try {
            const { execAsync } = await import("../utils/runShellCommand");
            if (process.platform === "win32") {
              // Windows: Only kill processes that are specifically in the app directory
              // Avoid killing the main Applaa process by being more specific
              try {
                // Kill expo processes that might be related to this app
                await execAsync(`taskkill /F /IM expo.exe /T`, { timeout: 5000 }).catch(() => {});
                
                // Only kill node processes if they're specifically related to this app path
                // This is safer than killing ALL node processes
                logger.log(`🔍 Checking for Node processes in app directory: ${appPath}`);
                
                // Use wmic to find processes with the specific app path in their command line
                const wmicResult = await execAsync(
                  `wmic process where "name='node.exe' and commandline like '%${appPath.replace(/\\/g, '\\\\')}%'" get processid /format:value`,
                  { timeout: 5000 }
                ).catch(() => ({ stdout: '' }));
                
                const pids = wmicResult.stdout.match(/ProcessId=(\d+)/g);
                if (pids && pids.length > 0) {
                  for (const pidMatch of pids) {
                    const pid = pidMatch.split('=')[1];
                    if (pid && pid !== '0') {
                      await execAsync(`taskkill /F /PID ${pid}`, { timeout: 2000 }).catch(() => {});
                      logger.log(`✅ Killed Node process ${pid} for app ${appId}`);
                    }
                  }
                } else {
                  logger.log(`ℹ️ No Node processes found for app directory: ${appPath}`);
                }
              } catch (wmicError: any) {
                logger.debug(`Process detection completed: ${wmicError.message}`);
              }
            }
          } catch (error: any) {
            logger.debug(`Process cleanup completed: ${error.message}`);
          }

          // Wait a moment for processes to fully terminate
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error: any) {
          logger.warn(`⚠️ Process cleanup had issues, continuing with deletion:`, error);
        }

        // Delete app from database
        try {
          await db.delete(apps).where(eq(apps.id, appId));
          logger.log(`✅ Deleted app ${appId} from database`);
          // Note: Associated chats will cascade delete
        } catch (error: any) {
          logger.error(`❌ Error deleting app ${appId} from database:`, error);
          throw new Error(
            `Failed to delete app from database: ${error.message}`,
          );
        }

        // 🚀 ENHANCED: Delete app files with retry logic
        try {
          await deleteAppFilesWithRetry(appPath, appId);
          logger.log(`✅ Successfully deleted app files for ${appId}`);
        } catch (error: any) {
          logger.error(`❌ Error deleting app files for app ${appId}:`, error);
          throw new Error(
            `App deleted from database, but failed to delete app files. Please delete app files from ${appPath} manually.\n\nError: ${error.message}`,
          );
        }
      });
    },
  );

  ipcMain.handle(
    "rename-app",
    async (
      _,
      {
        appId,
        appName,
        appPath,
      }: { appId: number; appName: string; appPath: string },
    ): Promise<void> => {
      return withLock(appId, async () => {
        // Check if app exists
        const app = await getAppSafe(appId);

        if (!app) {
          throw new Error("App not found");
        }

        // Check for conflicts with existing apps using direct queries
        const nameConflictRow = db.$client
          .prepare("SELECT id FROM apps WHERE name = ? AND id != ?")
          .get(appName, appId) as any;

        const pathConflictRow = db.$client
          .prepare("SELECT id FROM apps WHERE path = ? AND id != ?")
          .get(appPath, appId) as any;

        if (nameConflictRow) {
          throw new Error(`An app with the name '${appName}' already exists`);
        }

        if (pathConflictRow) {
          throw new Error(`An app with the path '${appPath}' already exists`);
        }

        // Stop the app if it's running
        if (runningApps.has(appId)) {
          const appInfo = runningApps.get(appId)!;
          try {
            await killProcess(appInfo.process);
            runningApps.delete(appId);
          } catch (error: any) {
            logger.error(`Error stopping app ${appId} before renaming:`, error);
            throw new Error(
              `Failed to stop app before renaming: ${error.message}`,
            );
          }
        }

        const oldAppPath = getDyadAppPath(app.path);
        const newAppPath = getDyadAppPath(appPath);
        // Only move files if needed
        if (newAppPath !== oldAppPath) {
          // Move app files
          try {
            // Check if destination directory already exists
            if (fs.existsSync(newAppPath)) {
              throw new Error(
                `Destination path '${newAppPath}' already exists`,
              );
            }

            // Create parent directory if it doesn't exist
            await fsPromises.mkdir(path.dirname(newAppPath), {
              recursive: true,
            });

            // Copy the directory without node_modules
            await copyDir(oldAppPath, newAppPath);
          } catch (error: any) {
            logger.error(
              `Error moving app files from ${oldAppPath} to ${newAppPath}:`,
              error,
            );
            throw new Error(`Failed to move app files: ${error.message}`);
          }

          try {
            // Delete the old directory
            await fsPromises.rm(oldAppPath, { recursive: true, force: true });
          } catch (error: any) {
            // Why is this just a warning? This happens quite often on Windows
            // because it has an aggressive file lock.
            //
            // Not deleting the old directory is annoying, but not a big deal
            // since the user can do it themselves if they need to.
            logger.warn(
              `Error deleting old app directory ${oldAppPath}:`,
              error,
            );
          }
        }

        // Update app in database
        try {
          await db
            .update(apps)
            .set({
              name: appName,
              path: appPath,
            })
            .where(eq(apps.id, appId))
            .returning();

          return;
        } catch (error: any) {
          // Attempt to rollback the file move
          if (newAppPath !== oldAppPath) {
            try {
              // Copy back from new to old
              await copyDir(newAppPath, oldAppPath);
              // Delete the new directory
              await fsPromises.rm(newAppPath, { recursive: true, force: true });
            } catch (rollbackError) {
              logger.error(
                `Failed to rollback file move during rename error:`,
                rollbackError,
              );
            }
          }

          logger.error(`Error updating app ${appId} in database:`, error);
          throw new Error(`Failed to update app in database: ${error.message}`);
        }
      });
    },
  );

  ipcMain.handle("reset-all", async (): Promise<void> => {
    logger.log("start: resetting all apps and settings.");
    // Stop all running apps first
    logger.log("stopping all running apps...");
    const runningAppIds = Array.from(runningApps.keys());
    for (const appId of runningAppIds) {
      try {
        const appInfo = runningApps.get(appId)!;
        await killProcess(appInfo.process);
        runningApps.delete(appId);
      } catch (error) {
        logger.error(`Error stopping app ${appId} during reset:`, error);
        // Continue with reset even if stopping fails
      }
    }
    logger.log("all running apps stopped.");
    logger.log("deleting database...");
    // 1. Drop the database by deleting the SQLite file
    const dbPath = getDatabasePath();
    if (fs.existsSync(dbPath)) {
      // Close database connections first
      if (db.$client) {
        db.$client.close();
      }
      await fsPromises.unlink(dbPath);
      logger.log(`Database file deleted: ${dbPath}`);
    }
    logger.log("database deleted.");
    logger.log("deleting settings...");
    // 2. Remove settings
    const userDataPath = getUserDataPath();
    const settingsPath = path.join(userDataPath, "user-settings.json");

    if (fs.existsSync(settingsPath)) {
      await fsPromises.unlink(settingsPath);
      logger.log(`Settings file deleted: ${settingsPath}`);
    }
    logger.log("settings deleted.");
    // 3. Remove all app files recursively
    // Doing this last because it's the most time-consuming and the least important
    // in terms of resetting the app state.
    logger.log("removing all app files...");
    const dyadAppPath = getDyadAppPath(".");
    if (fs.existsSync(dyadAppPath)) {
      await fsPromises.rm(dyadAppPath, { recursive: true, force: true });
      // Recreate the base directory
      await fsPromises.mkdir(dyadAppPath, { recursive: true });
    }
    logger.log("all app files removed.");
    logger.log("reset all complete.");
  });

  ipcMain.handle("get-app-version", async (): Promise<{ version: string }> => {
    // Read version from package.json at project root
    const packageJsonPath = path.resolve(__dirname, "..", "..", "package.json");
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
    return { version: packageJson.version };
  });

  handle("rename-branch", async (_, params: RenameBranchParams) => {
    const { appId, oldBranchName, newBranchName } = params;
    const app = await db.query.apps.findFirst({
      where: eq(apps.id, appId),
    });

    if (!app) {
      throw new Error("App not found");
    }

    const appPath = getDyadAppPath(app.path);

    return withLock(appId, async () => {
      try {
        // Check if the old branch exists
        const branches = await git.listBranches({ fs, dir: appPath });
        if (!branches.includes(oldBranchName)) {
          throw new Error(`Branch '${oldBranchName}' not found.`);
        }

        // Check if the new branch name already exists
        if (branches.includes(newBranchName)) {
          // If newBranchName is 'main' and oldBranchName is 'master',
          // and 'main' already exists, we might want to allow this if 'main' is the current branch
          // and just switch to it, or delete 'master'.
          // For now, let's keep it simple and throw an error.
          throw new Error(
            `Branch '${newBranchName}' already exists. Cannot rename.`,
          );
        }

        await git.renameBranch({
          fs: fs,
          dir: appPath,
          oldref: oldBranchName,
          ref: newBranchName,
        });
        logger.info(
          `Branch renamed from '${oldBranchName}' to '${newBranchName}' for app ${appId}`,
        );
      } catch (error: any) {
        logger.error(
          `Failed to rename branch for app ${appId}: ${error.message}`,
        );
        throw new Error(
          `Failed to rename branch '${oldBranchName}' to '${newBranchName}': ${error.message}`,
        );
      }
    });
  });

  handle(
    "respond-to-app-input",
    async (_, { appId, response }: RespondToAppInputParams) => {
      if (response !== "y" && response !== "n") {
        throw new Error(`Invalid response: ${response}`);
      }
      const appInfo = runningApps.get(appId);

      if (!appInfo) {
        throw new Error(`App ${appId} is not running`);
      }

      const { process } = appInfo;

      if (!process.stdin) {
        throw new Error(`App ${appId} process has no stdin available`);
      }

      try {
        // Check if stdin is available and not destroyed
        if (!process.stdin || process.stdin.destroyed || process.killed) {
          throw new Error(`App ${appId} process stdin is not available or process is killed`);
        }
        
        // Write the response to stdin with a newline
        process.stdin.write(`${response}\n`);
        logger.debug(`Sent response '${response}' to app ${appId} stdin`);
      } catch (error: any) {
        logger.error(`Error sending response to app ${appId}:`, error);
        throw new Error(`Failed to send response to app: ${error.message}`);
      }
    },
  );

  // Directory and file management handlers
  ipcMain.handle("app:get-base-path", async () => {
    try {
      const settings = readSettings();
      const customPath = settings.customAppsDirectory;
      
      if (customPath && fs.existsSync(customPath)) {
        return { basePath: customPath };
      }
      
      // Default to apps directory in user's home
      const defaultPath = path.join(os.homedir(), "Apps");
      return { basePath: defaultPath };
    } catch (error) {
      logger.error("Error getting apps base path:", error);
      throw new Error(`Failed to get apps base path: ${error.message}`);
    }
  });

  ipcMain.handle("app:select-directory", async (event, options: { title?: string; defaultPath?: string } = {}) => {
    try {
      const { dialog } = require("electron");
      const result = await dialog.showOpenDialog({
        title: options.title || "Select Directory",
        defaultPath: options.defaultPath,
        properties: ["openDirectory"],
      });
      
      if (result.canceled || result.filePaths.length === 0) {
        return { path: null };
      }
      
      return { path: result.filePaths[0] };
    } catch (error) {
      logger.error("Error selecting directory:", error);
      throw new Error(`Failed to select directory: ${error.message}`);
    }
  });
}
