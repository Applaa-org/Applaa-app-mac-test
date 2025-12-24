import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePromptOptimization } from "@/hooks/usePromptOptimization";
import { useSettings } from "@/hooks/useSettings";

interface PromptEnhanceButtonProps {
  inputValue: string;
  onEnhanced: (enhancedPrompt: string) => void;
  appType?: 'web' | 'expo' | 'flutter' | 'mobile';
  disabled?: boolean;
}

export function PromptEnhanceButton({
  inputValue,
  onEnhanced,
  appType,
  disabled = false,
}: PromptEnhanceButtonProps) {
  const { settings } = useSettings();
  const { optimizePrompt, isOptimizing, error } = usePromptOptimization(appType);

  const handleEnhance = async () => {
    if (!inputValue.trim() || isOptimizing || disabled) {
      console.log("[PromptEnhance] Enhancement blocked:", { 
        hasInput: !!inputValue.trim(), 
        isOptimizing, 
        disabled,
        hasModel: !!settings?.selectedModel 
      });
      return;
    }

    console.log("[PromptEnhance] Starting enhancement for:", inputValue.substring(0, 50));
    
    try {
      const enhancedPrompt = await optimizePrompt(inputValue);
      console.log("[PromptEnhance] Enhancement completed, length:", enhancedPrompt?.length);
      if (enhancedPrompt) {
        onEnhanced(enhancedPrompt);
      } else {
        console.warn("[PromptEnhance] No enhanced prompt returned");
      }
    } catch (error) {
      console.error("[PromptEnhance] Failed to enhance prompt:", error);
      // Error is already shown via usePromptOptimization's onError handler
    }
  };

  const isDisabled = !inputValue.trim() || isOptimizing || disabled || !settings?.selectedModel;
  
  // Log state for debugging
  if (isOptimizing) {
    console.log("[PromptEnhance] Currently optimizing...");
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          onClick={handleEnhance}
          disabled={isDisabled}
          className={`flex items-center gap-1 h-8 px-1 text-xs !bg-white hover:!bg-green-50 !text-green-700 hover:!text-green-700 border-green-300 shadow-sm ${
            isOptimizing ? "opacity-75 cursor-wait" : ""
          }`}
        >
          {isOptimizing ? (
            <>
              <Loader2 className="h-2.5 w-2.5 animate-spin text-green-500" />
              <span className="text-xs">Enhancing...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-2.5 w-2.5 text-green-600" />
              <span className="text-xs text-green-700">Enhance my app</span>
            </>
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {isOptimizing
          ? "Enhancing prompt with AI..."
          : error
          ? `Error: ${error.message || "Failed to enhance"}`
          : !settings?.selectedModel
          ? "Please select an AI model first"
          : "Enhance prompt with AI"}
      </TooltipContent>
    </Tooltip>
  );
}

