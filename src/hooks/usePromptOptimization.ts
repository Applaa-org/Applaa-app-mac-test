import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { IpcClient } from "../ipc/ipc_client";
import type { OptimizePromptParams, OptimizePromptResponse } from "../ipc/handlers/prompt_optimization_handlers";
import { useSettings } from "./useSettings";
import { showError } from "../lib/toast";

export function usePromptOptimization(appType?: "web" | "expo" | "flutter" | "godot" | "arcade" | "microbit" | "minecraft" | "blockly" | "mobile") {
  const { settings } = useSettings();
  const [originalPrompt, setOriginalPrompt] = useState<string>("");
  const [isOptimized, setIsOptimized] = useState<boolean>(false);

  const optimizeMutation = useMutation({
    mutationFn: async (prompt: string): Promise<OptimizePromptResponse> => {
      if (!settings?.selectedModel) {
        throw new Error("No model selected for optimization");
      }

      const params: OptimizePromptParams = {
        originalPrompt: prompt,
        selectedModel: settings.selectedModel,
        appType: appType === 'expo' || appType === 'flutter' ? 'mobile' : appType,
      };

      // Add timestamp to ensure fresh requests
      console.log(`[Optimization] Processing prompt at ${new Date().toISOString()}:`, prompt);

      return IpcClient.getInstance().optimizePrompt(params);
    },
    // Disable caching to always get fresh optimization results
    gcTime: 0,
    staleTime: 0,
    onError: (error: Error) => {
      // Provide more helpful error messages
      let errorMessage = error.message || "Failed to optimize prompt";

      if (errorMessage.includes("not compatible")) {
        // Model compatibility issue - show a more helpful message
        showError(errorMessage);
      } else if (errorMessage.includes("model configuration")) {
        // API/configuration issue
        showError(errorMessage);
      } else {
        // Generic error - add helpful context
        showError(`Prompt optimization failed: ${errorMessage}`);
      }
    },
  });

  const optimizePrompt = useCallback(
    async (prompt: string): Promise<string | null> => {
      if (!prompt.trim()) {
        return null;
      }

      try {
        setOriginalPrompt(prompt);
        const result = await optimizeMutation.mutateAsync(prompt);
        setIsOptimized(true);
        return result.optimizedPrompt;
      } catch (error) {
        console.error("Failed to optimize prompt:", error);
        return null;
      }
    },
    [optimizeMutation]
  );

  const undoOptimization = useCallback(() => {
    setIsOptimized(false);
    return originalPrompt;
  }, [originalPrompt]);

  const resetOptimization = useCallback(() => {
    setOriginalPrompt("");
    setIsOptimized(false);
  }, []);

  return {
    optimizePrompt,
    undoOptimization,
    resetOptimization,
    isOptimizing: optimizeMutation.isPending,
    isOptimized,
    originalPrompt,
    error: optimizeMutation.error,
  };
}
