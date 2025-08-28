import { SendIcon, StopCircleIcon, Zap, Undo2, Loader2 } from "lucide-react";
import { useCallback } from "react";

import { useSettings } from "@/hooks/useSettings";
import { homeChatInputValueAtom } from "@/atoms/chatAtoms"; // Use a different atom for home input
import { useAtom } from "jotai";
import { useStreamChat } from "@/hooks/useStreamChat";
import { useAttachments } from "@/hooks/useAttachments";
import { AttachmentsList } from "./AttachmentsList";
import { DragDropOverlay } from "./DragDropOverlay";
import { FileAttachmentDropdown } from "./FileAttachmentDropdown";
import { usePostHog } from "posthog-js/react";
import { HomeSubmitOptions } from "@/pages/home";
import { ChatInputControls } from "../ChatInputControls";
import { LexicalChatInput } from "./LexicalChatInput";
import { usePromptOptimization } from "@/hooks/usePromptOptimization";
import { shouldShowPromptOptimization } from "@/utils/promptOptimizationCompatibility";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
export function HomeChatInput({
  onSubmit,
  placeholder,
  showPlatformSelector = true,
  showSparkSelector = true,
  appType,
}: {
  onSubmit: (options?: HomeSubmitOptions) => void;
  placeholder?: string;
  showPlatformSelector?: boolean;
  showSparkSelector?: boolean;
  appType?: 'web' | 'expo' | 'flutter' | 'mobile';
}) {
  const posthog = usePostHog();
  const [inputValue, setInputValue] = useAtom(homeChatInputValueAtom);
  const { settings } = useSettings();
  const { isStreaming } = useStreamChat({
    hasChatId: false,
  }); // eslint-disable-line @typescript-eslint/no-unused-vars

  // Use the prompt optimization hook
  const {
    optimizePrompt,
    undoOptimization,
    resetOptimization,
    isOptimizing,
    isOptimized,
  } = usePromptOptimization(appType);

  // Voice input disabled for MVP

  // Use the attachments hook
  const {
    attachments,
    isDraggingOver,
    handleFileSelect,
    removeAttachment,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    clearAttachments,
    handlePaste,
  } = useAttachments();

  // Handler for optimizing the prompt
  const handleOptimizePrompt = async () => {
    if (!inputValue.trim() || isOptimizing) {
      return;
    }

    const optimizedText = await optimizePrompt(inputValue);
    if (optimizedText) {
      setInputValue(optimizedText);
    }
  };

  // Handler for undoing optimization
  const handleUndoOptimization = () => {
    const originalText = undoOptimization();
    setInputValue(originalText);
  };

  // Voice input disabled for MVP

  // Custom submit function that wraps the provided onSubmit
  const handleCustomSubmit = () => {
    if ((!inputValue.trim() && attachments.length === 0) || isStreaming) {
      return;
    }

    // Call the parent's onSubmit handler with attachments
    onSubmit({ attachments });

    // Clear attachments as part of submission process
    clearAttachments();
    resetOptimization(); // Reset optimization state when submitting
    posthog.capture("chat:home_submit");
  };

  if (!settings) {
    return null; // Or loading state
  }

  return (
    <>
      <div className="p-4" data-testid="home-chat-input-container">
        <div
          className={`relative flex flex-col space-y-2 border border-border rounded-lg bg-(--background-lighter) shadow-sm ${
            isDraggingOver ? "ring-2 ring-blue-500 border-blue-500" : ""
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Attachments list */}
          <AttachmentsList
            attachments={attachments}
            onRemove={removeAttachment}
          />

          {/* Drag and drop overlay */}
          <DragDropOverlay isDraggingOver={isDraggingOver} />

          <div className="flex items-start space-x-2 ">
            <LexicalChatInput
              value={inputValue}
              onChange={setInputValue}
              onSubmit={handleCustomSubmit}
              onPaste={handlePaste}
              placeholder={placeholder || "Ask Applaa to build..."}
              disabled={isStreaming}
              excludeCurrentApp={false}
            />

            {/* File attachment dropdown */}
            <FileAttachmentDropdown
              className="mt-1 mr-1"
              onFileSelect={handleFileSelect}
              disabled={isStreaming}
            />

            <div className="flex items-center gap-1">
              

              {/* Prompt optimization button */}
              {!isStreaming && inputValue.trim() && shouldShowPromptOptimization(settings?.selectedModel, settings) && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={isOptimized ? handleUndoOptimization : handleOptimizePrompt}
                        disabled={isOptimizing}
                        className={`px-2 py-2 mt-1 hover:bg-(--background-darkest) text-(--sidebar-accent-fg) rounded-lg disabled:opacity-50 ${
                          isOptimized ? 'bg-purple-100 text-purple-600' : ''
                        }`}
                        title={isOptimized ? "Undo optimization" : "Optimize your input"}
                      >
                        {isOptimizing ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : isOptimized ? (
                          <Undo2 size={18} />
                        ) : (
                          <Zap size={18} />
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {isOptimized ? "Undo optimization" : "Boost Prompt (Turbo Prompt)"}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {/* Send/Cancel button */}
              {isStreaming ? (
                <button
                  className="px-2 py-2 mt-1 mr-2 text-(--sidebar-accent-fg) rounded-lg opacity-50 cursor-not-allowed" // Indicate disabled state
                  title="Cancel generation (unavailable here)"
                >
                  <StopCircleIcon size={20} />
                </button>
              ) : (
                <button
                  onClick={handleCustomSubmit}
                  disabled={!inputValue.trim() && attachments.length === 0}
                  className="px-2 py-2 mt-1 mr-2 hover:bg-(--background-darkest) text-(--sidebar-accent-fg) rounded-lg disabled:opacity-50"
                  title="Send message"
                >
                  <SendIcon size={20} />
                </button>
              )}
            </div>
          </div>
          <div className="pt-2 pb-2 border-t border-border">
            <div className="px-2">
              <ChatInputControls showImportButton={true} showPlatformSelector={showPlatformSelector} />
            </div>
          </div>
        </div>

        {/* Voice input disabled for MVP */}
      </div>
    </>
  );
}
