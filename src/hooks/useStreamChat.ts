import { useCallback, useState } from "react";
import type {
  ComponentSelection,
  Message,
  FileAttachment,
} from "@/ipc/ipc_types";
import { useAtom, useSetAtom } from "jotai";
import {
  chatErrorAtom,
  chatMessagesAtom,
  chatStreamCountAtom,
  isStreamingAtom,
  appStreamingStatesAtom,
} from "@/atoms/chatAtoms";
import { IpcClient } from "@/ipc/ipc_client";
import { isPreviewOpenAtom } from "@/atoms/viewAtoms";
import type { ChatResponseEnd } from "@/ipc/ipc_types";
import { useChats } from "./useChats";
import { useLoadApp } from "./useLoadApp";
import { selectedAppIdAtom } from "@/atoms/appAtoms";
import { useVersions } from "./useVersions";
import { showExtraFilesToast } from "@/lib/toast";
import { useProposal } from "./useProposal";
import { useSearch } from "@tanstack/react-router";
import { useRunApp } from "./useRunApp";
import { useCountTokens } from "./useCountTokens";
import { useUserBudgetInfo } from "./useUserBudgetInfo";
import { usePostHog } from "posthog-js/react";
import { useCheckProblems } from "./useCheckProblems";
import { useSettings } from "./useSettings";

export function getRandomNumberId() {
  return Math.floor(Math.random() * 1_000_000_000_000_000);
}

