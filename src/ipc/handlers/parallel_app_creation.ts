import { ipcMain } from "electron";
import { db } from "../../db";
import { apps, chats } from "../../db/schema";
import { eq } from "drizzle-orm";
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
// import { healAppCode } from "../utils/code_healer"; // Module removed in new implementation
import { execAsync } from "../utils/runShellCommand";
import * as path from 'path';
import { unifiedInstallDependencies } from "./unified_dependency_manager";
import { getSupabaseAuth } from "../../lib/supabase";
import { readSettings } from "../../main/settings";
import { createRobloxProjectTemplate } from "./roblox_template_creator";

const logger = log.scope("parallel_app_creation");

interface ParallelAppCreationParams {
  name: string;
  displayName?: string;
  packageId?: string;
  slug?: string;
  appType: 'web' | 'mobile' | 'godot' | 'minecraft' | 'blockly' | 'arcade' | 'microbit' | 'roblox' | 'python';
  framework: 'web' | 'expo' | 'flutter' | 'minecraft-makecode' | 'blockly' | 'makecode-arcade' | 'microbit' | 'roblox-lua' | 'python';
  prompt?: string;
  attachments?: any[];
  template?: string;
  features?: string[];
  templateId?: string;
  initialPrompt?: string;
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

async function ensureAuthLimitForAppCreation(): Promise<void> {
  console.log('🔍 [ensureAuthLimitForAppCreation] Starting app creation permission check...');

  // Check tier-based app limits first (use async version to get latest tier)
  const { canCreateAppAsync } = await import("../utils/feature_checks");
  const appLimitCheck = await canCreateAppAsync();

  console.log('🔍 [ensureAuthLimitForAppCreation] App limit check result:', appLimitCheck);

  if (!appLimitCheck.allowed) {
    console.log('❌ [ensureAuthLimitForAppCreation] App creation blocked:', appLimitCheck.reason);
    throw new Error(appLimitCheck.reason || "APP_LIMIT_REACHED");
  }

  console.log('✅ [ensureAuthLimitForAppCreation] Tier-based check passed');

  // Legacy auth check (keep for backwards compatibility)
  const FREE_UNAUTH_LIMIT = 3;
  const { count } = db.$client.prepare("SELECT COUNT(*) as count FROM apps").get() as { count: number };

  console.log('🔍 [ensureAuthLimitForAppCreation] Legacy auth check:', {
    existingApps: count,
    unauthLimit: FREE_UNAUTH_LIMIT
  });

  // Check both Supabase and WordPress authentication
  let isAuthenticated = false;

  // Check Supabase authentication
  try {
    const auth = getSupabaseAuth();
    const session = await auth.getCurrentSession();
    isAuthenticated = !!session;
    console.log('🔍 [ensureAuthLimitForAppCreation] Supabase auth check:', { isAuthenticated, hasSession: !!session });
  } catch (error) {
    // Supabase auth not available, continue to check WordPress
    console.log('⚠️ [ensureAuthLimitForAppCreation] Supabase auth check failed:', error);
    logger.debug("Supabase auth check failed, checking WordPress auth...");
  }

  // Check WordPress authentication if Supabase auth failed
  if (!isAuthenticated) {
    try {
      const settings = readSettings();
      const wordpressAuth = settings.wordpressAuth;
      isAuthenticated = !!(wordpressAuth?.isAuthenticated && wordpressAuth?.user?.username);
      console.log('🔍 [ensureAuthLimitForAppCreation] WordPress auth check:', {
        isAuthenticated,
        hasWordPressAuth: !!wordpressAuth?.isAuthenticated
      });
      if (isAuthenticated) {
        logger.debug("WordPress authentication found for app creation");
      }
    } catch (error) {
      console.log(' [ensureAuthLimitForAppCreation] WordPress auth check failed:', error);
      logger.debug("WordPress auth check failed:", error);
    }
  }

  // If still not authenticated and at limit, throw error
  if (!isAuthenticated && count >= FREE_UNAUTH_LIMIT) {
    console.log(' [ensureAuthLimitForAppCreation] Unauthenticated user at limit');
    throw new Error("AUTH_REQUIRED_APP_LIMIT");
  }

  console.log('✅ [ensureAuthLimitForAppCreation] All checks passed, app creation allowed');
}

/**
 * 🔧 Generate a unique app name by appending numbers
 * Checks both filesystem and database to ensure uniqueness
 */
async function generateUniqueAppName(baseName: string, appType: 'web' | 'mobile' | 'godot' | 'minecraft' | 'blockly' | 'arcade' | 'microbit' | 'roblox' | 'python' = 'web'): Promise<string> {
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
      // 1. Quick permission check (auth-gated app creation)
      const permissionStart = performance.now();
      await ensureAuthLimitForAppCreation();
      const permissionTime = performance.now() - permissionStart;

      // 2. Quick path validation (10ms)
      const pathStart = performance.now();
      await ensureWorkspaceInitialized();
      const appType = (params.appType === 'mobile' || params.appType === 'web' || params.appType === 'godot' ||
        params.appType === 'minecraft' || params.appType === 'blockly' ||
        params.appType === 'arcade' || params.appType === 'microbit' || params.appType === 'roblox' || params.appType === 'python')
        ? params.appType
        : (params.framework === 'expo' || params.framework === 'flutter')
          ? 'mobile'
          : params.framework === 'minecraft-makecode' ? 'minecraft'
            : params.framework === 'blockly' ? 'blockly'
              : params.framework === 'makecode-arcade' ? 'arcade'
                : params.framework === 'microbit' ? 'microbit'
                  : params.framework === 'python' ? 'python'
                    : 'web';

      // Check if app name already exists (filesystem or database)
      let finalAppName = params.name;
      let appRelPath = getAppRelativePath(
        finalAppName,
        appType === 'godot' ? 'godot' :
          appType === 'mobile' ? 'mobile' :
            appType === 'minecraft' ? 'minecraft' :
              appType === 'blockly' ? 'blockly' :
                appType === 'arcade' ? 'arcade' :
                  appType === 'microbit' ? 'microbit' :
                    appType === 'roblox' ? 'roblox' :
                      appType === 'python' ? 'python' : 'web'
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
          appType === 'godot' ? 'godot' :
            appType === 'mobile' ? 'mobile' :
              appType === 'minecraft' ? 'minecraft' :
                appType === 'blockly' ? 'blockly' :
                  appType === 'arcade' ? 'arcade' :
                    appType === 'microbit' ? 'microbit' :
                      appType === 'roblox' ? 'roblox' :
                        appType === 'python' ? 'python' : 'web'
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

      // 🔍 DEBUG: Log the appType being saved
      logger.info(`📝 Creating app with appType: "${appType}" (from params.appType: "${params.appType}", params.framework: "${params.framework}")`);

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
      } else if (params.appType === 'minecraft' || params.framework === 'minecraft-makecode') {
        // For Minecraft mods, copy the starter template
        await createMinecraftModTemplate(fullAppPath, params);
      } else if (params.appType === 'roblox' || params.framework === 'roblox-lua') {
        // For Roblox games, create Lua project structure
        await createRobloxProjectTemplate(fullAppPath, params);
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

      if (app && (app as any).prompt) {
        logger.info(`🎨 Auto-generating assets for app: ${app.name}`);
        await ipcClient.autoGenerateAppAssets((app as any).prompt, appId);
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

  // Try to generate game spec from prompt if provided
  let gameSpec: any = null;
  const userPrompt = params.prompt || params.initialPrompt; // Support both parameter names
  if (userPrompt && userPrompt.trim()) {
    try {
      logger.info(`Generating game spec from prompt: ${userPrompt.substring(0, 100)}...`);
      const { generateGameSpecification } = await import('../../godot/game_spec_generator');
      const { readSettings } = await import('../../main/settings');
      const settings = readSettings();
      gameSpec = await generateGameSpecification(userPrompt, settings);
      logger.info(`✅ Generated game spec: ${gameSpec.game?.name || 'Unknown'}`);
      logger.info(`   Description: ${gameSpec.game?.description || 'N/A'}`);
      logger.info(`   Type: ${gameSpec.game?.type || 'N/A'}`);
    } catch (specError: any) {
      logger.warn('Failed to generate game spec from prompt (likely API Key issue), using default:', specError?.message || specError);

      // Attempt to notify the user via the chat (if possible) or just log it prominently
      // We can't easily push to chat here as we don't have the webContents, but we can update the app status or name
      // For now, we'll append a warning to the description if we write one

      // Still continue with null spec to ensure *something* is created, but log error
    }
  } else {
    logger.info('No prompt provided, will use default test game');
  }

  // Save game spec (or empty if generation failed)
  const specToSave = gameSpec || {
    error: "Failed to generate game spec",
    note: "Please check your API Key settings. The AI could not generate the game structure.",
    default: true
  };

  fs.writeFileSync(
    path.join(projectPath, 'game_spec.json'),
    JSON.stringify(specToSave, null, 2)
  );

  // If we have a valid spec, build the actual Godot project from it
  if (gameSpec && gameSpec.game) {
    try {
      logger.info('Building Godot project from generated spec...');
      const { generateGodotProject } = await import('../../godot/godot_project_generator');

      // Convert the spec format if needed
      // game_spec_generator may return old format (player, enemies, levels)
      // project generator expects new format (scenes, scripts)
      let projectSpec: any = gameSpec;

      // Check if spec uses old format (has player/enemies/levels but no scenes)
      if ((gameSpec.player || gameSpec.enemies || gameSpec.levels) && !gameSpec.scenes) {
        logger.info('Converting spec from old format to new format...');
        const gameType = gameSpec.game?.type || '2D';
        const rootType = gameType === '3D' ? 'Node3D' : 'Node2D';

        // Build nodes array from player, enemies, and levels
        const nodes: any[] = [];

        // Add player node
        if (gameSpec.player) {
          const playerNode: any = {
            name: gameSpec.player.name || 'Player',
            type: gameType === '3D' ? 'CharacterBody3D' : 'CharacterBody2D',
            position: { x: 100, y: 300, z: 0 },
            children: []
          };

          // Add sprite for 2D or mesh for 3D
          if (gameType === '2D') {
            playerNode.children = [
              {
                name: 'Sprite2D',
                type: 'Sprite2D',
                position: { x: 0, y: 0 },
                properties: {
                  texture: gameSpec.player.sprite || ''
                }
              }
            ];
          } else {
            playerNode.children = [
              {
                name: 'MeshInstance3D',
                type: 'MeshInstance3D',
                position: { x: 0, y: 0, z: 0 },
                properties: {
                  mesh: 'res://assets/models/player.gltf'
                }
              }
            ];
          }

          nodes.push(playerNode);
        }

        // Add camera
        nodes.push({
          name: 'Camera',
          type: gameType === '3D' ? 'Camera3D' : 'Camera2D',
          position: { x: 0, y: 0, z: 5 },
          properties: gameType === '3D' ? { fov: 75 } : {}
        });

        // Add enemies as children
        if (gameSpec.enemies && Array.isArray(gameSpec.enemies)) {
          gameSpec.enemies.forEach((enemy: any, index: number) => {
            const enemyNode: any = {
              name: enemy.name || `Enemy${index}`,
              type: gameType === '3D' ? 'CharacterBody3D' : 'CharacterBody2D',
              position: { x: 300 + index * 100, y: 300, z: 0 },
              children: []
            };

            if (gameType === '2D') {
              enemyNode.children = [
                {
                  name: 'Sprite2D',
                  type: 'Sprite2D',
                  position: { x: 0, y: 0 },
                  properties: {
                    texture: enemy.sprite || ''
                  }
                }
              ];
            }

            nodes.push(enemyNode);
          });
        }

        // Convert to new format
        projectSpec = {
          game: gameSpec.game,
          settings: gameSpec.settings || {
            window: { width: 1280, height: 720, resizable: true },
            physics: { enabled: true, gravity: { x: 0, y: 980 } },
            rendering: {}
          },
          scenes: [
            {
              name: 'Main',
              type: gameType,
              path: 'res://scenes/Main.tscn',
              nodes: [
                {
                  name: 'Root',
                  type: rootType,
                  position: { x: 0, y: 0, z: 0 },
                  children: nodes
                }
              ],
              camera: {
                type: gameType === '3D' ? 'Camera3D' : 'Camera2D',
                position: { x: 0, y: 0, z: gameType === '3D' ? 5 : 0 }
              }
            }
          ],
          scripts: gameSpec.scripts || [],
          assets: gameSpec.assets || {}
        };
      } else if (!projectSpec.scenes || projectSpec.scenes.length === 0) {
        // If spec doesn't have scenes, create a basic one
        logger.info('Spec missing scenes, creating basic scene structure...');
        projectSpec = {
          ...projectSpec,
          scenes: [
            {
              name: 'Main',
              type: projectSpec.game?.type || '2D',
              path: 'res://scenes/Main.tscn',
              nodes: [
                {
                  name: 'Root',
                  type: projectSpec.game?.type === '3D' ? 'Node3D' : 'Node2D',
                  position: { x: 0, y: 0, z: 0 },
                  children: []
                }
              ],
              camera: {
                type: projectSpec.game?.type === '3D' ? 'Camera3D' : 'Camera2D',
                position: { x: 0, y: 0, z: 0 }
              }
            }
          ],
          scripts: projectSpec.scripts || [],
          assets: projectSpec.assets || {}
        };
      }

      // Ensure settings exist
      if (!projectSpec.settings) {
        projectSpec.settings = {
          window: { width: 1280, height: 720, resizable: true },
          physics: { enabled: true, gravity: { x: 0, y: 980 } },
          rendering: {}
        };
      }

      await generateGodotProject({
        appPath: fullAppPath,
        spec: projectSpec,
        regenerateAssets: false
      });

      logger.info('✅ Godot project built from spec successfully');
    } catch (buildError: any) {
      logger.warn('Failed to build Godot project from spec, will use basic structure:', buildError?.message || buildError);
      // Continue with basic project structure
    }
  }

  // Automatically create a web export for preview
  try {
    const { createTestWebExport, exportWithGodotEngine } = await import('./godot_handlers');
    const exportPath = path.join(fullAppPath, 'godot-web-export');

    // Try to export using Godot engine first
    const exportedWithEngine = await exportWithGodotEngine(projectPath, exportPath, params.name);

    // Fall back to test export if Godot engine export failed
    if (!exportedWithEngine) {
      logger.info('Creating test web export (Godot engine not available or export failed)');
      // Use the generated spec to customize the test export
      await createTestWebExport(exportPath, gameSpec, params.name);
    }

    logger.info(`✅ Automatically created web export for preview`);
  } catch (exportError) {
    logger.warn('⚠️ Failed to auto-create web export:', exportError);
    // Don't fail project creation if export fails
  }

  logger.info(`✅ Godot project structure created at ${projectPath}`);
}

/**
 * Create Minecraft Mod template files (Blockly-based)
 */
async function createMinecraftModTemplate(
  fullAppPath: string,
  params: ParallelAppCreationParams
) {
  logger.info(`⛏️ Creating Minecraft Bedrock template at ${fullAppPath}`);

  // Create the app directory
  fs.mkdirSync(fullAppPath, { recursive: true });

  // Create behavior pack structure
  const bpPath = path.join(fullAppPath, 'behavior_pack');
  const functionsPath = path.join(bpPath, 'functions');
  fs.mkdirSync(functionsPath, { recursive: true });

  // 1. Generate Manifest
  const manifest = {
    format_version: 2,
    header: {
      name: params.displayName || params.name,
      description: "Created with Applaa Builder",
      uuid: require('crypto').randomUUID(),
      version: [1, 0, 0],
      min_engine_version: [1, 20, 0]
    },
    modules: [
      {
        type: "data",
        uuid: require('crypto').randomUUID(),
        version: [1, 0, 0]
      }
    ]
  };

  fs.writeFileSync(
    path.join(bpPath, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );

  // 2. Check if we should use a pre-built template
  let mcFunctionCode: string;
  let previewBounds = { width: 40, height: 40, depth: 40 };
  let cameraPosition = { x: 25, y: 20, z: 25 };

  // Check if templateId is provided (for pre-built templates)
  const templateId = (params as any).templateId;

  if (templateId) {
    logger.info(`📋 Using pre-built template: ${templateId}`);

    try {
      // Import template loader (dynamic to avoid circular dependencies)
      const templateLoaderPath = path.join(__dirname, '../../services/minecraft/template-loader');
      const { loadTemplate } = require(templateLoaderPath);

      const template = loadTemplate(templateId);

      if (template) {
        mcFunctionCode = template.mcfunctionCode;

        // Use template-specific preview bounds and camera
        if (template.metadata.previewBounds) {
          previewBounds = template.metadata.previewBounds;
        }
        if (template.metadata.camera) {
          cameraPosition = template.metadata.camera;
        }

        logger.info(`✅ Loaded template "${template.metadata.name}"`);
      } else {
        logger.warn(`⚠️ Template "${templateId}" not found, using default`);
        mcFunctionCode = getDefaultMcFunction(params);
      }
    } catch (error) {
      logger.error(`❌ Error loading template "${templateId}":`, error);
      mcFunctionCode = getDefaultMcFunction(params);
    }
  } else {
    // No template - use default empty function for LLM generation
    logger.info(`🤖 No template specified, creating empty template for LLM generation`);
    mcFunctionCode = getDefaultMcFunction(params);
  }

  // Write the mcfunction file
  fs.writeFileSync(
    path.join(functionsPath, 'main.mcfunction'),
    mcFunctionCode
  );

  // 3. Generate Preview Contract
  const previewContract = {
    type: "structure",
    entry: "main",
    bounds: previewBounds,
    anchor: { x: 0, y: 0, z: 0 },
    camera: cameraPosition
  };

  fs.writeFileSync(
    path.join(fullAppPath, 'applaa.preview.json'),
    JSON.stringify(previewContract, null, 2)
  );

  // 4. Create README
  const readmeContent = `# ${params.displayName || params.name}

A Minecraft Bedrock Behavior Pack created with Applaa.

## How to Use

1. **Chat with AI**: Ask it to "Build a house" or "Create a zombie arena".
2. **Preview**: See 3D previews of structures instantly.
3. **Export**: Download the .mcaddon to install in Minecraft.

## Structure
- \`behavior_pack/\`: Contains the actual add-on files.
- \`applaa.preview.json\`: Configures the 3D previewer.
`;

  fs.writeFileSync(path.join(fullAppPath, 'README.md'), readmeContent);

  logger.info(`✅ Minecraft Bedrock template created at ${fullAppPath}`);
}

// createRobloxProjectTemplate moved to ./roblox_template_creator.ts

// Helper function to get default mcfunction content
function getDefaultMcFunction(params: ParallelAppCreationParams): string {
  return `# ${params.displayName || params.name}
# Welcome to your Bedrock Behavior Pack!
# The AI will add your commands here.

say Hello from Applaa!
`;
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
    path: fullAppPath,
    message: "Initial commit - Applaa app created",
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
      "expo": "~54.0.0",
      "expo-router": "~4.0.0",
      "react": "18.3.1",
      "react-native": "0.81.0",
      "react-dom": "18.3.1",
      "@types/react": "~18.3.0",
      "@types/react-dom": "~18.3.0",
      "@types/react-native": "^0.81.0",
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
