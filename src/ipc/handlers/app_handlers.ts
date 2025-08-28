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

const logger = log.scope("app_handlers");
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
  const spawnedProcess = spawn(
    "(pnpm install && pnpm run dev --port 32100) || (npm install --legacy-peer-deps && npm run dev -- --port 32100)",
    [],
    {
      cwd: appPath,
      shell: true,
      stdio: "pipe", // Ensure stdio is piped so we can capture output/errors and detect close
      detached: false, // Ensure child process is attached to the main process lifecycle unless explicitly backgrounded
    },
  );

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
              message: `[dyad-proxy-server]started=[${proxyUrl}] original=[${urlMatch[1]}]`,
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
        // Check Pro limits before creating app
        updateProgress(5, "Checking user permissions...");
        const settings = readSettings();
        const isProUser = settings.enableApplaaPro === true;
        
        if (!isProUser) {
          const existingApps = db.$client.prepare("SELECT COUNT(*) as count FROM apps").get() as { count: number };
          const FREE_APP_LIMIT = 5;
          
          if (existingApps.count >= FREE_APP_LIMIT) {
            throw new Error(`Free users are limited to ${FREE_APP_LIMIT} apps. Upgrade to Applaa Pro for unlimited apps.`);
          }
        }
        
        updateProgress(10, "Validating app path...");
        const appPath = params.name;
        const fullAppPath = getDyadAppPath(appPath);
        if (fs.existsSync(fullAppPath)) {
          throw new Error(`App already exists at: ${fullAppPath}`);
        }
        
        // Check if cancelled
        if (abortController.signal.aborted) {
          throw new Error("App creation cancelled");
        }
        
        updateProgress(20, "Creating app database entry...");
        const appType = (params.appType === 'mobile' || params.appType === 'web')
          ? params.appType
          : (params.framework === 'expo' || params.framework === 'flutter')
            ? 'mobile'
            : 'web';
        
        const info = db.$client
          .prepare("INSERT INTO apps (name, path, app_type) VALUES (?, ?, ?)")
          .run(params.name, appPath, appType);
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
        row.displayName = undefined;
        row.packageId = undefined;
        row.slug = undefined;
        const app = row;

        updateProgress(30, "Creating initial chat...");
        const [chat] = await db
          .insert(chats)
          .values({
            appId: app.id,
          })
          .returning();

        // Check if cancelled
        if (abortController.signal.aborted) {
          throw new Error("App creation cancelled");
        }

        updateProgress(50, "Setting up app template...");
        const templateId = params.framework === 'expo' ? 'expo-base-master' : undefined;
        await createFromTemplate({
          fullAppPath,
          templateId,
        });

        updateProgress(70, "Initializing git repository...");
        await git.init({
          fs: fs,
          dir: fullAppPath,
          defaultBranch: "main",
        });

        updateProgress(80, "Creating initial commit...");
        await git.add({
          fs: fs,
          dir: fullAppPath,
          filepath: ".",
        });

        const commitHash = await gitCommit({
          fs,
          dir: fullAppPath,
          message: "Initial commit",
          author: {
            name: "Applaa",
            email: "applaa@applaa.com",
          },
        });

        updateProgress(100, "App creation completed!");
        
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
      // Check Pro limits before creating app
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
      
      const appPath = params.name;
      const fullAppPath = getDyadAppPath(appPath);
      if (fs.existsSync(fullAppPath)) {
        throw new Error(`App already exists at: ${fullAppPath}`);
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
        .run(params.name, appPath, appType);
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

      // Pass template info to avoid race condition with settings
      const templateId = params.framework === 'expo' ? 'expo-base-master' : undefined;
      await createFromTemplate({
        fullAppPath,
        templateId,
      });

      // Initialize git repo and create first commit
      await git.init({
        fs: fs,
        dir: fullAppPath,
        defaultBranch: "main",
      });

      // Stage all files
      await git.add({
        fs: fs,
        dir: fullAppPath,
        filepath: ".",
      });

      // Create initial commit
      const commitHash = await gitCommit({
        path: fullAppPath,
        message: "Init Applaa app",
      });

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
            "SELECT id, name, path, created_at as createdAt, app_type as appType, " +
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
          displayName: undefined,
          packageId: undefined,
          slug: undefined,
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
      return generateSmartAppNames(params);
    },
  );

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

        // Stop the app if it's running
        if (runningApps.has(appId)) {
          const appInfo = runningApps.get(appId)!;
          try {
            logger.log(`Stopping app ${appId} before deletion.`); // Adjusted log
            await killProcess(appInfo.process);
            runningApps.delete(appId);
          } catch (error: any) {
            logger.error(`Error stopping app ${appId} before deletion:`, error); // Adjusted log
            // Continue with deletion even if stopping fails
          }
        }

        // Delete app from database
        try {
          await db.delete(apps).where(eq(apps.id, appId));
          // Note: Associated chats will cascade delete
        } catch (error: any) {
          logger.error(`Error deleting app ${appId} from database:`, error);
          throw new Error(
            `Failed to delete app from database: ${error.message}`,
          );
        }

        // Delete app files
        const appPath = getDyadAppPath(app.path);
        try {
          await fsPromises.rm(appPath, { recursive: true, force: true });
        } catch (error: any) {
          logger.error(`Error deleting app files for app ${appId}:`, error);
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
