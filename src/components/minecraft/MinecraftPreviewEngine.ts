/**
 * Enhanced Minecraft Preview Engine
 *
 * Reads applaa.preview.json contract to determine how to render the mod.
 * Supports structure preview (voxel blocks) and pack browser views.
 */

import {
  type MinecraftBlock,
  type ParseResult,
  parseMcfunction,
} from "@/components/viewer/MinecraftAdapter";
import type {
  ApplaaPreviewContract,
  PreviewType,
} from "@/lib/minecraft/minecraft-module-spec";

export interface PreviewResult {
  type: PreviewType;
  blocks: MinecraftBlock[];
  messages: string[];
  errors: string[];
  contract: ApplaaPreviewContract;
  bounds: { width: number; height: number; depth: number };
}

export interface PreviewError {
  code:
    | "NO_CONTRACT"
    | "INVALID_CONTRACT"
    | "PARSE_ERROR"
    | "NO_ENTRY_FILE"
    | "UNKNOWN_TYPE";
  message: string;
}

export class MinecraftPreviewEngine {
  private contract: ApplaaPreviewContract | null = null;
  private mcfunctionContent = "";
  private errors: string[] = [];

  /**
   * Load the preview contract from applaa.preview.json
   */
  loadContract(contractJson: string): boolean {
    try {
      this.contract = JSON.parse(contractJson) as ApplaaPreviewContract;
      return true;
    } catch (error) {
      this.errors.push(`Failed to parse applaa.preview.json: ${error}`);
      return false;
    }
  }

  /**
   * Load the entry mcfunction file content
   */
  loadMcfunction(content: string): void {
    this.mcfunctionContent = content;
  }

  /**
   * Generate preview based on contract type
   */
  generate(): PreviewResult | PreviewError {
    if (!this.contract) {
      return {
        code: "NO_CONTRACT",
        message:
          "No applaa.preview.json found. The mod may not have a valid preview contract.",
      };
    }

    switch (this.contract.type) {
      case "structure":
        return this.generateStructurePreview();

      case "pack":
        return this.generatePackBrowser();

      case "entity":
      case "model":
        return {
          code: "UNKNOWN_TYPE",
          message: `Preview type "${this.contract.type}" requires additional implementation. Showing pack browser instead.`,
        } as PreviewError;

      default:
        return this.generateStructurePreview();
    }
  }

  /**
   * Structure preview - parse mcfunction and render blocks
   */
  private generateStructurePreview(): PreviewResult {
    if (!this.contract) {
      return {
        type: "structure",
        blocks: [],
        messages: [],
        errors: ["No preview contract loaded"],
        contract: {
          type: "structure",
          entry: "main",
          bounds: { width: 16, height: 16, depth: 16 },
        },
        bounds: { width: 16, height: 16, depth: 16 },
      };
    }

    let parseResult: ParseResult;

    if (this.mcfunctionContent) {
      parseResult = parseMcfunction(this.mcfunctionContent);
    } else {
      parseResult = { blocks: [], messages: [], errors: [] };
      parseResult.errors.push(
        `Entry function "${this.contract.entry}" not found or empty`,
      );
    }

    const bounds = this.contract.bounds || { width: 16, height: 16, depth: 16 };

    return {
      type: "structure",
      blocks: parseResult.blocks,
      messages: parseResult.messages,
      errors: parseResult.errors,
      contract: this.contract,
      bounds,
    };
  }

  /**
   * Pack browser - show pack contents overview
   */
  private generatePackBrowser(): PreviewResult {
    return {
      type: "pack",
      blocks: [],
      messages: [],
      errors: [],
      contract: this.contract!,
      bounds: { width: 0, height: 0, depth: 0 },
    };
  }

  /**
   * Get the current contract
   */
  getContract(): ApplaaPreviewContract | null {
    return this.contract;
  }

  /**
   * Get any errors that occurred
   */
  getErrors(): string[] {
    return [...this.errors];
  }

  /**
   * Clear state for a new preview
   */
  reset(): void {
    this.contract = null;
    this.mcfunctionContent = "";
    this.errors = [];
  }

  /**
   * Calculate camera position based on bounds
   */
  getCameraPosition(): { x: number; y: number; z: number } {
    if (!this.contract?.camera) {
      const bounds = this.contract?.bounds || {
        width: 16,
        height: 16,
        depth: 16,
      };
      return {
        x: bounds.width / 2,
        y: bounds.height * 0.75,
        z: bounds.depth + Math.max(bounds.width, bounds.depth),
      };
    }

    return this.contract.camera;
  }

  /**
   * Calculate target position for camera
   */
  getCameraTarget(): { x: number; y: number; z: number } {
    if (!this.contract?.anchor) {
      const bounds = this.contract?.bounds || {
        width: 16,
        height: 16,
        depth: 16,
      };
      return {
        x: bounds.width / 2,
        y: bounds.height / 2,
        z: bounds.depth / 2,
      };
    }

    return this.contract.anchor;
  }
}

/**
 * Create a preview engine with contract and content loaded
 */
export function createPreviewFromFiles(
  contractJson: string,
  mcfunctionContent: string,
): MinecraftPreviewEngine {
  const engine = new MinecraftPreviewEngine();
  engine.loadContract(contractJson);
  engine.loadMcfunction(mcfunctionContent);
  return engine;
}

/**
 * Generate preview result from raw files
 */
export function generatePreview(
  contractJson: string,
  mcfunctionContent: string,
): PreviewResult | PreviewError {
  const engine = createPreviewFromFiles(contractJson, mcfunctionContent);
  return engine.generate();
}

export default MinecraftPreviewEngine;
