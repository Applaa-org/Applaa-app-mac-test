/**
 * Minecraft Creation Studio
 *
 * Complete end-to-end Minecraft mod creation flow:
 * 1. User enters simple prompt
 * 2. System internally enhances the prompt with Minecraft details
 * 3. Builder creates module spec and compiles to Bedrock pack
 * 4. Preview engine renders 3D preview based on applaa.preview.json
 */

import { MinecraftPromptInput } from "@/components/minecraft/MinecraftPromptInput";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ApplaaViewer3D } from "@/components/viewer/ApplaaViewer3D";
import type { MinecraftBlock } from "@/components/viewer/MinecraftAdapter";
import { IpcClient } from "@/ipc/ipc_client";
import {
  type EnhancedPrompt,
  enhancePrompt,
  generateMcfunctionFromEnhanced,
} from "@/lib/minecraft/minecraft-prompt-enhancer";
import { showError, showInfo, showSuccess } from "@/lib/toast";
import {
  AlertCircle,
  Box,
  CheckCircle,
  Code,
  Download,
  FileJson,
  RotateCw,
  Wand2,
} from "lucide-react";
import type React from "react";
import { useCallback, useState } from "react";

interface PreviewResult {
  success: boolean;
  type: string;
  blocks: MinecraftBlock[];
  messages: string[];
  errors: string[];
  bounds: { width: number; height: number; depth: number };
  camera?: { x: number; y: number; z: number };
  target?: { x: number; y: number; z: number };
}

