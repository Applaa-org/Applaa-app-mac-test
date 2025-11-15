import { ipcMain } from "electron";
import { db } from "../../db";
import { apps, chats } from "../../db/schema";
import { eq } from "drizzle-orm";
import { readSettings } from "../../main/settings";
import { getDyadAppPath } from "../../paths/paths";
import { ensureWorkspaceInitialized, getAppRelativePath } from "../../paths/workspace";
import fs from "node:fs";
import log from "electron-log";
import { createFromTemplate } from "./createFromTemplate";
import { gitCommit } from "../utils/git_utils";
import git from "isomorphic-git";
import { perfMonitor, startPerf, endPerf } from "../utils/performance_monitor";
import { getBackgroundTaskManager } from "./background_task_manager";
import { ExpoTemplateCreator } from "./expo_template_creator";
import { healAppCode } from "../utils/code_healer";
import { execAsync } from "../utils/runShellCommand";
import * as path from 'path';
import { unifiedInstallDependencies } from "./unified_dependency_manager";

const logger = log.scope("parallel_app_creation");

interface ParallelAppCreationParams {
  name: string;
  displayName?: string;
  packageId?: string;
  slug?: string;
  appType: 'web' | 'mobile' | 'godot';
  framework: 'web' | 'expo' | 'flutter';
  prompt?: string;
  attachments?: any[];
  template?: string;
  features?: string[];
}

interface ParallelAppCreationResult {
  app: any;
  chatId: number;
  taskId: string;
  readyForChat: boolean; // True when chat can start immediately
}

// Task status tracking
// Use the proper background task manager
const taskManager = getBackgroundTaskManager();

/**
 * 🔧 Generate a unique app name by appending numbers
 * Checks both filesystem and database to ensure uniqueness
 */
async function generateUniqueAppName(baseName: string, appType: 'web' | 'mobile' | 'godot' = 'web'): Promise<string> {
  // Helper to check if a name is available (both filesystem and database)
  const isNameAvailable = async (name: string): Promise<boolean> => {
    // Check filesystem
    const testRelPath = getAppRelativePath(name, appType);
    const testFullPath = getDyadAppPath(testRelPath);
    if (fs.existsSync(testFullPath)) {
      return false;
    }
    
    // Check database
    const existingApp = await db.query.apps.findFirst({
      where: eq(apps.name, name),
    });
    if (existingApp) {
      return false;
    }
    
    return true;
  };
  
  // First check the base name
  if (await isNameAvailable(baseName)) {
    return baseName;
  }
  
  // Try with numbers
  let counter = 2;
  while (counter <= 100) { // Increased limit to handle more duplicates
    const suggestedName = `${baseName}-${counter}`;
    if (await isNameAvailable(suggestedName)) {
      return suggestedName;
    }
    counter++;
  }
  
  // If we can't find a unique name with numbers, add timestamp
  const timestamp = Date.now().toString().slice(-6);
  const timestampName = `${baseName}-${timestamp}`;
  if (await isNameAvailable(timestampName)) {
    return timestampName;
  }
  
  // Last resort: add random suffix
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `${baseName}-${randomSuffix}`;
}

/**
 * 🚀 PARALLEL APP CREATION STRATEGY
 * 
 * Phase 1: INSTANT (0-100ms) - Create minimal DB entries for immediate chat access
 * Phase 2: BACKGROUND (0-60s) - Template creation, Git init in parallel
 * Phase 3: COMPLETION - Finalize and notify
 * 
 * This allows chat to start immediately while heavy operations run in background
 */
