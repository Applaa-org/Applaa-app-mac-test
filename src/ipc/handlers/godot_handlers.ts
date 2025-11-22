import { ipcMain } from "electron";
import * as fs from "node:fs";
import * as path from "node:path";
import * as http from "node:http";
import * as url from "node:url";
import log from "electron-log";
import { db } from "../../db";
import { apps } from "../../db/schema";
import { eq } from "drizzle-orm";
import { getDyadAppPath } from "../../paths/paths";
import { readSettings } from "../../main/settings";
import { generateGameSpecification } from "../../godot/game_spec_generator";
import { buildGodotGameFromSpec } from "../../godot/godot_builder";
import { generateGodotProject } from "../../godot/godot_project_generator";
import { exportGodotToHTML5, isExportUpToDate } from "../../godot/godot_exporter";
import type { GameSpecification } from "../../godot/game_spec_schema";
import { findAvailablePort } from "../utils/port_utils";
import { execAsync, commandExists } from "../utils/runShellCommand";
import { createLoggedHandler } from "./safe_handle";

const logger = log.scope("godot_handlers");
const handle = createLoggedHandler(logger);

// Track running HTTP servers for Godot exports
const godotServers = new Map<number, { server: http.Server; port: number; exportPath: string }>();

/**
 * Detect if Godot engine is installed on the system
 */
async function detectGodotEngine(): Promise<{ installed: boolean; path?: string; version?: string }> {
  // Try common Godot command names
  const godotCommands = ['godot', 'godot4', 'godot-headless', 'godot4-headless'];
  
  for (const cmd of godotCommands) {
    try {
      const exists = await commandExists(cmd);
      if (exists) {
        // Try to get version
        try {
          const result = await execAsync(`${cmd} --version`, { timeout: 5000 });
          const version = result.stdout?.trim() || 'unknown';
          logger.info(`Godot engine detected: ${cmd}, version: ${version}`);
          return { installed: true, path: cmd, version };
        } catch {
          return { installed: true, path: cmd };
        }
      }
    } catch {
      continue;
    }
  }
  
  // Also check common installation paths
  const commonPaths: string[] = [];
  if (process.platform === 'win32') {
    commonPaths.push(
      'C:\\Program Files\\Godot\\Godot_v4.x.x_win64.exe',
      'C:\\Program Files (x86)\\Godot\\Godot_v4.x.x_win64.exe',
      path.join(process.env.USERPROFILE || '', 'AppData', 'Local', 'Programs', 'Godot', 'Godot.exe')
    );
  } else if (process.platform === 'darwin') {
    commonPaths.push(
      '/Applications/Godot.app/Contents/MacOS/Godot',
      path.join(process.env.HOME || '', 'Applications', 'Godot.app', 'Contents', 'MacOS', 'Godot')
    );
  } else {
    commonPaths.push(
      '/usr/bin/godot',
      '/usr/local/bin/godot',
      path.join(process.env.HOME || '', '.local', 'bin', 'godot')
    );
  }
  
  for (const godotPath of commonPaths) {
    if (fs.existsSync(godotPath)) {
      logger.info(`Godot engine found at: ${godotPath}`);
      return { installed: true, path: godotPath };
    }
  }
  
  return { installed: false };
}

/**
 * Export Godot project to web using Godot engine (if available)
 */
export async function exportWithGodotEngine(
  projectPath: string,
  exportPath: string,
  projectName: string
): Promise<boolean> {
  const godot = await detectGodotEngine();
  
  if (!godot.installed || !godot.path) {
    logger.info('Godot engine not found, will use test export');
    return false;
  }
  
  try {
    logger.info(`Attempting to export Godot project using engine at: ${godot.path}`);
    
    // Create export preset configuration
    // For now, we'll use headless export with web preset
    // Note: This requires export templates to be installed
    const exportCommand = process.platform === 'win32'
      ? `"${godot.path}" --headless --export-release "Web" "${exportPath}" --path "${projectPath}"`
      : `"${godot.path}" --headless --export-release "Web" "${exportPath}" --path "${projectPath}"`;
    
    logger.info(`Running export command: ${exportCommand}`);
    const result = await execAsync(exportCommand, { 
      timeout: 60000, // 60 second timeout
      cwd: projectPath 
    });
    
    // Check if export was successful
    const indexHtmlPath = path.join(exportPath, 'index.html');
    if (fs.existsSync(indexHtmlPath)) {
      logger.info(`✅ Successfully exported Godot project to ${exportPath}`);
      
      // Create vercel.json for Vercel deployment at app root
      try {
        const { createVercelConfig } = await import('../../godot/godot_exporter');
        // Derive appPath from exportPath (exportPath is typically appPath/godot-web-export)
        const appPath = path.dirname(exportPath);
        createVercelConfig(exportPath, appPath);
      } catch (vercelError: any) {
        logger.warn(`Failed to create vercel.json: ${vercelError.message}`);
        // Don't fail the export if vercel.json creation fails
      }
      
      return true;
    } else {
      logger.warn('Godot export command completed but index.html not found');
      return false;
    }
  } catch (error: any) {
    logger.warn(`Failed to export with Godot engine: ${error.message}`);
    logger.info('Falling back to test export');
    return false;
  }
}

