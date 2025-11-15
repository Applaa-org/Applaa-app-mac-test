/**
 * 3D Scene Generator
 * Generates 3D scene specifications and .tscn files
 */

import type { SceneSpec, NodeSpec, LightingSpec, CameraSpec } from "../game_spec_schema";

export interface Scene3DOptions {
  name: string;
  width?: number;
  height?: number;
  lighting?: boolean;
  camera?: boolean;
  skybox?: string;
}

/**
 * Generate a 3D scene specification
 */
export function generate3DSceneSpec(options: Scene3DOptions): SceneSpec {
  const nodes: NodeSpec[] = [];

  // Root Node3D
  const rootNode: NodeSpec = {
    name: options.name,
    type: "Node3D",
    position: { x: 0, y: 0, z: 0 },
    children: [],
  };

  // Add environment/skybox
  if (options.skybox) {
    rootNode.children!.push({
      name: "WorldEnvironment",
      type: "WorldEnvironment",
      children: [
        {
          name: "Environment",
          type: "Environment",
          properties: {
            background_mode: 1, // Sky
            sky: options.skybox,
          },
        },
      ],
    });
  }

  // Add directional light if lighting is enabled
  if (options.lighting !== false) {
    rootNode.children!.push({
      name: "DirectionalLight3D",
      type: "DirectionalLight3D",
      position: { x: 0, y: 10, z: 0 },
      rotation: { x: -45, y: 0, z: 0 },
      properties: {
        light_energy: 1.0,
        shadow_enabled: true,
      },
    });
  }

  // Add camera if requested
  if (options.camera !== false) {
    const camera: CameraSpec = {
      type: "Camera3D",
      position: { x: 0, y: 5, z: 10 },
      rotation: { x: -20, y: 0, z: 0 },
      projection: "perspective",
      fov: 75,
    };

    rootNode.children!.push({
      name: "Camera3D",
      type: "Camera3D",
      position: camera.position,
      rotation: camera.rotation,
      properties: {
        fov: camera.fov,
        projection: 0, // Perspective
      },
    });
  }

  nodes.push(rootNode);

  const lighting: LightingSpec | undefined = options.lighting !== false
    ? {
        ambient: { r: 0.2, g: 0.2, b: 0.2, a: 1 },
        lights: [
          {
            type: "DirectionalLight3D",
            position: { x: 0, y: 10, z: 0 },
            energy: 1.0,
            shadows: true,
          },
        ],
      }
    : undefined;

  return {
    name: options.name,
    type: "3D",
    path: `res://scenes/${options.name}.tscn`,
    nodes,
    lighting,
    camera: options.camera !== false
      ? {
          type: "Camera3D",
          position: { x: 0, y: 5, z: 10 },
          rotation: { x: -20, y: 0, z: 0 },
          projection: "perspective",
          fov: 75,
        }
      : undefined,
  };
}

/**
 * Generate a 3D platformer scene
 */
export function generate3DPlatformerScene(name: string): SceneSpec {
  const scene = generate3DSceneSpec({
    name,
    width: 1280,
    height: 720,
    lighting: true,
    camera: true,
  });

  // Add ground plane
  if (scene.nodes[0].children) {
    scene.nodes[0].children.push({
      name: "Ground",
      type: "StaticBody3D",
      position: { x: 0, y: 0, z: 0 },
      children: [
        {
          name: "MeshInstance3D",
          type: "MeshInstance3D",
          properties: {
            mesh: "res://assets/models/ground.obj",
          },
        },
        {
          name: "CollisionShape3D",
          type: "CollisionShape3D",
          properties: {
            shape: "BoxShape3D",
          },
        },
      ],
    });
  }

  return scene;
}

/**
 * Generate a 3D first-person scene
 */
export function generate3DFirstPersonScene(name: string): SceneSpec {
  const scene = generate3DSceneSpec({
    name,
    width: 1280,
    height: 720,
    lighting: true,
    camera: true,
  });

  // Adjust camera for first-person
  if (scene.camera) {
    scene.camera.position = { x: 0, y: 1.6, z: 0 }; // Eye height
    scene.camera.rotation = { x: 0, y: 0, z: 0 };
  }

  return scene;
}