export function registerParallelAppCreationHandlers() {
  
  // PHASE 1: Instant App Creation (for immediate chat access)
  ipcMain.handle("create-app-instant", async (_, params: ParallelAppCreationParams): Promise<ParallelAppCreationResult> => {
    const startTime = performance.now();
    const perfId = `create-app-instant-${Date.now()}`;
    startPerf(perfId, "create-app-instant");
    logger.info(`🚀 [INSTANT] Starting instant app creation: ${params.name}`);
    
    try {
      // 1. Quick permission check (5ms)
      const permissionStart = performance.now();
      const settings = readSettings();
      const isProUser = settings.enableApplaaPro === true;
      
      if (!isProUser) {
        const existingApps = db.$client.prepare("SELECT COUNT(*) as count FROM apps").get() as { count: number };
        const FREE_APP_LIMIT = 5;
        
        if (existingApps.count >= FREE_APP_LIMIT) {
          throw new Error(`Free users are limited to ${FREE_APP_LIMIT} apps. Upgrade to Applaa Pro for unlimited apps.`);
        }
      }
      const permissionTime = performance.now() - permissionStart;
      
      // 2. Quick path validation (10ms)
      const pathStart = performance.now();
      await ensureWorkspaceInitialized();
      const appType = (params.appType === 'mobile' || params.appType === 'web' || params.appType === 'godot')
        ? params.appType
        : (params.framework === 'expo' || params.framework === 'flutter')
          ? 'mobile'
          : 'web';
      
      // Check if app name already exists (filesystem or database)
      let finalAppName = params.name;
      let appRelPath = getAppRelativePath(
        finalAppName,
        appType === 'godot' ? 'godot' : (appType === 'mobile' ? 'mobile' : 'web')
      );
      let fullAppPath = getDyadAppPath(appRelPath);
      const existingAppInDb = await db.query.apps.findFirst({
        where: eq(apps.name, finalAppName),
      });
      
      // Track if name was changed
      const originalName = params.name;
      
      // If name exists, automatically use a unique name
      if (fs.existsSync(fullAppPath) || existingAppInDb) {
        logger.info(`App name "${params.name}" already exists, generating unique name...`);
        finalAppName = await generateUniqueAppName(params.name, appType);
        logger.info(`Using unique app name: "${finalAppName}"`);
        
        // Update params with the new name
        params.name = finalAppName;
        
        // Recalculate paths with the new name
        appRelPath = getAppRelativePath(
          finalAppName,
          appType === 'godot' ? 'godot' : (appType === 'mobile' ? 'mobile' : 'web')
        );
        fullAppPath = getDyadAppPath(appRelPath);
        
        // Verify the new path doesn't exist (shouldn't, but double-check)
        if (fs.existsSync(fullAppPath)) {
          throw new Error(`Generated unique name "${finalAppName}" still conflicts. Please try a different name.`);
        }
      }
      const pathTime = performance.now() - pathStart;
      
      // 3. Create minimal DB entries (20ms)
      const dbStart = performance.now();
      // Update displayName if it matches the original name (so it matches the final name)
      const displayName = (params.displayName === originalName || !params.displayName) 
        ? finalAppName 
        : params.displayName;
      const info = db.$client
        .prepare("INSERT INTO apps (name, path, app_type, status) VALUES (?, ?, ?, ?)")
        .run(finalAppName, appRelPath, appType, 'creating');
      const insertedId = Number(info.lastInsertRowid);
      
      // 4. Create chat immediately (30ms)
      const [chat] = await db
        .insert(chats)
        .values({
          appId: insertedId,
        })
        .returning();
      const dbTime = performance.now() - dbStart;
      
      // 5. Get app data for return
      const row = db.$client
        .prepare(
          "SELECT id, name, path, created_at as createdAt, app_type as appType, status, " +
            "github_org as githubOrg, github_repo as githubRepo, github_branch as githubBranch, " +
            "supabase_project_id as supabaseProjectId, neon_project_id as neonProjectId, " +
            "neon_development_branch_id as neonDevelopmentBranchId, neon_preview_branch_id as neonPreviewBranchId, " +
            "vercel_project_id as vercelProjectId, vercel_project_name as vercelProjectName, vercel_team_id as vercelTeamId, " +
            "vercel_deployment_url as vercelDeploymentUrl, chat_context as chatContext FROM apps WHERE id = ?"
        )
        .get(insertedId) as any;

      // Normalize timestamps
      if (row?.createdAt && typeof row.createdAt === "number") {
        row.createdAt = new Date(row.createdAt * 1000);
      }
      row.displayName = displayName;
      row.packageId = params.packageId;
      row.slug = params.slug;
      
      const taskId = `parallel-app-${insertedId}-${Date.now()}`;
      
      // Initialize task tracking
      // 🚀 PHASE 2: Create and start background task (NON-BLOCKING)
      taskManager.createTask({
        id: taskId,
        type: "app-creation",
        title: `Creating ${params.name}`,
        description: "Setting up app template and dependencies",
        metadata: { appId: insertedId, appName: params.name, framework: params.framework }
      });
      
      // Start the background work immediately
      setImmediate(() => {
        taskManager.startTask(taskId, async (abortController, updateProgress) => {
          return await createAppBackgroundTasks(insertedId, fullAppPath, params, taskId, updateProgress);
        }).catch(error => {
          logger.error(`Background task ${taskId} failed:`, error);
        });
      });
      
      const totalTime = performance.now() - startTime;
      endPerf(perfId, {
        appName: params.name,
        framework: params.framework,
        permissionTime: permissionTime.toFixed(2),
        pathTime: pathTime.toFixed(2),
        dbTime: dbTime.toFixed(2),
        totalTime: totalTime.toFixed(2)
      });
      
      logger.info(`⚡ [INSTANT] App creation completed in ${totalTime.toFixed(2)}ms - Chat ready!`);
      
      return {
        app: row,
        chatId: chat.id,
        taskId,
        readyForChat: true // Chat can start immediately!
      };
      
    } catch (error) {
      endPerf(perfId, { error: error.message });
      logger.error(`❌ [INSTANT] App creation failed:`, error);
      throw error;
    }
  });
  
  // Background task status checker
  ipcMain.handle("get-app-creation-status", async (_, taskId: string) => {
    const task = taskManager.getTask(taskId);
    if (!task) {
      return {
        status: 'completed',
        progress: 100,
        message: 'Task not found - likely completed'
      };
    }
    
    return {
      status: task.status === 'running' ? 'running' : 
             task.status === 'completed' ? 'completed' : 'error',
      progress: task.progress,
      message: task.description || task.title,
      error: task.error,
      appId: task.metadata?.appId
    };
  });
  
  // Clean up completed tasks (optional)
  ipcMain.handle("cleanup-app-creation-task", async (_, taskId: string) => {
    // The BackgroundTaskManager handles cleanup automatically
    return { success: true };
  });
}

