import { BedrockPackBuilder, PackBuildResult } from "./bedrock-pack-builder";
import { MinecraftModuleSpec, ApplaaPreviewContract } from "./minecraft-module-spec";

/**
 * The raw JSON output format we expect from the LLM
 */
export interface LLMModuleSpec {
    module_type: "structure" | "behavior" | "hybrid" | "model";
    name: string;
    description: string;
    entry_function: string;
    commands: string[];
    preview: {
        type: "structure" | "entity" | "model" | "pack" | "none";
        bounds: [number, number, number];
        anchor: [number, number, number];
        camera?: { x: number; y: number; z: number };
    };
}

/**
 * Compiles a raw LLM response into a valid Bedrock Behavior Pack
 */
export class ModuleCompiler {
    static compile(llmOutput: LLMModuleSpec | string): PackBuildResult {
        try {
            // 1. Parse Input
            const spec = typeof llmOutput === "string" ? JSON.parse(llmOutput) : llmOutput;

            // 2. Convert to Internal Spec
            const internalSpec: MinecraftModuleSpec = this.convertToInternalSpec(spec);

            // 3. Build Pack
            const builder = new BedrockPackBuilder(internalSpec);
            return builder.build();

        } catch (error: any) {
            return {
                success: false,
                files: [],
                errors: [`Compiler Error: ${error.message}`],
                previewContract: { type: "none", entry: "", bounds: { width: 0, height: 0, depth: 0 }, anchor: { x: 0, y: 0, z: 0 } } // Empty fallback
            };
        }
    }

    private static convertToInternalSpec(llmSpec: LLMModuleSpec): MinecraftModuleSpec {
        // Convert commands array to file content
        const mainContent = llmSpec.commands.join("\n");

        // Ensure bounds is valid
        const [w, h, d] = llmSpec.preview.bounds || [32, 32, 32];
        const [ax, ay, az] = llmSpec.preview.anchor || [0, 0, 0];

        // Auto-detect preview type if not explicit, or trust LLM
        // If behavior/model, we might want to force preview.type to 'none' or 'pack' 
        // unless the LLM gave us something specific.
        let previewType = llmSpec.preview.type;

        // Fallback logic: if module is behavior, default to 'none' if preview is 'structure' (which might be hallucinated)
        if (llmSpec.module_type === 'behavior' && (!previewType || previewType === 'structure')) {
            previewType = 'none';
        }

        return {
            moduleType: llmSpec.module_type,
            name: llmSpec.name,
            description: llmSpec.description,
            version: [1, 0, 0],
            entryFunction: llmSpec.entry_function,
            files: [
                {
                    name: llmSpec.entry_function,
                    content: mainContent,
                    isEntry: true
                }
            ],
            preview: {
                type: previewType,
                entry: llmSpec.entry_function,
                bounds: {
                    width: w,
                    height: h,
                    depth: d
                },
                anchor: {
                    x: ax,
                    y: ay,
                    z: az
                },
                camera: llmSpec.preview.camera
            }
        };
    }
}
