import { ipcMain } from "electron";
import * as fs from "node:fs";
import * as path from "node:path";
import log from "electron-log";
import { db } from "../../db";
import { apps } from "../../db/schema";
import { eq } from "drizzle-orm";
import { getDyadAppPath } from "../../paths/paths";
import { readSettings } from "../../main/settings";
import { generateGameSpecification } from "../../godot/game_spec_generator";
import { buildGodotGameFromSpec } from "../../godot/godot_builder";

const logger = log.scope("godot_handlers");

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

        await buildGodotGameFromSpec(appPath, params.spec);

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

        // For now, we'll create a placeholder export
        // In a full implementation, this would use Godot's headless export
        fs.mkdirSync(exportPath, { recursive: true });

        // Create a simple HTML file that will load the Godot Web export
        const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <title>${app.name}</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: #1e1e1e;
        }
        #canvas {
            display: block;
        }
    </style>
</head>
<body>
    <canvas id="canvas"></canvas>
    <script>
        // Godot Web export will be loaded here
        // This is a placeholder - actual implementation requires Godot export templates
        console.log('Godot game export placeholder');
    </script>
</body>
</html>`;

        fs.writeFileSync(path.join(exportPath, "index.html"), htmlContent);

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
}

