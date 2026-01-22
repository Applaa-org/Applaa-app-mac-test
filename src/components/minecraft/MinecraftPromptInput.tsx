/**
 * Minecraft Creation Prompt Input
 *
 * Simple prompt input with sample ideas to help users get started.
 * This is the entry point for the end-to-end Minecraft mod creation flow.
 */

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { showError, showSuccess } from "@/lib/toast";
import {
  Building,
  Home,
  Lightbulb,
  RefreshCw,
  Send,
  Sparkles,
  Sword,
  Trees,
} from "lucide-react";
import type React from "react";
import { useCallback, useState } from "react";

interface SamplePrompt {
  id: string;
  icon: React.ReactNode;
  label: string;
  prompt: string;
  description: string;
}

const SAMPLE_PROMPTS: SamplePrompt[] = [
  {
    id: "house",
    icon: <Home className="w-4 h-4" />,
    label: "House",
    prompt: "Build a small wooden house with a door and windows",
    description: "A cozy starter home",
  },
  {
    id: "tower",
    icon: <Building className="w-4 h-4" />,
    label: "Tower",
    prompt: "Create a tall stone tower with battlements at the top",
    description: "Defensive lookout point",
  },
  {
    id: "farm",
    icon: <Trees className="w-4 h-4" />,
    label: "Farm",
    prompt: "Build a simple wheat farm with water channel and light",
    description: "Food production area",
  },
  {
    id: "castle",
    icon: <Sword className="w-4 h-4" />,
    label: "Castle",
    prompt: "Create a small castle with walls, towers, and a gate",
    description: "Medieval fortress",
  },
];

interface MinecraftPromptInputProps {
  onSubmit: (prompt: string) => Promise<void>;
  isGenerating?: boolean;
}

export const MinecraftPromptInput: React.FC<MinecraftPromptInputProps> = ({
  onSubmit,
  isGenerating = false,
}) => {
  const [prompt, setPrompt] = useState("");
  const [showSamples, setShowSamples] = useState(true);

  const handleSubmit = useCallback(async () => {
    if (!prompt.trim()) {
      showError("Please enter a prompt describing what you want to build");
      return;
    }

    try {
      await onSubmit(prompt.trim());
      showSuccess("Creating your Minecraft mod...");
    } catch (error) {
      console.error("Mod creation error:", error);
      showError("Failed to create mod. Please try again.");
    }
  }, [prompt, onSubmit]);

  const handleSampleClick = useCallback((sample: SamplePrompt) => {
    setPrompt(sample.prompt);
    setShowSamples(false);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  return (
    <div className="flex flex-col gap-4 p-4 bg-gray-900 rounded-lg border border-gray-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-yellow-400" />
          <h3 className="text-lg font-semibold text-white">
            Create Minecraft Mod
          </h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSamples(!showSamples)}
          className="text-gray-400 hover:text-white"
        >
          <Lightbulb className="w-4 h-4 mr-1" />
          {showSamples ? "Hide ideas" : "Show ideas"}
        </Button>
      </div>

      {showSamples && (
        <div className="grid grid-cols-2 gap-2">
          {SAMPLE_PROMPTS.map((sample) => (
            <button
              key={sample.id}
              onClick={() => handleSampleClick(sample)}
              className="flex items-start gap-3 p-3 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-left"
            >
              <div className="flex-shrink-0 mt-0.5 text-blue-400">
                {sample.icon}
              </div>
              <div>
                <div className="font-medium text-white text-sm">
                  {sample.label}
                </div>
                <div className="text-xs text-gray-400">
                  {sample.description}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <Textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Describe what you want to build... (e.g., 'Build a stone castle with walls and towers')"
        className="min-h-[100px] bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 resize-none"
      />

      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">Press ⌘+Enter to submit</div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPrompt("")}
            disabled={!prompt || isGenerating}
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Clear
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!prompt.trim() || isGenerating}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-1" />
                Create Mod
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MinecraftPromptInput;