/**
 * PHASE 2: Background Template Creation (Parallel, Non-blocking)
 */
async function createAppBackgroundTasks(
  appId: number, 
  fullAppPath: string, 
  params: ParallelAppCreationParams,
  taskId: string,
  updateProgress: (progress: number, message?: string) => void
) {
  const startTime = performance.now();
  const perfId = `create-app-background-${taskId}`;
  startPerf(perfId, "create-app-background");
  logger.info(`🔄 [BACKGROUND] Starting background tasks for app ${appId}`);
  
  try {
    // Update status to 'building'
    db.$client
      .prepare("UPDATE apps SET status = ? WHERE id = ?")
      .run('building', appId);
    
    updateProgress(30, 'Creating app template and initializing git...');
    
    // Parallel execution of heavy operations
    updateProgress(50, 'Creating template files...');
    const templateStart = performance.now();
    const templatePromise = (async () => {
      if (params.appType === 'godot') {
        // For Godot apps, create the project structure
        await createGodotProjectFiles(fullAppPath, params);
      } else {
        await createTemplateFiles(fullAppPath, params.framework, params);
        // ✅ Template files copied without modification - no healing needed
        // Original Dyad approach: templates are pristine and don't need healing
        logger.info('✅ Template files copied without modification - preserving original Dyad approach');
      }
    })();
    
    updateProgress(60, 'Initializing git repository...');
    const gitStart = performance.now();
    const gitPromise = initializeGitRepository(fullAppPath);
    
    // 🚀 OPTIMIZATION: Install dependencies immediately after template copy (skip for Godot)
    const dependencyStart = performance.now();
    const dependencyPromise = params.appType === 'godot' 
      ? Promise.resolve() // Godot doesn't need npm dependencies
      : installDependenciesForNewApp(fullAppPath, appId, params.framework);
    
    if (params.appType !== 'godot') {
      updateProgress(70, 'Installing dependencies...');
    }
    
    // 🚀 PARALLEL PREBUILD: Start prebuild process for instant previews (Expo only)
    if (params.framework === 'expo') {
      updateProgress(75, 'Starting parallel prebuild for instant previews...');
      // Import and call the prebuild function directly (we're in main process)
      const { performParallelPrebuild } = await import('./parallel_prebuild_system');
      // Start prebuild in parallel (non-blocking)
      performParallelPrebuild(appId, fullAppPath).catch(error => {
        logger.warn(`⚠️ Parallel prebuild failed for app ${appId}:`, error);
      });
    }
    
    // Wait for all three to complete in parallel
    updateProgress(80, 'Finalizing setup...');
    await Promise.all([templatePromise, gitPromise, dependencyPromise]);
    
    const templateTime = performance.now() - templateStart;
    const gitTime = performance.now() - gitStart;
    
    // Update status to 'ready'
    db.$client
      .prepare("UPDATE apps SET status = ? WHERE id = ?")
      .run('ready', appId);
    
    const totalTime = performance.now() - startTime;
    
    endPerf(perfId, {
      appId,
      templateTime: templateTime.toFixed(2),
      gitTime: gitTime.toFixed(2),
      totalTime: totalTime.toFixed(2),
      framework: params.framework
    });
    
    logger.info(`✅ [BACKGROUND] Background tasks completed in ${totalTime.toFixed(2)}ms for app ${appId}`);
    
    // Auto-generate icons and UI designs based on app prompt
    try {
      updateProgress(95, "Generating app icons and UI designs...");
      const { IpcClient } = await import("../ipc_client");
      const ipcClient = IpcClient.getInstance();
      
      // Get the app to retrieve the original prompt
      const app = await db.query.apps.findFirst({
        where: eq(apps.id, appId),
      });
      
      if (app && app.prompt) {
        logger.info(`🎨 Auto-generating assets for app: ${app.name}`);
        await ipcClient.autoGenerateAppAssets(app.prompt, appId);
        logger.info(`✅ Auto-generated assets for app ${appId}`);
      }
    } catch (error) {
      logger.warn(`⚠️ Auto-asset generation failed for app ${appId}:`, error);
      // Don't fail the entire app creation if asset generation fails
    }
    
    // Notify completion with final progress
    updateProgress(100, `App creation completed! Template: ${templateTime.toFixed(0)}ms, Git: ${gitTime.toFixed(0)}ms`);
    
  } catch (error) {
    logger.error(`❌ [BACKGROUND] Background tasks failed for app ${appId}:`, error);
    
    endPerf(perfId, { error: error.message, appId });
    
    // Update status to 'error'
    db.$client
      .prepare("UPDATE apps SET status = ? WHERE id = ?")
      .run('error', appId);
    
    // Notify frontend of error
    // The BackgroundTaskManager will automatically handle the error state
    throw error; // Re-throw so the task manager marks it as failed
  }
}

