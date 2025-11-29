import { SendIcon, StopCircleIcon } from "lucide-react";
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
// Voice input removed for MVP performance optimization
// Prompt optimization removed for MVP simplicity
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
  // Prompt optimization removed for MVP simplicity

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
  // Optimization handlers removed for MVP simplicity

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
    // resetOptimization removed for MVP simplicity
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
              {/* 🎤 Voice Input - REMOVED for MVP performance optimization */}

              {/* Boost feature removed - reverted to simple Keep Going functionality */}

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
                  className="px-2 py-2 mt-1 mr-2 hover:bg-(--background-darkest) text-green-500 rounded-lg disabled:opacity-50"
                  title="Send message"
                >
                  <SendIcon size={20} />
                </button>
              )}
            </div>
          </div>
          <div className="pt-2 pb-2 border-t border-border">
            <div className="px-2">
              <ChatInputControls 
                showImportButton={true} 
                showPlatformSelector={showPlatformSelector}
                inputValue={inputValue}
                onInputChange={setInputValue}
                appType={appType}
                disabled={isStreaming}
              />
            </div>
          </div>
        </div>

        {/* Voice input now enabled with browser-based Web Speech API */}
      </div>
    </>
  );
}
