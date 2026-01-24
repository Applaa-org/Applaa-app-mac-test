import { SendIcon, StopCircleIcon, Mic, MicOff, Loader2 } from "lucide-react";
import { useCallback, useState, useEffect } from "react";

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
import { useGeminiSpeech } from "@/hooks/useGeminiSpeech";

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
  appType?: 'web' | 'expo' | 'flutter' | 'godot' | 'arcade' | 'microbit' | 'minecraft' | 'blockly' | 'roblox' | 'python';
}) {
  const posthog = usePostHog();
  const [inputValue, setInputValue] = useAtom(homeChatInputValueAtom);
  const { settings } = useSettings();
  const { isStreaming } = useStreamChat({
    hasChatId: false,
  });

  const {
    isListening,
    isProcessing,
    toggleListening
  } = useGeminiSpeech({
    onTranscript: (text) => {
      setInputValue(inputValue + (inputValue && !inputValue.endsWith(" ") ? " " : "") + text);
    }
  });

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


  // Database options for this prompt
  const [createDatabase, setCreateDatabase] = useState(false);
  const [databaseNotes, setDatabaseNotes] = useState("");

  // Game data storage option (only for Applaa Game) - checked by default
  const [saveGameData, setSaveGameData] = useState(appType === 'godot');

  // Clone website mode state
  const [isCloneModeActive, setIsCloneModeActive] = useState(false);

  // Update saveGameData when appType changes
  useEffect(() => {
    console.log('[HomeChatInput] appType:', appType, 'isGodot:', appType === 'godot');
    if (appType === 'godot') {
      setSaveGameData(true);
    } else {
      setSaveGameData(false);
    }
    // Reset clone mode when appType changes
    setIsCloneModeActive(false);
  }, [appType]);

  // Toggle clone mode
  const handleCloneModeToggle = useCallback(() => {
    setIsCloneModeActive((prev) => !prev);
  }, []);

  // Handler for optimizing the prompt
  // Optimization handlers removed for MVP simplicity

  // Voice input disabled for MVP


  // Custom submit function that wraps the provided onSubmit
  const handleCustomSubmit = () => {
    if ((!inputValue.trim() && attachments.length === 0) || isStreaming) {
      return;
    }


    // If clone mode is active, prepend the clone prompt
    let finalInputValue = inputValue.trim();
    if (isCloneModeActive && finalInputValue) {
      finalInputValue = `Please clone the following website: ${finalInputValue}`;
      // Update the input value with the modified prompt before submitting
      // Use a callback to ensure the update happens before onSubmit reads from the atom
      setInputValue(finalInputValue);
    }

    // Call the parent's onSubmit handler with attachments, DB options, and game data option
    // The parent will read from homeChatInputValueAtom, which we've just updated if in clone mode
    onSubmit({ attachments, createDatabase, databaseNotes, saveGameData });


    // Clear attachments as part of submission process
    clearAttachments();
    // Reset clone mode after submission
    setIsCloneModeActive(false);
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
          className={`relative flex flex-col space-y-2 border border-border rounded-lg bg-(--background-lighter) shadow-sm ${isDraggingOver ? "ring-2 ring-blue-500 border-blue-500" : ""
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
              placeholder={
                isCloneModeActive
                  ? "Enter the name or URL of the website you wish to clone"
                  : placeholder || "Ask Applaa to build..."
              }
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
              <button
                onClick={toggleListening}
                disabled={isStreaming || isProcessing}
                className={`px-2 py-2 mt-1 mr-1 rounded-lg transition-colors ${isListening ? "text-red-500 bg-red-50" : "text-(--sidebar-accent-fg) hover:bg-(--background-darkest)"
                  }`}
                title={isListening ? "Stop listening" : "Start voice input"}
              >
                {isProcessing ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : isListening ? (
                  <MicOff size={20} />
                ) : (
                  <Mic size={20} />
                )}
              </button>

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
                isCloneModeActive={isCloneModeActive}
                onCloneModeToggle={handleCloneModeToggle}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