export function useStreamChat({
  hasChatId = true,
}: { hasChatId?: boolean } = {}) {
  // Use global atoms for proper state management across components
  const [, setMessages] = useAtom(chatMessagesAtom);
  const [isStreaming, setIsStreaming] = useAtom(isStreamingAtom);
  const [error, setError] = useAtom(chatErrorAtom);
  
  // 🚨 CRITICAL FIX: App-specific streaming state management
  const [appStreamingStates, setAppStreamingStates] = useAtom(appStreamingStatesAtom);
  
  const setIsPreviewOpen = useSetAtom(isPreviewOpenAtom);
  const [selectedAppId] = useAtom(selectedAppIdAtom);
  const { refreshChats } = useChats(selectedAppId);
  const { refreshApp } = useLoadApp(selectedAppId);
  const setStreamCount = useSetAtom(chatStreamCountAtom);
  const { refreshVersions } = useVersions(selectedAppId);
  const { refreshAppIframe, restartApp } = useRunApp();
  const { countTokens } = useCountTokens();
  const { refetchUserBudget } = useUserBudgetInfo();
  const { checkProblems } = useCheckProblems(selectedAppId);
  const { settings } = useSettings();
  const posthog = usePostHog();
  let chatId: number | undefined;

  if (hasChatId) {
    const { id } = useSearch({ from: "/chat" });
    chatId = id;
  }
  let { refreshProposal } = hasChatId ? useProposal(chatId) : useProposal();

  // Helper function to set app-specific streaming state
  const setAppStreamingState = useCallback((appId: number | null, streaming: boolean) => {
    if (!appId) return;
    setAppStreamingStates(prev => ({
      ...prev,
      [appId]: streaming
    }));
  }, []); // Remove setAppStreamingStates dependency to prevent infinite loop

  // Direct state management with global atoms

  const streamMessage = useCallback(
    async ({
      prompt,
      chatId,
      redo,
      attachments,
      selectedComponent,
    }: {
      prompt: string;
      chatId: number;
      redo?: boolean;
      attachments?: FileAttachment[];
      selectedComponent?: ComponentSelection | null;
    }) => {
      if (
        (!prompt.trim() && (!attachments || attachments.length === 0)) ||
        !chatId
      ) {
        throw new Error("Invalid prompt or chat ID");
      }

      // Prevent multiple concurrent streams
      if (isStreaming) {
        console.log(`Stream already active for chatId: ${chatId}, ignoring new request`);
        throw new Error("Stream already in progress");
      }

      console.log(`🚀 Starting stream for chatId: ${chatId}, prompt: "${prompt.substring(0, 50)}..."`);
      console.log(`🔧 Current messages length: ${messages.length}`);
      setError(null);
      setIsStreaming(true);
      
      // 🚨 CRITICAL FIX: Set app-specific streaming state
      setAppStreamingState(selectedAppId, true);
      
      // Small delay to ensure UI updates
      await new Promise(resolve => setTimeout(resolve, 50));

      let hasIncrementedStreamCount = false;
      let streamStarted = false;
      
      return new Promise<void>((resolve, reject) => {
        try {
          IpcClient.getInstance().streamMessage(prompt, {
            selectedComponent: selectedComponent ?? null,
            chatId,
            redo,
            attachments,
            onUpdate: (updatedMessages: Message[]) => {
              console.log(`📨 Message update received: ${updatedMessages.length} messages`);
              
              if (!streamStarted) {
                streamStarted = true;
                console.log("✅ Stream started successfully");
                resolve(); // Resolve promise when first update arrives (stream started successfully)
              }
              
              if (!hasIncrementedStreamCount) {
                setStreamCount((streamCount) => streamCount + 1);
                hasIncrementedStreamCount = true;
              }
              
              // 🚀 PERFORMANCE: Batch message updates to prevent flickering
              setMessages((prevMessages) => {
                console.log(`🔄 Updating messages: ${prevMessages.length} -> ${updatedMessages.length}`);
                // Only update if messages actually changed to prevent unnecessary re-renders
                // Use length and last message comparison for better performance than JSON.stringify
                if (prevMessages.length !== updatedMessages.length || 
                    (updatedMessages.length > 0 && 
                     prevMessages[prevMessages.length - 1]?.content !== updatedMessages[updatedMessages.length - 1]?.content)) {
                  console.log("✅ Messages updated successfully");
                  return updatedMessages;
                }
                console.log("⏭️ Messages unchanged, skipping update");
                return prevMessages;
              });
            },
            onEnd: (response: ChatResponseEnd) => {
              console.log(`✅ Stream ended successfully for chatId: ${chatId}`);
              
              // Clear any logged callback errors for this chat
              const ipcClient = IpcClient.getInstance();
              if ((ipcClient as any).loggedMissingCallbacks) {
                (ipcClient as any).loggedMissingCallbacks.delete(chatId);
              }
              
              if (response.updatedFiles) {
                setIsPreviewOpen(true);
                // Auto-restart the dev server so preview loads without manual action
                // This mirrors Dyad's behaviour for instant preview after edits
                try {
                  restartApp();
                } catch (e) {
                  // Non-blocking: still refresh iframe even if restart fails
                }
                refreshAppIframe();
                if (settings?.enableAutoFixProblems) {
                  checkProblems();
                }
              }
              // Always refresh the preview after a completed response so users
              // do not need to click the refresh button manually.
              // This ensures the iframe/dev preview reflects any changes,
              // including non-file-affecting updates (e.g., dependency installs,
              // environment changes, or content that still benefits from a reload).
              refreshAppIframe();
              if (response.extraFiles) {
                showExtraFilesToast({
                  files: response.extraFiles,
                  error: response.extraFilesError,
                  posthog,
                });
              }
              refreshProposal(chatId);

              refetchUserBudget();

              // Reset streaming state
              setIsStreaming(false);
              // 🚨 CRITICAL FIX: Reset app-specific streaming state
              setAppStreamingState(selectedAppId, false);
              
              refreshChats();
              refreshApp();
              refreshVersions();
              countTokens(chatId, "");
            },
            onError: (errorMessage: string) => {
              console.error(`[CHAT] Stream error for ${chatId}:`, errorMessage);
              setError(errorMessage);

              // Reset streaming state on error
              setIsStreaming(false);
              // 🚨 CRITICAL FIX: Reset app-specific streaming state on error
              setAppStreamingState(selectedAppId, false);
              
              refreshChats();
              refreshApp();
              refreshVersions();
              countTokens(chatId, "");
              
              if (!streamStarted) {
                reject(new Error(errorMessage));
              }
            },
          });
          
          // Set a timeout to reject if stream doesn't start within 10 seconds
          setTimeout(() => {
            if (!streamStarted) {
              setIsStreaming(false);
              // 🚨 CRITICAL FIX: Reset app-specific streaming state on timeout
              setAppStreamingState(selectedAppId, false);
              reject(new Error("Stream failed to start within timeout"));
            }
          }, 10000);
          
        } catch (error) {
          console.error("[CHAT] Exception during streaming setup:", error);
          setIsStreaming(false);
          // 🚨 CRITICAL FIX: Reset app-specific streaming state on exception
          setAppStreamingState(selectedAppId, false);
          setError(error instanceof Error ? error.message : String(error));
          reject(error);
        }
      });
    },
    [
      setMessages,
      setIsStreaming,
      setIsPreviewOpen,
      checkProblems,
      selectedAppId,
      refetchUserBudget,
      setAppStreamingState,
    ],
  );

  return {
    streamMessage,
    isStreaming,
    error,
    setError,
    setIsStreaming,
  };
}
