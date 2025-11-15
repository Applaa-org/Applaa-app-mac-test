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

const logger = log.scope("godot_handlers");

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
  
  // Escape game name for use in HTML/JS
  const escapedGameName = gameName.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

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
        <div class="info">Godot Game Preview - Test Build</div>
        <canvas id="gameCanvas" width="800" height="600"></canvas>
        <div class="score">Score: <span id="score">0</span></div>
        <div class="controls">
            Use ARROW KEYS or WASD to move | SPACE to jump
        </div>
        <div id="status" style="margin-top: 10px; color: #4ade80; font-size: 12px;">Game loaded successfully!</div>
    </div>
    <script>
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        const scoreElement = document.getElementById('score');
        
        // Game state
        let score = 0;
        let player = {
            x: 100,
            y: 300,
            width: 40,
            height: 40,
            velocityX: 0,
            velocityY: 0,
            speed: 5,
            jumpPower: -12,
            onGround: false,
            color: '#4a9eff'
        };
        
        let platforms = [
            { x: 0, y: 550, width: 200, height: 50, color: '#3c3c3c' },
            { x: 250, y: 500, width: 150, height: 50, color: '#3c3c3c' },
            { x: 450, y: 450, width: 150, height: 50, color: '#3c3c3c' },
            { x: 650, y: 400, width: 150, height: 50, color: '#3c3c3c' },
            { x: 0, y: 550, width: 800, height: 50, color: '#2d2d30' } // Ground
        ];
        
        let collectibles = [
            { x: 300, y: 450, radius: 15, collected: false, color: '#ff8800' },
            { x: 500, y: 400, radius: 15, collected: false, color: '#ff8800' },
            { x: 700, y: 350, radius: 15, collected: false, color: '#ff8800' }
        ];
        
        let keys = {};
        const gravity = 0.6;
        const friction = 0.8;
        
        // Input handling
        document.addEventListener('keydown', (e) => {
            keys[e.key.toLowerCase()] = true;
            if ((e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') && player.onGround) {
                player.velocityY = player.jumpPower;
                player.onGround = false;
            }
        });
        
        document.addEventListener('keyup', (e) => {
            keys[e.key.toLowerCase()] = false;
        });
        
        // Collision detection
        function checkCollision(rect1, rect2) {
            return rect1.x < rect2.x + rect2.width &&
                   rect1.x + rect1.width > rect2.x &&
                   rect1.y < rect2.y + rect2.height &&
                   rect1.y + rect1.height > rect2.y;
        }
        
        function checkPointCollision(point, circle) {
            const dx = point.x - circle.x;
            const dy = point.y - circle.y;
            return dx * dx + dy * dy < circle.radius * circle.radius;
        }
        
        // Update game state
        function update() {
            // Handle horizontal movement
            if (keys['arrowleft'] || keys['a']) {
                player.velocityX = -player.speed;
            } else if (keys['arrowright'] || keys['d']) {
                player.velocityX = player.speed;
            } else {
                player.velocityX *= friction;
            }
            
            // Apply gravity
            player.velocityY += gravity;
            
            // Update position
            player.x += player.velocityX;
            player.y += player.velocityY;
            
            // Check platform collisions
            player.onGround = false;
            for (let platform of platforms) {
                if (checkCollision(player, platform)) {
                    // Landing on top
                    if (player.velocityY > 0 && player.y < platform.y) {
                        player.y = platform.y - player.height;
                        player.velocityY = 0;
                        player.onGround = true;
                    }
                    // Hitting from sides
                    else if (player.velocityX > 0) {
                        player.x = platform.x - player.width;
                    } else if (player.velocityX < 0) {
                        player.x = platform.x + platform.width;
                    }
                }
            }
            
            // Boundary checks
            if (player.x < 0) player.x = 0;
            if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
            if (player.y > canvas.height) {
                player.y = 300;
                player.x = 100;
                player.velocityY = 0;
            }
            
            // Check collectible collisions
            collectibles.forEach((collectible, index) => {
                if (!collectible.collected) {
                    const playerCenter = {
                        x: player.x + player.width / 2,
                        y: player.y + player.height / 2
                    };
                    if (checkPointCollision(playerCenter, collectible)) {
                        collectible.collected = true;
                        score += 100;
                        scoreElement.textContent = score;
                    }
                }
            });
        }
        
        // Render game
        function render() {
            // Clear canvas
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw platforms
            platforms.forEach(platform => {
                ctx.fillStyle = platform.color;
                ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
                ctx.strokeStyle = '#4a4a4a';
                ctx.lineWidth = 2;
                ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
            });
            
            // Draw collectibles
            collectibles.forEach(collectible => {
                if (!collectible.collected) {
                    ctx.fillStyle = collectible.color;
                    ctx.beginPath();
                    ctx.arc(collectible.x, collectible.y, collectible.radius, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = '#ffaa00';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }
            });
            
            // Draw player
            ctx.fillStyle = player.color;
            ctx.fillRect(player.x, player.y, player.width, player.height);
            ctx.strokeStyle = '#6bb6ff';
            ctx.lineWidth = 2;
            ctx.strokeRect(player.x, player.y, player.width, player.height);
            
            // Draw eyes
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(player.x + 10, player.y + 10, 8, 8);
            ctx.fillRect(player.x + 22, player.y + 10, 8, 8);
        }
        
        // Game loop
        function gameLoop() {
            update();
            render();
            requestAnimationFrame(gameLoop);
        }
        
        // Start game
        gameLoop();
        
        console.log('🎮 Godot game preview loaded successfully!');
    </script>
</body>
</html>`;

  const indexHtmlPath = path.join(exportPath, "index.html");
  fs.writeFileSync(indexHtmlPath, htmlContent);
  
  // Verify file was created
  if (!fs.existsSync(indexHtmlPath)) {
    throw new Error(`Failed to create index.html at ${indexHtmlPath}`);
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
  // Generate Game Specification JSON from user prompt
  ipcMain.handle(
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
  ipcMain.handle(
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
          message: "Godot game built successfully from specification",
        };
      } catch (error) {
        logger.error("Failed to build Godot game:", error);
        throw error;
      }
    }
  );

  // Create Godot project structure
  ipcMain.handle(
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
  ipcMain.handle(
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
  ipcMain.handle(
    "godot:check-engine",
    async (): Promise<{ installed: boolean; path?: string; version?: string }> => {
      return await detectGodotEngine();
    }
  );

  // Get Godot project status
  ipcMain.handle(
    "godot:get-project-status",
    async (
      _,
      params: { appId: number }
    ): Promise<{
      hasProject: boolean;
      hasSpec: boolean;
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

        return {
          hasProject,
          hasSpec,
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
  ipcMain.handle(
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
  ipcMain.handle(
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
}

