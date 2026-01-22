/**
 * Bedrock Pack Builder
 *
 * Compiles a MinecraftModuleSpec into a valid Bedrock Behavior Pack structure.
 * Handles UUID generation, manifest creation, and applaa.preview.json contract.
 */

import { v4 as uuidv4 } from "uuid";
import type {
  ApplaaPreviewContract,
  MinecraftModuleSpec,
} from "./minecraft-module-spec";

export interface PackBuildResult {
  success: boolean;
  files: GeneratedFile[];
  errors: string[];
  previewContract: ApplaaPreviewContract;
}

export interface GeneratedFile {
  path: string;
  content: string;
}

export class BedrockPackBuilder {
  private moduleSpec: MinecraftModuleSpec;
  private packUuid: string;
  private moduleUuid: string;

  constructor(moduleSpec: MinecraftModuleSpec) {
    this.moduleSpec = moduleSpec;
    this.packUuid = uuidv4();
    this.moduleUuid = uuidv4();
  }

  build(): PackBuildResult {
    const errors: string[] = [];
    const files: GeneratedFile[] = [];

    try {
      files.push(this.createManifest());
      files.push(...this.createMcfunctions());
      files.push(this.createTickJson());
      files.push(this.createApplaaPreviewJson());
      files.push(this.createReadme());
    } catch (error) {
      errors.push(`Build error: ${error}`);
    }

    return {
      success: errors.length === 0,
      files,
      errors,
      previewContract: this.moduleSpec.preview,
    };
  }

  private createManifest(): GeneratedFile {
    const spec = this.moduleSpec;
    const manifest = {
      format_version: 2,
      header: {
        name: spec.name,
        description: spec.description,
        uuid: this.packUuid,
        version: spec.version,
        min_engine_version: [1, 20, 0],
      },
      modules: [
        {
          type: "data",
          uuid: this.moduleUuid,
          version: spec.version,
        },
      ],
    };

    return {
      path: "manifest.json",
      content: JSON.stringify(manifest, null, 2),
    };
  }

  private createMcfunctions(): GeneratedFile[] {
    return this.moduleSpec.files.map((file) => ({
      path: `functions/${file.name}.mcfunction`,
      content: file.content,
    }));
  }

  private createTickJson(): GeneratedFile {
    const entryFile = this.moduleSpec.files.find(
      (f) => f.name === this.moduleSpec.entryFunction,
    );

    if (!entryFile) {
      return {
        path: "functions/tick.json",
        content: JSON.stringify(
          {
            values: [],
          },
          null,
          2,
        ),
      };
    }

    return {
      path: "functions/tick.json",
      content: JSON.stringify(
        {
          values: [this.moduleSpec.entryFunction],
        },
        null,
        2,
      ),
    };
  }

  private createApplaaPreviewJson(): GeneratedFile {
    const preview = this.moduleSpec.preview;

    const contract: ApplaaPreviewContract = {
      type: preview.type || "structure",
      entry: preview.entry || this.moduleSpec.entryFunction,
      bounds: preview.bounds || {
        width: 16,
        height: 16,
        depth: 16,
      },
      anchor: preview.anchor || {
        x: 0,
        y: 0,
        z: 0,
      },
      camera: preview.camera || {
        x: 8,
        y: 12,
        z: 16,
      },
    };

    return {
      path: "applaa.preview.json",
      content: JSON.stringify(contract, null, 2),
    };
  }

  private createReadme(): GeneratedFile {
    const spec = this.moduleSpec;

    return {
      path: "README.md",
      content: `# ${spec.name}

${spec.description}

## Module Type
${spec.moduleType === "structure" ? "Structure Pack (mcfunction commands)" : spec.moduleType === "behavior" ? "Behavior Pack (entities, items, blocks)" : spec.moduleType === "hybrid" ? "Hybrid Pack (Structure + Behavior)" : "Model Pack"}

## Entry Point
\`${spec.entryFunction}.mcfunction\`

## Files
${spec.files.map((f) => `- ${f.name}.mcfunction`).join("\n")}

## Preview Configuration
This pack includes an Applaa preview contract for 3D visualization.
See \`applaa.preview.json\` for preview settings.

## Bedrock Version
Compatible with Minecraft Bedrock 1.20.0+
`,
    };
  }

  static createModuleSpecFromPrompt(
    prompt: string,
    userDescription: string,
  ): MinecraftModuleSpec {
    const safeName = userDescription
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .split(/\s+/)
      .slice(0, 3)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join("_");

    const entryFunction = safeName.toLowerCase().replace(/\s+/g, "_");

    return {
      moduleType: "structure",
      name: safeName,
      description: `User request: ${prompt}`,
      version: [1, 0, 0],
      entryFunction,
      files: [
        {
          name: entryFunction,
          content: `# ${safeName}\n# ${userDescription}\n\n# TODO: Generate build commands based on user prompt\n`,
          isEntry: true,
        },
      ],
      preview: {
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
      },
      constraints: {
        maxWidth: 16,
        maxHeight: 16,
        maxDepth: 16,
        allowedBlocks: [
          "stone",
          "cobblestone",
          "dirt",
          "grass_block",
          "planks",
          "oak_planks",
          "spruce_planks",
          "birch_planks",
          "glass",
          "sand",
          "gravel",
          "wood",
          "log",
          "leaves",
          "wool",
          "air",
          "water",
          "lava",
          "brick",
          "stone_bricks",
        ],
      },
    };
  }
}

export default BedrockPackBuilder;
