/**
 * 2D Scene Generator
 * Generates 2D scene specifications and .tscn files
 */

import type { SceneSpec, NodeSpec, PhysicsSpec, CameraSpec } from "../game_spec_schema";

export interface Scene2DOptions {
  name: string;
  width?: number;
  height?: number;
  background?: string;
  physics?: boolean;
  camera?: boolean;
}

/**
 * Generate a 2D scene specification
 */
export function generate2DSceneSpec(options: Scene2DOptions): SceneSpec {
  const nodes: NodeSpec[] = [];

  // Root Node2D
  const rootNode: NodeSpec = {
    name: options.name,
    type: "Node2D",
    position: { x: 0, y: 0 },
    children: [],
  };

  // Add background if specified
  if (options.background) {
    rootNode.children!.push({
      name: "Background",
      type: "ColorRect",
      position: { x: 0, y: 0 },
      properties: {
        color: options.background,
        size: `Vector2(${options.width ?? 1280}, ${options.height ?? 720})`,
      },
    });
  }

  // Add camera if requested
  if (options.camera !== false) {
    const camera: CameraSpec = {
      type: "Camera2D",
      position: {
        x: (options.width ?? 1280) / 2,
        y: (options.height ?? 720) / 2,
      },
    };

    rootNode.children!.push({
      name: "Camera2D",
      type: "Camera2D",
      position: camera.position,
      properties: {
        enabled: true,
      },
    });
  }

  // Add physics world if requested
  if (options.physics) {
    // Physics is handled by the root node in 2D
    // Additional physics bodies can be added as children
  }

  nodes.push(rootNode);

  return {
    name: options.name,
    type: "2D",
    path: `res://scenes/${options.name}.tscn`,
    nodes,
    physics: options.physics
      ? {
          type: "static",
          body_type: "RigidBody2D",
        }
      : undefined,
    camera: options.camera !== false
      ? {
          type: "Camera2D",
          position: {
            x: (options.width ?? 1280) / 2,
            y: (options.height ?? 720) / 2,
          },
        }
      : undefined,
  };
}

/**
 * Generate a 2D platformer scene
 */
export function generate2DPlatformerScene(name: string): SceneSpec {
  const scene = generate2DSceneSpec({
    name,
    width: 1280,
    height: 720,
    background: "Color(0.1, 0.1, 0.15, 1)",
    physics: true,
    camera: true,
  });

  // Add ground platform
  if (scene.nodes[0].children) {
    scene.nodes[0].children.push({
      name: "Ground",
      type: "StaticBody2D",
      position: { x: 0, y: 700 },
      children: [
        {
          name: "CollisionShape2D",
          type: "CollisionShape2D",
          properties: {
            shape: "RectangleShape2D",
          },
        },
        {
          name: "Sprite2D",
          type: "Sprite2D",
          properties: {
            texture: "res://assets/sprites/platform.png",
          },
        },
      ],
    });
  }

  return scene;
}

/**
 * Generate a 2D top-down scene
 */
export function generate2DTopDownScene(name: string): SceneSpec {
  return generate2DSceneSpec({
    name,
    width: 1280,
    height: 720,
    background: "Color(0.2, 0.3, 0.4, 1)",
    physics: true,
    camera: true,
  });
}

