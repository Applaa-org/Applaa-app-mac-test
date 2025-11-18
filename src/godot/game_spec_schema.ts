/**
 * Complete Game Specification JSON Schema
 * This defines the structure for AI-generated game specifications
 */

export interface GameSpecification {
  game: {
    name: string;
    type: "2D" | "3D";
    description: string;
    version?: string;
  };

  settings: {
    window: {
      width: number;
      height: number;
      fullscreen?: boolean;
      resizable?: boolean;
      title?: string;
    };
    physics: {
      enabled: boolean;
      gravity?: { x: number; y: number; z?: number };
      fps?: number;
    };
    rendering: {
      vsync?: boolean;
      msaa?: number;
      shadows?: boolean;
    };
  };

  scenes: SceneSpec[];

  assets: {
    sprites?: SpriteAsset[];
    models?: ModelAsset[];
    audio?: AudioAsset[];
    fonts?: FontAsset[];
    materials?: MaterialAsset[];
  };

  scripts?: ScriptSpec[];

  ui?: UISpec;
}

export interface SceneSpec {
  name: string;
  type: "2D" | "3D";
  path: string; // e.g., "res://scenes/Main.tscn"
  nodes: NodeSpec[];
  physics?: PhysicsSpec;
  lighting?: LightingSpec;
  camera?: CameraSpec;
}

export interface NodeSpec {
  name: string;
  type: string; // Godot node type (e.g., "Node2D", "RigidBody2D", "MeshInstance3D")
  parent?: string; // Parent node name
  position?: { x: number; y: number; z?: number };
  rotation?: { x: number; y: number; z?: number };
  scale?: { x: number; y: number; z?: number };
  properties?: Record<string, any>; // Additional node properties
  children?: NodeSpec[];
  script?: string; // Path to script file
  groups?: string[]; // Node groups
  signals?: SignalSpec[];
}

export interface SignalSpec {
  name: string;
  target: string; // Target node name
  method: string; // Method to call
}

export interface PhysicsSpec {
  type: "static" | "kinematic" | "rigid" | "character";
  body_type?: "RigidBody2D" | "RigidBody3D" | "CharacterBody2D" | "CharacterBody3D";
  collision_shape?: {
    type: "rectangle" | "circle" | "capsule" | "box" | "sphere" | "mesh";
    size?: { x: number; y: number; z?: number };
    radius?: number;
  };
  mass?: number;
  friction?: number;
  bounce?: number;
}

export interface LightingSpec {
  ambient?: { r: number; g: number; b: number; a: number };
  lights?: LightSpec[];
}

export interface LightSpec {
  type: "DirectionalLight3D" | "OmniLight3D" | "SpotLight3D" | "DirectionalLight2D" | "PointLight2D";
  position?: { x: number; y: number; z?: number };
  color?: { r: number; g: number; b: number; a: number };
  energy?: number;
  shadows?: boolean;
}

export interface CameraSpec {
  type: "Camera2D" | "Camera3D";
  position?: { x: number; y: number; z?: number };
  rotation?: { x: number; y: number; z?: number };
  follow_target?: string; // Node name to follow
  projection?: "perspective" | "orthogonal";
  fov?: number;
}

export interface SpriteAsset {
  name: string;
  path: string;
  type: "texture" | "animated" | "tileset";
  size?: { width: number; height: number };
  frames?: number; // For animated sprites
  source?: "generated" | "file"; // How to obtain the asset
  data?: string; // Base64 data for generated assets
}

export interface ModelAsset {
  name: string;
  path: string;
  type: "mesh" | "gltf" | "obj";
  source?: "generated" | "file";
  data?: string; // Base64 or JSON data
}

export interface AudioAsset {
  name: string;
  path: string;
  type: "music" | "sfx";
  source?: "generated" | "file";
  data?: string; // Base64 audio data
}

export interface FontAsset {
  name: string;
  path: string;
  size?: number;
}

export interface MaterialAsset {
  name: string;
  path: string;
  type: "StandardMaterial3D" | "CanvasItemMaterial" | "ShaderMaterial";
  properties?: Record<string, any>;
}

export interface ScriptSpec {
  name: string;
  path: string; // e.g., "res://scripts/Player.gd"
  type: "GDScript" | "CSharp";
  code: string; // GDScript code
  extends?: string; // Base class
  signals?: string[]; // Signal definitions
  exports?: ExportVarSpec[]; // Exported variables
}

export interface ExportVarSpec {
  name: string;
  type: string;
  default?: any;
  hint?: string;
}

export interface UISpec {
  theme?: string;
  elements?: UIElementSpec[];
}

export interface UIElementSpec {
  type: "Label" | "Button" | "Panel" | "ProgressBar" | "TextureRect";
  name: string;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
  text?: string;
  properties?: Record<string, any>;
}

/**
 * Validate a game specification
 */
export function validateGameSpec(spec: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!spec.game) {
    errors.push("Missing 'game' section");
  } else {
    if (!spec.game.name) errors.push("Missing game.name");
    if (!spec.game.type || !["2D", "3D"].includes(spec.game.type)) {
      errors.push("Invalid game.type (must be '2D' or '3D')");
    }
  }

  if (!spec.scenes || !Array.isArray(spec.scenes) || spec.scenes.length === 0) {
    errors.push("Missing or empty 'scenes' array");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