/**
 * Creates a simple test web export that can be previewed
 */
export async function createTestWebExport(
  exportPath: string,
  spec: GameSpecification | null,
  gameName: string
): Promise<void> {
  // Ensure directory exists
  if (!fs.existsSync(exportPath)) {
    fs.mkdirSync(exportPath, { recursive: true });
    logger.info(`Created export directory: ${exportPath}`);
  }
  
  // Extract game details from spec if available
  const gameDimension = spec?.game?.type || '2D'; // 2D or 3D
  const gameDescription = spec?.game?.description || '';
  const gameNameFromSpec = spec?.game?.name || gameName;
  
  // Escape game name for use in HTML/JS (use spec name if available)
  const escapedGameName = gameNameFromSpec.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const windowWidth = spec?.settings?.window?.width || 800;
  const windowHeight = spec?.settings?.window?.height || 600;
  
  // Determine game genre/theme from description, name, or spec
  const descriptionLower = (gameDescription + ' ' + gameNameFromSpec + ' ' + gameName).toLowerCase();
  const genre = spec?.game?.genre?.toLowerCase() || '';
  const combinedText = descriptionLower + ' ' + genre;
  
  let gameType = 'platformer'; // default (platformer, maze, pong, shooter, etc.)
  let playerColor = '#4a9eff'; // blue
  let backgroundColor = '#1a1a1a'; // dark
  let platformColor = '#3c3c3c'; // gray
  
  logger.info(`Determining game type from: "${combinedText}"`);
  
  // Detect game type based on keywords
  if (combinedText.includes('maze') || combinedText.includes('labyrinth') || combinedText.includes('explorer')) {
    gameType = 'maze';
    playerColor = '#00ff00'; // green
    backgroundColor = '#0a0a0a'; // very dark
    platformColor = '#333333'; // dark gray walls
  } else if (combinedText.includes('pong') || combinedText.includes('ping') || combinedText.includes('paddle')) {
    gameType = 'pong';
    playerColor = '#ffffff'; // white
    backgroundColor = '#000000'; // black
    platformColor = '#ffffff'; // white
  } else if (combinedText.includes('shooter') || combinedText.includes('shoot') || combinedText.includes('bullet')) {
    gameType = 'shooter';
    playerColor = '#00ffff'; // cyan
    backgroundColor = '#0a0a1a'; // dark blue
    platformColor = '#2a2a4a'; // dark blue-gray
  } else if (combinedText.includes('puzzle') || combinedText.includes('match') || combinedText.includes('tetris') || combinedText.includes('block')) {
    gameType = 'puzzle';
    playerColor = '#ffff00'; // yellow
    backgroundColor = '#1a1a2a'; // dark purple
    platformColor = '#3a3a5a'; // purple-gray
  } else if (combinedText.includes('racing') || combinedText.includes('car') || combinedText.includes('speed') || combinedText.includes('race')) {
    gameType = 'racing';
    playerColor = '#ff8800'; // orange
    backgroundColor = '#1a2a1a'; // dark green tint
    platformColor = '#2a4a2a'; // green-gray
  } else if (combinedText.includes('zombie') || combinedText.includes('survival') || combinedText.includes('horror')) {
    gameType = 'zombie';
    playerColor = '#ff4444'; // red
    backgroundColor = '#2a1a1a'; // dark red tint
    platformColor = '#4a2a2a'; // brown
  } else if (combinedText.includes('space') || combinedText.includes('alien') || combinedText.includes('galaxy') || combinedText.includes('asteroid')) {
    gameType = 'space';
    playerColor = '#00ffff'; // cyan
    backgroundColor = '#0a0a1a'; // dark blue
    platformColor = '#2a2a4a'; // dark blue-gray
  } else if (combinedText.includes('mario') || combinedText.includes('platform') || combinedText.includes('jump')) {
    gameType = 'platformer';
    playerColor = '#ff0000'; // red (Mario-like)
    backgroundColor = '#87ceeb'; // sky blue
    platformColor = '#8b4513'; // brown
  }
  
  // Import dynamic game generator
  const { generateGameCode, generateGameFromSpec } = await import('./godot_test_game_generator');
  
  let gameCode: string;
  let controlsText: string;
  
  // If we have a valid spec with game data, use the spec-based generator
  if (spec && spec.game && spec.player && spec.enemies && spec.levels) {
    logger.info(`Creating game from specification: ${spec.game.name || gameNameFromSpec || gameName}`);
    logger.info(`   Player: ${spec.player.name}, Health: ${spec.player.health}, Speed: ${spec.player.speed}`);
    logger.info(`   Enemies: ${spec.enemies.length}, Levels: ${spec.levels.length}`);
    
    // Use spec-based generator
    gameCode = generateGameFromSpec({
      spec,
      windowWidth,
      windowHeight
    });
    
    // Determine controls based on player abilities
    const abilities = spec.player.abilities || [];
    if (abilities.includes('shoot') && abilities.includes('jump')) {
      controlsText = 'Use ARROW KEYS or A/D to move | W/UP to jump | SPACE to shoot';
    } else if (abilities.includes('shoot')) {
      controlsText = 'Use ARROW KEYS or A/D to move | SPACE to shoot';
    } else if (abilities.includes('jump')) {
      controlsText = 'Use ARROW KEYS or WASD to move | SPACE to jump';
    } else {
      controlsText = 'Use ARROW KEYS or WASD to move';
    }
  } else {
    // Fall back to keyword-based predefined game types
    logger.info(`Creating test export with type: ${gameType} for game: ${gameNameFromSpec || gameName}`);
    logger.info(`   Colors - Player: ${playerColor}, Background: ${backgroundColor}, Platform: ${platformColor}`);
    
    // Generate game code based on type
    gameCode = generateGameCode({
      gameType,
      playerColor,
      backgroundColor,
      platformColor,
      windowWidth,
      windowHeight,
      gameName: gameNameFromSpec || gameName,
      gameDescription: gameDescription || ''
    });
    
    // Determine controls text based on game type
    controlsText = 'Use ARROW KEYS or WASD to move | SPACE to jump';
    if (gameType === 'pong') {
      controlsText = 'Use W/S to move paddle | Click to select (Puzzle)';
    } else if (gameType === 'shooter' || gameType === 'space') {
      controlsText = 'Use ARROW KEYS or A/D to move | SPACE to shoot';
    } else if (gameType === 'maze') {
      controlsText = 'Use ARROW KEYS or WASD to navigate the maze';
    } else if (gameType === 'puzzle') {
      controlsText = 'Click gems to swap and match 3 in a row';
    } else if (gameType === 'racing') {
      controlsText = 'Use LEFT/RIGHT or A/D to steer';
    }
  }
  

  // Create a simple HTML5 canvas game that demonstrates the game concept
  const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <title>${escapedGameName}</title>
    <meta charset="UTF-8">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #1e1e1e 0%, #2d2d30 100%);
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #cccccc;
        }
        #gameContainer {
            text-align: center;
            padding: 20px;
        }
        #gameCanvas {
            border: 2px solid #ff8800;
            border-radius: 8px;
            background: #1a1a1a;
            box-shadow: 0 4px 20px rgba(255, 136, 0, 0.3);
            display: block;
            margin: 20px auto;
        }
        h1 {
            color: #ff8800;
            margin-bottom: 10px;
            font-size: 28px;
        }
        .info {
            color: #999999;
            font-size: 14px;
            margin-bottom: 20px;
        }
        .controls {
            margin-top: 15px;
            color: #cccccc;
            font-size: 13px;
        }
        .score {
            color: #4ade80;
            font-size: 18px;
            font-weight: bold;
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <div id="gameContainer">
        <h1>🎮 ${escapedGameName}</h1>
        <div class="info">${gameDescription ? gameDescription.substring(0, 100) : 'Applaa Game Preview - Test Build'}</div>
        <canvas id="gameCanvas" width="${windowWidth}" height="${windowHeight}"></canvas>
        <div class="score">Score: <span id="score">0</span></div>
        <div class="controls">
            ${controlsText}
        </div>
        <div id="status" style="margin-top: 10px; color: #4ade80; font-size: 12px;">Game loaded successfully!</div>
    </div>
    <script>
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        const scoreElement = document.getElementById('score');
        
        // Game state
        let score = 0;
        const canvasWidth = ${windowWidth};
        const canvasHeight = ${windowHeight};
        
        ${gameCode}
        
        console.log('🎮 Applaa game preview loaded successfully! Type: ${gameType}');
    </script>
</body>
</html>`;

  const indexHtmlPath = path.join(exportPath, "index.html");
  fs.writeFileSync(indexHtmlPath, htmlContent);
  
  // Verify file was created
  if (!fs.existsSync(indexHtmlPath)) {
    throw new Error(`Failed to create index.html at ${indexHtmlPath}`);
  }
  
  // Create vercel.json for Vercel deployment at app root
  try {
    const { createVercelConfig } = await import('../../godot/godot_exporter');
    // Derive appPath from exportPath (exportPath is typically appPath/godot-web-export)
    const appPath = path.dirname(exportPath);
    createVercelConfig(exportPath, appPath);
  } catch (vercelError: any) {
    logger.warn(`Failed to create vercel.json for test export: ${vercelError.message}`);
    // Don't fail the export if vercel.json creation fails
  }
  
  logger.info(`✅ Created test web export at ${exportPath}`);
  
  // Log file size for debugging
  const stats = fs.statSync(indexHtmlPath);
  logger.info(`Test export file size: ${stats.size} bytes`);
}

export interface GameSpecification {
  game: {
    name: string;
    description: string;
    genre: string;
    version: string;
  };
  player: {
    name: string;
    type: "character" | "vehicle" | "spaceship" | "custom";
    sprite?: string;
    health: number;
    speed: number;
    abilities?: string[];
  };
  enemies: Array<{
    name: string;
    type: string;
    health: number;
    speed: number;
    damage: number;
    sprite?: string;
    behavior: "patrol" | "chase" | "shoot" | "custom";
  }>;
  levels: Array<{
    name: string;
    background: string;
    obstacles?: Array<{
      type: string;
      position: { x: number; y: number };
    }>;
    spawnPoints?: Array<{ x: number; y: number }>;
  }>;
  assets: {
    sprites?: Array<{ name: string; path: string; type: string }>;
    sounds?: Array<{ name: string; path: string; type: string }>;
    music?: Array<{ name: string; path: string }>;
  };
  logic: {
    winCondition: string;
    loseCondition: string;
    scoring?: {
      pointsPerKill?: number;
      pointsPerLevel?: number;
    };
  };
}

export function registerGodotHandlers() {
  logger.info("Registering Godot IPC handlers...");
  
  // Generate Game Specification JSON from user prompt
  handle(
    "godot:generate-game-spec",
    async (
      _,
      params: { prompt: string; appId: number }
    ): Promise<GameSpecification> => {
      try {
        logger.info(`Generating game specification for app ${params.appId}`);
        const settings = readSettings();
        const spec = await generateGameSpecification(params.prompt, settings);
        return spec;
      } catch (error) {
        logger.error("Failed to generate game specification:", error);
        throw error;
      }
    }
  );

  // Build Godot game from specification
  handle(
    "godot:build-from-spec",
    async (
      _,
      params: { appId: number; spec: GameSpecification }
    ): Promise<{ success: boolean; message: string }> => {
      try {
        const app = await db.query.apps.findFirst({
          where: eq(apps.id, params.appId),
        });

        if (!app) {
          throw new Error(`App ${params.appId} not found`);
        }

        const appPath = getDyadAppPath(app.path);
        logger.info(`Building Godot game from spec at ${appPath}`);

        // Use the enhanced project generator
        await generateGodotProject({
          appPath,
          spec: params.spec,
          regenerateAssets: false,
        });

        // Automatically create a web export for preview
        try {
          const exportPath = path.join(appPath, "godot-web-export");
          const projectPath = path.join(appPath, "godot-project");
          
          // Try to export using Godot engine first
          const exportResult = await exportGodotToHTML5({
            projectPath,
            exportPath,
            projectName: app.name,
            debug: false,
            appPath, // Pass appPath so vercel.json is created at root
          });
          
          // Fall back to test export if Godot engine export failed
          if (!exportResult.success) {
            logger.info('Creating test web export (Godot engine not available or export failed)');
            try {
              await createTestWebExport(exportPath, params.spec, app.name);
              logger.info(`✅ Test web export created successfully`);
            } catch (testExportError: any) {
              logger.error("Failed to create test web export:", testExportError);
              // Log but don't fail - the export will be created on next preview attempt
            }
          } else {
            logger.info(`✅ Godot engine export successful`);
          }
          
          logger.info(`Automatically created web export for preview at ${exportPath}`);
        } catch (exportError: any) {
          logger.error("Failed to auto-create web export:", exportError);
          // Log the error but don't fail the build - export can be retried later
          logger.warn(`Export will be retried when preview is opened. Error: ${exportError?.message || String(exportError)}`);
        }

        return {
          success: true,
          message: "Applaa game built successfully from specification",
        };
      } catch (error) {
        logger.error("Failed to build Godot game:", error);
        throw error;
      }
    }
  );

  // Create Godot project structure
  handle(
    "godot:create-project",
    async (
      _,
      params: { appId: number; projectName: string }
    ): Promise<{ success: boolean; projectPath: string }> => {
      try {
        const app = await db.query.apps.findFirst({
          where: eq(apps.id, params.appId),
        });

        if (!app) {
          throw new Error(`App ${params.appId} not found`);
        }

        const appPath = getDyadAppPath(app.path);
        const projectPath = path.join(appPath, "godot-project");

        // Create basic Godot project structure
        fs.mkdirSync(projectPath, { recursive: true });
        fs.mkdirSync(path.join(projectPath, "scenes"), { recursive: true });
        fs.mkdirSync(path.join(projectPath, "scripts"), { recursive: true });
        fs.mkdirSync(path.join(projectPath, "assets"), { recursive: true });
        fs.mkdirSync(path.join(projectPath, "assets", "sprites"), {
          recursive: true,
        });
        fs.mkdirSync(path.join(projectPath, "assets", "sounds"), {
          recursive: true,
        });
        fs.mkdirSync(path.join(projectPath, "assets", "music"), {
          recursive: true,
        });

        // Create project.godot file
        const projectGodot = `; Engine configuration file.
; It's best edited using the editor UI and not directly,
; since the parameters that go here are not all obvious.
;
; Format:
;   [section] ; section goes between []
;   param=value ; assign values to parameters

config_version=5

[application]

config/name="${params.projectName}"
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

        fs.writeFileSync(
          path.join(projectPath, "project.godot"),
          projectGodot
        );

        // Create game specification file
        const gameSpecPath = path.join(projectPath, "game_spec.json");
        fs.writeFileSync(gameSpecPath, JSON.stringify({}, null, 2));

        // Automatically create a test web export for preview
        try {
          const exportPath = path.join(appPath, "godot-web-export");
          await createTestWebExport(exportPath, null, params.projectName);
          logger.info(`Automatically created test web export for preview`);
        } catch (exportError) {
          logger.warn("Failed to auto-create web export:", exportError);
          // Don't fail project creation if export fails
        }

        logger.info(`Created Godot project at ${projectPath}`);

        return {
          success: true,
          projectPath,
        };
      } catch (error) {
        logger.error("Failed to create Godot project:", error);
        throw error;
      }
    }
  );

  // Export Godot project to web
  handle(
    "godot:export-web",
    async (
      _,
      params: { appId: number }
    ): Promise<{ success: boolean; exportPath?: string; error?: string }> => {
      try {
        const app = await db.query.apps.findFirst({
          where: eq(apps.id, params.appId),
        });

        if (!app) {
          throw new Error(`App ${params.appId} not found`);
        }

        const appPath = getDyadAppPath(app.path);
        const projectPath = path.join(appPath, "godot-project");
        const exportPath = path.join(appPath, "godot-web-export");

        // Check if project.godot exists
        if (!fs.existsSync(path.join(projectPath, "project.godot"))) {
          throw new Error("Godot project not found. Please create a project first.");
        }

        // Try to export using Godot engine first
        const exportedWithEngine = await exportWithGodotEngine(projectPath, exportPath, app.name);
        
        // Fall back to test export if Godot engine export failed
        if (!exportedWithEngine) {
          logger.info('Creating test web export (Godot engine not available or export failed)');
          await createTestWebExport(exportPath, null, app.name);
        }

        logger.info(`Exported Godot project to ${exportPath}`);

        return {
          success: true,
          exportPath,
        };
      } catch (error) {
        logger.error("Failed to export Godot project:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }
  );

  // Check if Godot engine is installed
  handle(
    "godot:check-engine",
    async (): Promise<{ installed: boolean; path?: string; version?: string }> => {
      return await detectGodotEngine();
    }
  );

  // Get Godot project status
  handle(
    "godot:get-project-status",
    async (
      _,
      params: { appId: number }
    ): Promise<{
      hasProject: boolean;
      hasSpec: boolean;
      isBuilding: boolean;
      projectPath?: string;
      specPath?: string;
    }> => {
      try {
        const app = await db.query.apps.findFirst({
          where: eq(apps.id, params.appId),
        });

        if (!app) {
          throw new Error(`App ${params.appId} not found`);
        }

        const appPath = getDyadAppPath(app.path);
        const projectPath = path.join(appPath, "godot-project");
        const specPath = path.join(projectPath, "game_spec.json");

        const hasProject = fs.existsSync(
          path.join(projectPath, "project.godot")
        );
        const hasSpec = fs.existsSync(specPath);
        
        // Check if app is still being built (status is 'building')
        // Even if project.godot exists, if status is 'building', the game is not complete yet
        const appStatus = (app as any).status;
        const isBuilding = appStatus === 'building' || appStatus === 'creating';

        return {
          hasProject,
          hasSpec,
          isBuilding,
          projectPath: hasProject ? projectPath : undefined,
          specPath: hasSpec ? specPath : undefined,
        };
      } catch (error) {
        logger.error("Failed to get Godot project status:", error);
        throw error;
      }
    }
  );

  // Start HTTP server for Godot export
  async function startGodotServer(appId: number, exportPath: string): Promise<number> {
    // Check if server already running for this app
    const existing = godotServers.get(appId);
    if (existing) {
      // Verify the server is still running and serving the same path
      if (existing.exportPath === exportPath) {
        logger.info(`Godot server already running for app ${appId} on port ${existing.port}`);
        return existing.port;
      } else {
        // Stop old server if path changed
        existing.server.close();
        godotServers.delete(appId);
      }
    }

    // Find available port (try ports 9000-9100)
    const port = await findAvailablePort(9000, 9100);
    
    // Create HTTP server to serve static files
    const server = http.createServer((req, res) => {
      // Handle OPTIONS for CORS
      if (req.method === 'OPTIONS') {
        res.writeHead(200, {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        });
        res.end();
        return;
      }
      
      if (!req.url) {
        res.writeHead(400);
        res.end('Bad Request');
        return;
      }

      // Parse URL
      const parsedUrl = url.parse(req.url);
      let filePath = parsedUrl.pathname || '/';
      
      logger.debug(`Godot server request: ${req.method} ${filePath}`);
      
      // Default to index.html
      if (filePath === '/') {
        filePath = '/index.html';
      }

      // Remove leading slash and resolve path
      const fullPath = path.join(exportPath, filePath.replace(/^\//, ''));
      
      // Security check: ensure path is within export directory
      const resolvedPath = path.resolve(fullPath);
      const resolvedExportPath = path.resolve(exportPath);
      if (!resolvedPath.startsWith(resolvedExportPath)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }

      // Check if file exists
      if (!fs.existsSync(resolvedPath)) {
        res.writeHead(404);
        res.end('Not Found');
        return;
      }

      // Get file stats
      const stats = fs.statSync(resolvedPath);
      if (stats.isDirectory()) {
        // Redirect to index.html in directory
        const indexPath = path.join(resolvedPath, 'index.html');
        if (fs.existsSync(indexPath)) {
          res.writeHead(302, { Location: path.join(filePath, 'index.html') });
          res.end();
          return;
        }
        res.writeHead(404);
        res.end('Not Found');
        return;
      }

      // Read and serve file
      try {
        const content = fs.readFileSync(resolvedPath);
        const ext = path.extname(resolvedPath).toLowerCase();
        
        // Simple MIME type detection
        const mimeTypes: Record<string, string> = {
          '.html': 'text/html; charset=utf-8',
          '.htm': 'text/html; charset=utf-8',
          '.js': 'application/javascript; charset=utf-8',
          '.css': 'text/css; charset=utf-8',
          '.json': 'application/json; charset=utf-8',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.gif': 'image/gif',
          '.svg': 'image/svg+xml',
          '.ico': 'image/x-icon',
          '.woff': 'font/woff',
          '.woff2': 'font/woff2',
          '.ttf': 'font/ttf',
          '.wasm': 'application/wasm',
        };
        
        const contentType = mimeTypes[ext] || 'application/octet-stream';
        
        // Add CORS headers for iframe loading
        const headers: Record<string, string> = {
          'Content-Type': contentType,
          'Content-Length': content.length.toString(),
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        };
        
        res.writeHead(200, headers);
        res.end(content);
        
        logger.debug(`Served file: ${filePath} (${content.length} bytes, ${contentType})`);
      } catch (error) {
        logger.error(`Error serving file ${resolvedPath}:`, error);
        res.writeHead(500);
        res.end('Internal Server Error');
      }
    });

    // Start server
    return new Promise((resolve, reject) => {
      server.listen(port, '127.0.0.1', () => {
        logger.info(`Started Godot HTTP server for app ${appId} on port ${port}, serving ${exportPath}`);
        godotServers.set(appId, { server, port, exportPath });
        resolve(port);
      });

      server.on('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'EADDRINUSE') {
          logger.error(`Port ${port} is already in use`);
          reject(new Error(`Port ${port} is already in use`));
        } else {
          logger.error(`Failed to start Godot server:`, error);
          reject(error);
        }
      });
    });
  }

  // Stop HTTP server for Godot export
  handle(
    "godot:stop-server",
    async (_, params: { appId: number }): Promise<void> => {
      const serverInfo = godotServers.get(params.appId);
      if (serverInfo) {
        serverInfo.server.close();
        godotServers.delete(params.appId);
        logger.info(`Stopped Godot HTTP server for app ${params.appId}`);
      }
    }
  );

  // Get Godot web export URL for preview
  handle(
    "godot:get-web-export-url",
    async (
      _,
      params: { appId: number }
    ): Promise<{ hasExport: boolean; exportUrl?: string; exportPath?: string; error?: string; errorDetails?: any }> => {
      try {
        const app = await db.query.apps.findFirst({
          where: eq(apps.id, params.appId),
        });

        if (!app) {
          throw new Error(`App ${params.appId} not found`);
        }

        const appPath = getDyadAppPath(app.path);
        const exportPath = path.join(appPath, "godot-web-export");
        const indexHtmlPath = path.join(exportPath, "index.html");

        // Check if export exists, if not try to create it
        let hasExport = fs.existsSync(indexHtmlPath);
        
        // Also check if the export directory exists and has any HTML files
        if (!hasExport && fs.existsSync(exportPath)) {
          const files = fs.readdirSync(exportPath);
          hasExport = files.some(file => file.endsWith('.html') || file === 'index.html');
          if (hasExport && !fs.existsSync(indexHtmlPath)) {
            // If there's an HTML file but not index.html, log it
            logger.info(`Found HTML file in export but not index.html: ${files.find(f => f.endsWith('.html'))}`);
          }
        }
        
        if (!hasExport) {
          // Try to automatically create export if project exists
          const projectPath = path.join(appPath, "godot-project");
          const projectGodotPath = path.join(projectPath, "project.godot");
          const specPath = path.join(projectPath, "game_spec.json");
          
          if (fs.existsSync(projectGodotPath)) {
            logger.info(`Export not found for app ${params.appId}, creating export automatically...`);
            try {
              // Always try to create export if it doesn't exist
              // Try to export using Godot engine first
              const exportResult = await exportGodotToHTML5({
                projectPath,
                exportPath,
                projectName: app.name,
                debug: false,
                appPath, // Pass appPath so vercel.json is created at root
              });
              
              // Fall back to test export if Godot engine export failed
              if (!exportResult.success) {
                logger.info('Creating test web export (Godot engine not available or export failed)');
                let spec: GameSpecification | null = null;
                if (fs.existsSync(specPath)) {
                  try {
                    spec = JSON.parse(fs.readFileSync(specPath, "utf-8"));
                  } catch {
                    spec = null;
                  }
                }
                try {
                  await createTestWebExport(exportPath, spec, app.name);
                  logger.info(`✅ Test web export created successfully`);
                } catch (testExportError: any) {
                  const errorMsg = testExportError?.message || String(testExportError);
                  logger.error("Failed to create test web export:", testExportError);
                  return {
                    hasExport: false,
                    error: `Failed to create test export: ${errorMsg}. Original export error: ${exportResult.error || "Unknown"}`,
                    errorDetails: {
                      exportPath,
                      projectPath,
                      exportResultError: exportResult.error,
                      exportResultDetails: exportResult.errorDetails,
                      testExportError: errorMsg,
                      stack: testExportError?.stack,
                    },
                  };
                }
              }
              
              // Re-check after creating
              hasExport = fs.existsSync(indexHtmlPath);
              if (!hasExport && fs.existsSync(exportPath)) {
                // Check for any HTML file
                const files = fs.readdirSync(exportPath);
                hasExport = files.some(file => file.endsWith('.html'));
              }
              
              if (hasExport) {
                logger.info(`✅ Successfully created export for app ${params.appId}`);
              } else {
                const errorMsg = `Export creation completed but index.html still not found. Check export path: ${exportPath}`;
                logger.warn(`⚠️ ${errorMsg}`);
                return {
                  hasExport: false,
                  error: errorMsg,
                  errorDetails: {
                    exportPath,
                    projectPath,
                    filesInExport: fs.existsSync(exportPath) ? fs.readdirSync(exportPath) : [],
                  },
                };
              }
            } catch (exportError: any) {
              const errorMsg = exportError?.message || String(exportError);
              logger.error("Failed to auto-create export:", exportError);
              return {
                hasExport: false,
                error: `Failed to create export: ${errorMsg}`,
                errorDetails: {
                  exportPath,
                  projectPath,
                  originalError: errorMsg,
                  stack: exportError?.stack,
                },
              };
            }
          }
        } else {
          logger.info(`✅ Export found for app ${params.appId} at ${indexHtmlPath}`);
        }

        if (!hasExport) {
          // Check if export directory exists but is empty or has wrong files
          if (fs.existsSync(exportPath)) {
            const files = fs.readdirSync(exportPath);
            const diagnosticInfo = {
              exportPath,
              filesInExport: files,
              projectPath: path.join(appPath, "godot-project"),
              projectExists: fs.existsSync(path.join(appPath, "godot-project", "project.godot")),
              specExists: fs.existsSync(path.join(appPath, "godot-project", "game_spec.json")),
            };
            
            return {
              hasExport: false,
              error: `Export directory exists but index.html not found. Found files: ${files.join(", ") || "none"}. The export may have failed or the project needs to be rebuilt.`,
              errorDetails: diagnosticInfo,
            };
          }
          
          // Check if project exists
          const projectPath = path.join(appPath, "godot-project");
          const projectExists = fs.existsSync(path.join(projectPath, "project.godot"));
          const specExists = fs.existsSync(path.join(projectPath, "game_spec.json"));
          
          let errorMessage = "No export found.";
          if (!projectExists) {
            errorMessage += " The Godot project has not been created yet. Please build the game first.";
          } else if (!specExists) {
            errorMessage += " The game specification file is missing. The project may be incomplete.";
          } else {
            errorMessage += " The game project exists but export has not been created. Try clicking 'Create/Refresh Export' button.";
          }
          
          return {
            hasExport: false,
            error: errorMessage,
            errorDetails: {
              exportPath,
              projectPath,
              projectExists,
              specExists,
              suggestion: projectExists && specExists 
                ? "Click 'Create/Refresh Export' to generate the export"
                : "The game project needs to be built first. Check if there were errors during game creation.",
            },
          };
        }

        // Start HTTP server to serve the export
        try {
          const port = await startGodotServer(params.appId, exportPath);
          const exportUrl = `http://127.0.0.1:${port}/`;

          logger.info(`Godot web export found at ${exportPath}, serving on ${exportUrl}`);

          return {
            hasExport: true,
            exportUrl,
            exportPath,
          };
        } catch (serverError: any) {
          const errorMsg = serverError?.message || String(serverError);
          logger.error("Failed to start Godot HTTP server:", serverError);
          return {
            hasExport: true, // Export exists but server failed
            error: `Failed to start preview server: ${errorMsg}`,
            errorDetails: {
              exportPath,
              serverError: errorMsg,
              stack: serverError?.stack,
            },
          };
        }
      } catch (error: any) {
        const errorMsg = error?.message || String(error);
        logger.error("Failed to get Godot web export URL:", error);
        return {
          hasExport: false,
          error: `Failed to get export URL: ${errorMsg}`,
          errorDetails: {
            originalError: errorMsg,
            stack: error?.stack,
          },
        };
      }
    }
  );
  
  logger.info("✅ Godot IPC handlers registered successfully");
}