/**
 * Create Godot project files
 */
async function createGodotProjectFiles(
  fullAppPath: string,
  params: ParallelAppCreationParams
) {
  // Create the project structure directly
  const projectPath = path.join(fullAppPath, 'godot-project');
  fs.mkdirSync(projectPath, { recursive: true });
  fs.mkdirSync(path.join(projectPath, 'scenes'), { recursive: true });
  fs.mkdirSync(path.join(projectPath, 'scripts'), { recursive: true });
  fs.mkdirSync(path.join(projectPath, 'assets'), { recursive: true });
  fs.mkdirSync(path.join(projectPath, 'assets', 'sprites'), { recursive: true });
  fs.mkdirSync(path.join(projectPath, 'assets', 'sounds'), { recursive: true });
  fs.mkdirSync(path.join(projectPath, 'assets', 'music'), { recursive: true });
  
  // Create basic project.godot
  const projectGodot = `; Engine configuration file.
config_version=5

[application]

config/name="${params.name}"
run/main_scene="res://scenes/Main.tscn"
config/features=PackedStringArray("4.2", "Forward Plus")
config/icon="res://icon.svg"

[display]

window/size/viewport_width=1152
window/size/viewport_height=648
window/size/resizable=true

[rendering]

renderer/rendering_method="forward_plus"
`;
  
  fs.writeFileSync(path.join(projectPath, 'project.godot'), projectGodot);
  
  // Create empty game spec
  fs.writeFileSync(
    path.join(projectPath, 'game_spec.json'),
    JSON.stringify({}, null, 2)
  );
  
  // Automatically create a web export for preview
  try {
    const { createTestWebExport, exportWithGodotEngine } = await import('./godot_handlers');
    const exportPath = path.join(fullAppPath, 'godot-web-export');
    
    // Try to export using Godot engine first
    const exportedWithEngine = await exportWithGodotEngine(projectPath, exportPath, params.name);
    
    // Fall back to test export if Godot engine export failed
    if (!exportedWithEngine) {
      logger.info('Creating test web export (Godot engine not available or export failed)');
      await createTestWebExport(exportPath, null, params.name);
    }
    
    logger.info(`✅ Automatically created web export for preview`);
  } catch (exportError) {
    logger.warn('⚠️ Failed to auto-create web export:', exportError);
    // Don't fail project creation if export fails
  }
  
  logger.info(`✅ Godot project structure created at ${projectPath}`);
}

