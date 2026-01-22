/**
 * Minecraft Module Spec - Clean mental model for Bedrock Add-on generation
 *
 * LLM generates this JSON spec, then the builder compiles it to valid files.
 * This eliminates the "random files" problem by separating AI output from file generation.
 */

export type PreviewType = "structure" | "entity" | "model" | "pack" | "none";

export interface ApplaaPreviewContract {
  type: PreviewType;
  entry: string;
  bounds?: {
    width: number;
    height: number;
    depth: number;
  };
  anchor?: {
    x: number;
    y: number;
    z: number;
  };
  camera?: {
    x: number;
    y: number;
    z: number;
  };
}

export interface McfunctionFile {
  name: string;
  content: string;
  isEntry?: boolean;
}

export interface MinecraftModuleSpec {
  moduleType: "structure" | "behavior" | "hybrid" | "model";
  name: string;
  description: string;
  version: [number, number, number];
  entryFunction: string;
  files: McfunctionFile[];
  preview: ApplaaPreviewContract;
  constraints?: {
    maxWidth?: number;
    maxHeight?: number;
    maxDepth?: number;
    allowedBlocks?: string[];
    disallowedBlocks?: string[];
  };
}

export function createDefaultPreviewContract(
  entryFunction: string,
): ApplaaPreviewContract {
  return {
    type: "structure",
    entry: entryFunction,
    bounds: {
      width: 16,
      height: 16,
      depth: 16,
    },
    anchor: {
      x: 0,
      y: 0,
      z: 0,
    },
    camera: {
      x: 8,
      y: 12,
      z: 16,
    },
  };
}

export function validateModuleSpec(spec: unknown): spec is MinecraftModuleSpec {
  if (!spec || typeof spec !== "object") return false;

  const s = spec as Record<string, unknown>;

  if (s.moduleType !== "structure" && s.moduleType !== "behavior_pack")
    return false;
  if (typeof s.name !== "string" || s.name.length === 0) return false;
  if (typeof s.description !== "string") return false;
  if (!Array.isArray(s.version) || s.version.length !== 3) return false;
  if (typeof s.entryFunction !== "string") return false;
  if (!Array.isArray(s.files)) return false;
  if (!s.preview || typeof s.preview !== "object") return false;

  return true;
}
