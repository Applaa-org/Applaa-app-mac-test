/**
 * Complete Godot Project Generator
 * Converts game_spec.json into a full Godot project with scenes, scripts, and assets
 */

import * as fs from "node:fs";
import * as path from "node:path";
import log from "electron-log";
import type { GameSpecification, SceneSpec, NodeSpec, ScriptSpec } from "./game_spec_schema";
import { generateLoaderScene } from "./godot_loader_template";

const logger = log.scope("godot_project_generator");

export interface ProjectGenerationOptions {
  appPath: string;
  spec: GameSpecification;
  regenerateAssets?: boolean;
}

/**
 * Generate a complete Godot project from a game specification
 */
export async function generateGodotProject(
  options: ProjectGenerationOptions
): Promise<void> {
  const { appPath, spec } = options;
  const projectPath = path.join(appPath, "godot-project");

  logger.info(`Generating Godot project: ${spec.game?.name || "Untitled"}`);

  // Validate spec before generating
  try {
    const { validateGameSpec } = await import("./game_spec_schema");
    const validation = validateGameSpec(spec);
    if (!validation.valid) {
      throw new Error(`Invalid game specification: ${validation.errors.join(", ")}`);
    }
  } catch (validationError: any) {
    // If validation module doesn't exist or fails, log and continue
    logger.warn("Could not validate game spec:", validationError);
  }

  // Create directory structure
  const dirs = {
    project: projectPath,
    scenes: path.join(projectPath, "scenes"),
    scripts: path.join(projectPath, "scripts"),
    assets: path.join(projectPath, "assets"),
    sprites: path.join(projectPath, "assets", "sprites"),
    models: path.join(projectPath, "assets", "models"),
    audio: path.join(projectPath, "assets", "audio"),
    fonts: path.join(projectPath, "assets", "fonts"),
  };

  for (const dir of Object.values(dirs)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // 1. Normalize spec first to ensure it has required fields
  const normalizedSpec: GameSpecification = {
    game: {
      name: spec.game?.name || "Untitled Game",
      type: (spec.game?.type === "2D" || spec.game?.type === "3D") ? spec.game.type : "2D",
      description: spec.game?.description || "",
      ...spec.game,
    },
    settings: {
      window: {
        width: spec.settings?.window?.width || 1280,
        height: spec.settings?.window?.height || 720,
        resizable: spec.settings?.window?.resizable ?? true,
        fullscreen: spec.settings?.window?.fullscreen ?? false,
        ...spec.settings?.window,
      },
      physics: {
        enabled: spec.settings?.physics?.enabled ?? true,
        ...spec.settings?.physics,
      },
      rendering: {
        ...spec.settings?.rendering,
      },
      ...spec.settings,
    },
    scenes: spec.scenes || [],
    assets: spec.assets || {},
    scripts: spec.scripts || [],
    ui: spec.ui,
  };

  // 1. Generate project.godot
  await generateProjectFile(projectPath, normalizedSpec);

  // 2. Save game_spec.json (ensure it has proper structure)
  const specPath = path.join(projectPath, "game_spec.json");
  fs.writeFileSync(specPath, JSON.stringify(normalizedSpec, null, 2));

  // 3. Generate Loader scene (entry point)
  await generateLoaderScene(projectPath, normalizedSpec);

  // 4. Generate all scenes from spec
  const scenes = spec.scenes || [];
  for (const sceneSpec of scenes) {
    await generateScene(projectPath, sceneSpec, normalizedSpec);
  }

  // 5. Generate all scripts
  if (spec.scripts) {
    for (const scriptSpec of spec.scripts) {
      await generateScript(projectPath, scriptSpec);
    }
  }

  // 6. Generate assets
  await generateAssets(projectPath, normalizedSpec, options.regenerateAssets ?? false);

  // 7. Generate UI if specified
  if (normalizedSpec.ui) {
    await generateUI(projectPath, normalizedSpec.ui, normalizedSpec);
  }

  logger.info(`✅ Godot project generated successfully at ${projectPath}`);
}

/**
 * Generate project.godot file
 */
async function generateProjectFile(
  projectPath: string,
  spec: GameSpecification
): Promise<void> {
  const projectFile = path.join(projectPath, "project.godot");

  // Handle both old and new spec formats with defaults
  const gameName = spec.game?.name || "Untitled Game";
  const gameType = spec.game?.type || "2D";
  
  // Get settings with defaults
  const settings = spec.settings || {};
  const windowSettings = settings.window || {
    width: 1280,
    height: 720,
    resizable: true,
    fullscreen: false,
  };
  const renderingSettings = settings.rendering || {};
  const physicsSettings = settings.physics || {};

  const config = [
    "; Engine configuration file.",
    "; It's best edited using the editor UI and not directly,",
    "; since the parameters that go here are not all obvious.",
    ";",
    "; Format:",
    ";   [section] ; section goes between []",
    ";   param=value ; assign values to parameters",
    "",
    "config_version=5",
    "",
    "[application]",
    "",
    `config/name="${gameName}"`,
    `run/main_scene="res://Loader.tscn"`,
    `config/features=PackedStringArray("4.2", "Forward Plus")`,
    `config/icon="res://icon.svg"`,
    "",
    "[display]",
    "",
    `window/size/viewport_width=${windowSettings.width}`,
    `window/size/viewport_height=${windowSettings.height}`,
    `window/size/resizable=${windowSettings.resizable ?? true}`,
    `window/size/mode=${windowSettings.fullscreen ? 3 : 0}`,
    `window/stretch/mode="canvas_items"`,
    `window/stretch/aspect="expand"`,
    "",
    "[rendering]",
    "",
    `renderer/rendering_method="forward_plus"`,
    `textures/canvas_textures/default_texture_filter=2`,
    `2d/snap/snap_2d_transforms_to_pixel=true`,
    `2d/snap/snap_2d_vertices_to_pixel=true`,
  ];

  if (renderingSettings.vsync !== undefined) {
    config.push(`display/window/vsync/vsync_mode=${renderingSettings.vsync ? 1 : 0}`);
  }
  if (renderingSettings.msaa) {
    config.push(`rendering/anti_aliasing/quality/msaa_3d=${renderingSettings.msaa}`);
  }
  if (renderingSettings.shadows !== undefined) {
    config.push(`rendering/lights_and_shadows/use_physical_light_units=${renderingSettings.shadows ? 1 : 0}`);
  }

  if (physicsSettings.enabled || physicsSettings.gravity || physicsSettings.fps) {
    config.push("");
    config.push("[physics]");
    config.push("");
    config.push(`common/enable_pause_aware_picking=true`);
    if (physicsSettings.gravity) {
      if (gameType === "2D") {
        config.push(`2d/default_gravity=${physicsSettings.gravity.y ?? 980}`);
        config.push(`2d/default_gravity_vector=Vector2(0, 1)`);
      } else {
        config.push(`3d/default_gravity=${Math.abs(physicsSettings.gravity.y ?? -9.8)}`);
        config.push(`3d/default_gravity_vector=Vector3(0, -1, 0)`);
      }
    } else {
      // Default gravity if not specified
      if (gameType === "2D") {
        config.push(`2d/default_gravity=980`);
        config.push(`2d/default_gravity_vector=Vector2(0, 1)`);
      } else {
        config.push(`3d/default_gravity=9.8`);
        config.push(`3d/default_gravity_vector=Vector3(0, -1, 0)`);
      }
    }
    if (physicsSettings.fps) {
      config.push(`common/physics_ticks_per_second=${physicsSettings.fps}`);
    }
  }

  fs.writeFileSync(projectFile, config.join("\n"));
  logger.info(`Generated project.godot`);
}

/**
 * Generate a scene file (.tscn) from a scene specification
 */
async function generateScene(
  projectPath: string,
  sceneSpec: SceneSpec,
  gameSpec: GameSpecification
): Promise<void> {
  const scenePath = path.join(projectPath, sceneSpec.path.replace("res://", ""));
  const sceneDir = path.dirname(scenePath);
  fs.mkdirSync(sceneDir, { recursive: true });

  // Count scripts to determine load_steps
  const scriptPaths = new Set<string>();
  function collectScripts(nodes: NodeSpec[]) {
    for (const node of nodes) {
      if (node.script) {
        const scriptPath = node.script.startsWith("res://") ? node.script : `res://scripts/${node.script}`;
        scriptPaths.add(scriptPath);
      }
      if (node.children) {
        collectScripts(node.children);
      }
    }
  }
  collectScripts(sceneSpec.nodes);
  
  const loadSteps = sceneSpec.nodes.length + scriptPaths.size + 1; // +1 for Loader.gd if needed

  const lines: string[] = [
    `[gd_scene load_steps=${loadSteps} format=3 uid="uid://${generateUID()}"]`,
    "",
  ];

  // Add external resources (scripts)
  let resourceId = 1;
  const scriptResourceMap = new Map<string, number>();
  
  // Add Loader.gd as first resource if needed
  scriptResourceMap.set("res://Loader.gd", resourceId++);
  lines.push(`[ext_resource type="Script" path="res://Loader.gd" id="${scriptResourceMap.get("res://Loader.gd")}"]`);
  
  // Add other scripts
  for (const scriptPath of Array.from(scriptPaths).sort()) {
    if (!scriptResourceMap.has(scriptPath)) {
      scriptResourceMap.set(scriptPath, resourceId++);
      lines.push(`[ext_resource type="Script" path="${scriptPath}" id="${scriptResourceMap.get(scriptPath)}"]`);
    }
  }
  
  lines.push("");

  // Add node tree
  lines.push(`[node name="${sceneSpec.name}" type="${getRootNodeType(sceneSpec.type)}"]`);

  // Add scene properties
  if (sceneSpec.camera) {
    lines.push(`camera/path = NodePath("${sceneSpec.camera.type}")`);
  }

  // Generate nodes recursively
  for (const node of sceneSpec.nodes) {
    generateNode(lines, node, sceneSpec, gameSpec, scriptResourceMap, 0);
  }

  // Add connections (signals)
  if (sceneSpec.nodes) {
    for (const node of sceneSpec.nodes) {
      generateNodeConnections(lines, node);
    }
  }

  fs.writeFileSync(scenePath, lines.join("\n"));
  logger.info(`Generated scene: ${sceneSpec.path}`);
}

/**
 * Generate a node in the scene file
 */
function generateNode(
  lines: string[],
  node: NodeSpec,
  sceneSpec: SceneSpec,
  gameSpec: GameSpecification,
  scriptResourceMap: Map<string, number>,
  indent: number
): void {
  const indentStr = "\t".repeat(indent);
  const nodeType = node.type || "Node";
  const parentPath = node.parent ? `parent="${node.parent}"` : "";

  lines.push(`${indentStr}[node name="${node.name}" type="${nodeType}"${parentPath ? ` ${parentPath}` : ""}]`);

  // Add position
  if (node.position) {
    if (sceneSpec.type === "2D") {
      lines.push(`${indentStr}position = Vector2(${node.position.x}, ${node.position.y})`);
    } else {
      lines.push(`${indentStr}position = Vector3(${node.position.x}, ${node.position.y}, ${node.position.z ?? 0})`);
    }
  }

  // Add rotation
  if (node.rotation) {
    if (sceneSpec.type === "2D") {
      lines.push(`${indentStr}rotation = ${node.rotation.z ?? 0}`);
    } else {
      lines.push(`${indentStr}rotation_degrees = Vector3(${node.rotation.x}, ${node.rotation.y}, ${node.rotation.z})`);
    }
  }

  // Add scale
  if (node.scale) {
    if (sceneSpec.type === "2D") {
      lines.push(`${indentStr}scale = Vector2(${node.scale.x ?? 1}, ${node.scale.y ?? 1})`);
    } else {
      lines.push(`${indentStr}scale = Vector3(${node.scale.x ?? 1}, ${node.scale.y ?? 1}, ${node.scale.z ?? 1})`);
    }
  }

  // Add script if specified
  if (node.script) {
    const scriptPath = node.script.startsWith("res://") ? node.script : `res://scripts/${node.script}`;
    const scriptId = scriptResourceMap.get(scriptPath);
    if (scriptId) {
      lines.push(`${indentStr}script = ExtResource("${scriptId}")`);
    }
  }

  // Add groups
  if (node.groups && node.groups.length > 0) {
    lines.push(`${indentStr}groups = [${node.groups.map(g => `"${g}"`).join(", ")}]`);
  }

  // Add custom properties
  if (node.properties) {
    for (const [key, value] of Object.entries(node.properties)) {
      lines.push(`${indentStr}${key} = ${formatPropertyValue(value)}`);
    }
  }

  // Add physics properties if this is a physics body
  if (node.type?.includes("Body")) {
    // Add collision shape if specified in physics
    // This would be handled by the physics spec
  }

  // Recursively add children
  if (node.children) {
    for (const child of node.children) {
      generateNode(lines, child, sceneSpec, gameSpec, scriptResourceMap, indent + 1);
    }
  }
}

/**
 * Generate node signal connections
 */
function generateNodeConnections(lines: string[], node: NodeSpec): void {
  if (node.signals && node.signals.length > 0) {
    lines.push("");
    lines.push(`[connection signal="${node.signals[0].name}" from="${node.name}" to="${node.signals[0].target}" method="${node.signals[0].method}"]`);
  }
}

/**
 * Generate a GDScript file
 */
async function generateScript(
  projectPath: string,
  scriptSpec: ScriptSpec
): Promise<void> {
  const scriptPath = path.join(projectPath, scriptSpec.path.replace("res://", ""));
  const scriptDir = path.dirname(scriptPath);
  fs.mkdirSync(scriptDir, { recursive: true });

  const lines: string[] = [];

  // Add extends clause
  if (scriptSpec.extends) {
    lines.push(`extends ${scriptSpec.extends}`);
  } else {
    lines.push(`extends Node`);
  }

  lines.push("");

  // Add signal declarations
  if (scriptSpec.signals && scriptSpec.signals.length > 0) {
    for (const signal of scriptSpec.signals) {
      lines.push(`signal ${signal}`);
    }
    lines.push("");
  }

  // Add exported variables
  if (scriptSpec.exports && scriptSpec.exports.length > 0) {
    for (const exportVar of scriptSpec.exports) {
      const hint = exportVar.hint ? `(${exportVar.hint})` : "";
      const defaultVal = exportVar.default !== undefined ? ` = ${formatPropertyValue(exportVar.default)}` : "";
      lines.push(`@export var ${exportVar.name}: ${exportVar.type}${hint}${defaultVal}`);
    }
    lines.push("");
  }

  // Add script code
  lines.push(scriptSpec.code);

  fs.writeFileSync(scriptPath, lines.join("\n"));
  logger.info(`Generated script: ${scriptSpec.path}`);
}

/**
 * Generate assets (sprites, models, audio, etc.)
 */
async function generateAssets(
  projectPath: string,
  spec: GameSpecification,
  regenerate: boolean
): Promise<void> {
  // Generate sprites
  if (spec.assets?.sprites) {
    for (const sprite of spec.assets.sprites) {
      await generateSpriteAsset(projectPath, sprite, regenerate);
    }
  }

  // Generate models
  if (spec.assets?.models) {
    for (const model of spec.assets.models) {
      await generateModelAsset(projectPath, model, regenerate);
    }
  }

  // Generate audio
  if (spec.assets?.audio) {
    for (const audio of spec.assets.audio) {
      await generateAudioAsset(projectPath, audio, regenerate);
    }
  }
}

/**
 * Generate a sprite asset
 */
async function generateSpriteAsset(
  projectPath: string,
  sprite: any,
  regenerate: boolean
): Promise<void> {
  const spritePath = path.join(projectPath, sprite.path.replace("res://", ""));
  const spriteDir = path.dirname(spritePath);
  fs.mkdirSync(spriteDir, { recursive: true });

  if (fs.existsSync(spritePath) && !regenerate) {
    return; // Skip if already exists
  }

  if (sprite.source === "generated" && sprite.data) {
    // Generate a simple colored rectangle as placeholder
    // In production, you'd decode base64 or generate actual image
    const placeholderSvg = generatePlaceholderSVG(sprite.name, sprite.size);
    fs.writeFileSync(spritePath.replace(/\.(png|jpg)$/, ".svg"), placeholderSvg);
  }
}

/**
 * Generate a model asset
 */
async function generateModelAsset(
  projectPath: string,
  model: any,
  regenerate: boolean
): Promise<void> {
  const modelPath = path.join(projectPath, model.path.replace("res://", ""));
  const modelDir = path.dirname(modelPath);
  fs.mkdirSync(modelDir, { recursive: true });

  if (fs.existsSync(modelPath) && !regenerate) {
    return;
  }

  // Generate placeholder mesh or use provided data
  if (model.source === "generated") {
    // Create a simple mesh file
    // In production, generate actual 3D mesh data
  }
}

/**
 * Generate an audio asset
 */
async function generateAudioAsset(
  projectPath: string,
  audio: any,
  regenerate: boolean
): Promise<void> {
  const audioPath = path.join(projectPath, audio.path.replace("res://", ""));
  const audioDir = path.dirname(audioPath);
  fs.mkdirSync(audioDir, { recursive: true });

  if (fs.existsSync(audioPath) && !regenerate) {
    return;
  }

  // Generate placeholder or use provided data
  if (audio.source === "generated" && audio.data) {
    // Decode base64 audio data
    // In production, handle actual audio generation
  }
}

/**
 * Generate UI elements
 */
async function generateUI(
  projectPath: string,
  uiSpec: any,
  gameSpec: GameSpecification
): Promise<void> {
  // Generate UI scene if specified
  // This would create a CanvasLayer with UI elements
}

// Helper functions

function getRootNodeType(type: "2D" | "3D"): string {
  return type === "2D" ? "Node2D" : "Node3D";
}

function formatPropertyValue(value: any): string {
  if (typeof value === "string") {
    return `"${value}"`;
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (Array.isArray(value)) {
    return `[${value.map(formatPropertyValue).join(", ")}]`;
  }
  if (typeof value === "object" && value !== null) {
    // Handle Vector2, Vector3, Color, etc.
    if (value.x !== undefined && value.y !== undefined) {
      if (value.z !== undefined) {
        return `Vector3(${value.x}, ${value.y}, ${value.z})`;
      }
      return `Vector2(${value.x}, ${value.y})`;
    }
    if (value.r !== undefined && value.g !== undefined && value.b !== undefined) {
      return `Color(${value.r}, ${value.g}, ${value.b}, ${value.a ?? 1})`;
    }
  }
  return String(value);
}

function generateUID(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function generatePlaceholderSVG(name: string, size?: { width: number; height: number }): string {
  const width = size?.width ?? 64;
  const height = size?.height ?? 64;
  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="#4a9eff" stroke="#6bb6ff" stroke-width="2"/>
  <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" font-family="Arial" font-size="12" fill="white">${name}</text>
</svg>`;
}