/**
 * Optimized template creation with parallel file operations
 */
async function createTemplateFiles(fullAppPath: string, framework: string, params: ParallelAppCreationParams) {
  const templateStartTime = performance.now();
  
  if (framework === 'expo') {
    // 🚀 PERFORMANCE: Use template-based creation instead of CLI
    logger.info(`📋 [TEMPLATE] Using fast template-based Expo creation`);
    await ExpoTemplateCreator.createExpoApp({
      fullAppPath,
      appName: params.name,
      displayName: params.displayName || params.name,
      packageId: params.packageId || `com.applaa.${params.name.replace(/-/g, "")}`,
      slug: params.slug || params.name,
      template: 'base-router', // Use cleaned base-router template without problematic packages
      features: [] // No features to avoid problematic dependencies
    });
  } else {
    // Use createFromTemplate for web apps (template-based)
    await createFromTemplate({ fullAppPath });
  }
  
  const templateTime = performance.now() - templateStartTime;
  logger.info(`📋 [TEMPLATE] Template creation took ${templateTime.toFixed(2)}ms`);
}

/**
 * Optimized Git initialization
 */
async function initializeGitRepository(fullAppPath: string) {
  const gitStartTime = performance.now();
  
  // Initialize Git repository
  await git.init({
    fs: fs,
    dir: fullAppPath,
    defaultBranch: "main",
  });
  
  // Add all files
  await git.add({
    fs: fs,
    dir: fullAppPath,
    filepath: ".",
  });
  
  // Create initial commit
  await gitCommit({
    fs,
    dir: fullAppPath,
    message: "Initial commit - Applaa app created",
    author: {
      name: "Applaa",
      email: "applaa@applaa.com",
    },
  });
  
  const gitTime = performance.now() - gitStartTime;
  logger.info(`🔧 [GIT] Git operations took ${gitTime.toFixed(2)}ms`);
}

/**
 * 🚀 OPTIMIZATION: Install dependencies for new apps immediately after template copy
 * This runs in parallel with git initialization to save time
 */