export const MinecraftCreationStudio: React.FC = () => {
  const [step, setStep] = useState<
    "prompt" | "enhancing" | "generating" | "preview" | "error"
  >("prompt");
  const [enhancedPrompt, setEnhancedPrompt] = useState<EnhancedPrompt | null>(
    null,
  );
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(
    null,
  );
  const [generatedCode, setGeneratedCode] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState("");

  const handleSubmitPrompt = useCallback(async (userPrompt: string) => {
    setIsProcessing(true);
    setProgress("Analyzing and enhancing your prompt...");
    setStep("enhancing");

    try {
      const enhanced = enhancePrompt(userPrompt);
      setEnhancedPrompt(enhanced);
      setGeneratedCode(generateMcfunctionFromEnhanced(enhanced));

      setProgress("Building Bedrock pack...");
      setStep("generating");

      const moduleSpec = createModuleSpecFromEnhanced(enhanced);
      const ipcClient = IpcClient.getInstance();

      const specJson = JSON.stringify(moduleSpec);
      const buildResult = await ipcClient.buildBedrockPack(specJson);

      if (!buildResult.success) {
        throw new Error(
          buildResult.errors?.join(", ") || "Failed to build pack",
        );
      }

      setProgress("Generating 3D preview...");

      const entryMcfunction = buildResult.files.find((f) =>
        f.path.endsWith(".mcfunction"),
      );
      const previewContract = buildResult.files.find(
        (f) => f.path === "applaa.preview.json",
      );

      if (entryMcfunction && previewContract) {
        const preview = (await ipcClient.generatePreview({
          contractJson: previewContract.content,
          mcfunctionContent: entryMcfunction.content,
        })) as PreviewResult;

        setPreviewResult(preview);
      }

      setProgress("");
      setStep("preview");
      showSuccess("Minecraft mod created successfully!");
    } catch (error: any) {
      console.error("Failed to create mod:", error);
      setStep("error");
      showError(error.message || "Failed to create mod");
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const createModuleSpecFromEnhanced = (enhanced: EnhancedPrompt) => {
    const { structure, enhanced: enhancedDescription } = enhanced;

    const name =
      structure.type.charAt(0).toUpperCase() +
      structure.type.slice(1) +
      "Build";
    const entryFunction = structure.type.toLowerCase() + "_build";

    return {
      moduleType: "structure",
      name,
      description: enhancedDescription,
      version: [1, 0, 0],
      entryFunction,
      files: [
        {
          name: entryFunction,
          content: generateMcfunctionFromEnhanced(enhanced),
          isEntry: true,
        },
      ],
      preview: {
        type: "structure",
        entry: entryFunction,
        bounds: {
          width: structure.width,
          height: structure.height,
          depth: structure.depth,
        },
        camera: {
          x: structure.width / 2,
          y: structure.height * 0.75,
          z: structure.depth + Math.max(structure.width, structure.depth),
        },
      },
    };
  };

  const handleRegenerate = useCallback(() => {
    setStep("prompt");
    setEnhancedPrompt(null);
    setPreviewResult(null);
    setGeneratedCode("");
  }, []);

  const handleCopyCode = useCallback(() => {
    navigator.clipboard.writeText(generatedCode);
    showSuccess("Code copied to clipboard!");
  }, [generatedCode]);

  const handleExport = useCallback(() => {
    showInfo("Export feature coming soon!");
  }, []);

  return (
    <div className="h-full flex flex-col bg-gray-950 text-white">
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-600 rounded-lg">
            <Box className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Minecraft Creation Studio</h1>
            <p className="text-sm text-gray-400">
              Create Bedrock mods with AI-powered enhancement
            </p>
          </div>
        </div>
        {step === "preview" && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRegenerate}>
              <RotateCw className="w-4 h-4 mr-1" />
              New
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden">
        {step === "prompt" && (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="max-w-2xl w-full">
              <MinecraftPromptInput
                onSubmit={handleSubmitPrompt}
                isGenerating={isProcessing}
              />
              <div className="mt-8 p-4 bg-gray-900 rounded-lg border border-gray-800">
                <h3 className="flex items-center gap-2 font-semibold mb-2">
                  <Wand2 className="w-4 h-4 text-purple-400" />
                  How it works
                </h3>
                <ol className="text-sm text-gray-400 space-y-2 list-decimal list-inside">
                  <li>You enter a simple prompt (e.g., "build a castle")</li>
                  <li>
                    AI automatically enhances it with Minecraft-specific details
                  </li>
                  <li>System generates optimized mcfunction commands</li>
                  <li>3D preview shows your creation instantly</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {(step === "enhancing" || step === "generating") && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">
                {step === "enhancing"
                  ? "Enhancing Your Prompt..."
                  : "Building Your Mod..."}
              </h2>
              <p className="text-gray-400">{progress}</p>
              {enhancedPrompt && step === "generating" && (
                <div className="mt-4 p-4 bg-gray-900 rounded-lg max-w-md mx-auto text-left">
                  <div className="text-xs text-gray-500 mb-2">
                    Enhanced Prompt:
                  </div>
                  <div className="text-sm text-gray-300">
                    {enhancedPrompt.enhanced}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {step === "preview" && enhancedPrompt && (
          <>
            <div className="w-1/3 border-r border-gray-800 flex flex-col">
              <div className="p-4 border-b border-gray-800">
                <h2 className="font-semibold flex items-center gap-2">
                  <FileJson className="w-4 h-4 text-blue-400" />
                  {enhancedPrompt.structure.type.charAt(0).toUpperCase() +
                    enhancedPrompt.structure.type.slice(1)}
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  Original: "{enhancedPrompt.original}"
                </p>
              </div>

              <div className="flex-1 overflow-auto p-4">
                <Card className="bg-gray-900 border-gray-700 mb-4">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Wand2 className="w-4 h-4 text-purple-400" />
                      Enhanced Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <div className="space-y-1 text-gray-300">
                      <div>
                        Size: {enhancedPrompt.structure.width}x
                        {enhancedPrompt.structure.height}x
                        {enhancedPrompt.structure.depth}
                      </div>
                      <div>
                        Materials:{" "}
                        {enhancedPrompt.structure.materials
                          .slice(0, 3)
                          .join(", ")}
                      </div>
                      <div>
                        Features:{" "}
                        {[
                          enhancedPrompt.structure.hasRoof ? "Roof" : "",
                          enhancedPrompt.structure.hasWindows ? "Windows" : "",
                          enhancedPrompt.structure.hasDoor ? "Door" : "",
                        ]
                          .filter(Boolean)
                          .join(", ") || "Basic structure"}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium flex items-center gap-2">
                      <Code className="w-4 h-4" />
                      Generated Code
                    </h3>
                    <Button variant="ghost" size="sm" onClick={handleCopyCode}>
                      Copy
                    </Button>
                  </div>
                  <Textarea
                    value={generatedCode}
                    readOnly
                    className="h-64 text-sm font-mono bg-gray-900 border-gray-700 resize-none"
                  />
                </div>

                {previewResult && previewResult.messages.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      Messages
                    </h3>
                    <div className="bg-gray-900 rounded-lg p-3 space-y-1">
                      {previewResult.messages.map((msg, i) => (
                        <div key={i} className="text-sm text-green-400">
                          {msg}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {previewResult && previewResult.errors.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-yellow-400" />
                      Warnings
                    </h3>
                    <div className="bg-gray-900 rounded-lg p-3 space-y-1">
                      {previewResult.errors.map((err, i) => (
                        <div key={i} className="text-sm text-yellow-400">
                          {err}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-xs text-gray-500">
                  {previewResult?.blocks.length || 0} blocks rendered
                </div>
              </div>
            </div>

            <div className="flex-1 relative">
              <ApplaaViewer3D
                blocks={previewResult?.blocks || []}
                showGrid={true}
                showStats={true}
              />

              <div className="absolute bottom-4 left-4 bg-black/70 text-white px-3 py-2 rounded-lg">
                <div className="text-sm font-medium">
                  {enhancedPrompt.structure.type.charAt(0).toUpperCase() +
                    enhancedPrompt.structure.type.slice(1)}
                </div>
                <div className="text-xs text-gray-400">
                  {previewResult?.blocks.length || 0} blocks
                </div>
              </div>
            </div>
          </>
        )}

        {step === "error" && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md">
              <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">
                Failed to Create Mod
              </h2>
              <p className="text-gray-400 mb-4">
                Something went wrong. Please try again.
              </p>
              <Button onClick={handleRegenerate}>
                <RotateCw className="w-4 h-4 mr-1" />
                Try Again
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MinecraftCreationStudio;