async function installDependenciesForNewApp(fullAppPath: string, appId: number, framework: string) {
  const dependencyStartTime = performance.now();
  logger.info(`📦 [DEPENDENCIES] Starting unified dependency installation for new app ${appId}`);
  
  try {
    const installSuccess = await unifiedInstallDependencies(fullAppPath, appId, 'new-app-creation');
    
    const dependencyTime = performance.now() - dependencyStartTime;
    logger.info(`📦 [DEPENDENCIES] Installation ${installSuccess ? 'completed' : 'failed'} for new app ${appId} in ${dependencyTime.toFixed(2)}ms`);
    
  } catch (error) {
    logger.error(`❌ [DEPENDENCIES] Unified dependency installation failed for new app ${appId}:`, error);
    // Don't throw - allow app creation to continue
  }
}

/**
 * Fix common invalid package versions that cause ETARGET errors
 * 🚀 ENHANCED: Ensure workspace compatibility and remove problematic packages
 */
async function fixPackageJsonVersions(packageJsonPath: string, appId: number): Promise<void> {
  try {
    const packageContent = fs.readFileSync(packageJsonPath, 'utf8');
    let packageJson = JSON.parse(packageContent);
    let needsFixing = false;

    // 🚀 ENHANCED: Remove problematic packages that cause bundling issues
    const problematicPackages = [
      "onnxruntime-react-native",
      "onnxruntime-web", 
      "jimp-compact",
      "jimp",
      "react-native-transformers"
    ];

    // Remove problematic packages
    for (const pkg of problematicPackages) {
      if (packageJson.dependencies && packageJson.dependencies[pkg]) {
        delete packageJson.dependencies[pkg];
        needsFixing = true;
        logger.info(`🗑️ [DEPENDENCIES] Removed problematic package: ${pkg} for new app ${appId}`);
      }
      if (packageJson.devDependencies && packageJson.devDependencies[pkg]) {
        delete packageJson.devDependencies[pkg];
        needsFixing = true;
        logger.info(`🗑️ [DEPENDENCIES] Removed problematic dev package: ${pkg} for new app ${appId}`);
      }
    }

    // 🚀 WORKSPACE COMPATIBILITY: Ensure versions match our template
    const workspaceCompatibleVersions = {
      "expo": "~53.0.0",
      "expo-router": "~4.0.0", 
      "react": "19.1.0",
      "react-native": "0.79.4",
      "react-dom": "19.1.0",
      "@types/react": "~19.0.0",
      "@types/react-dom": "~19.0.0",
      "@types/react-native": "^0.79.0",
      "typescript": "~5.3.3"
    };

    // Update to workspace-compatible versions
    for (const [pkg, version] of Object.entries(workspaceCompatibleVersions)) {
      if (packageJson.dependencies && packageJson.dependencies[pkg]) {
        if (packageJson.dependencies[pkg] !== version) {
          packageJson.dependencies[pkg] = version;
          needsFixing = true;
          logger.info(`🔧 [DEPENDENCIES] Updated ${pkg} to workspace-compatible version: ${version} for new app ${appId}`);
        }
      }
      if (packageJson.devDependencies && packageJson.devDependencies[pkg]) {
        if (packageJson.devDependencies[pkg] !== version) {
          packageJson.devDependencies[pkg] = version;
          needsFixing = true;
          logger.info(`🔧 [DEPENDENCIES] Updated dev ${pkg} to workspace-compatible version: ${version} for new app ${appId}`);
        }
      }
    }

    // 🚀 WORKSPACE COMPATIBILITY: Add workspace configuration
    if (!packageJson.workspaces) {
      packageJson.workspaces = false; // Prevent this app from being treated as a workspace root
      needsFixing = true;
      logger.info(`🔧 [DEPENDENCIES] Added workspaces: false for new app ${appId}`);
    }

    // Write back the fixed package.json
    if (needsFixing) {
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8');
      logger.info(`✅ [DEPENDENCIES] package.json fixed for new app ${appId}`);
    }
  } catch (error) {
    logger.warn(`⚠️ [DEPENDENCIES] Could not fix package.json for new app ${appId}:`, error);
  }
}

// Notification functions removed - BackgroundTaskManager handles status updates automatically
