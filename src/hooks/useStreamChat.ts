import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ComponentSelection,
  Message,
  FileAttachment,
} from "@/ipc/ipc_types";
import { useAtom, useSetAtom, useAtomValue } from "jotai";
import {
  chatErrorAtom,
  chatMessagesAtom,
  chatStreamCountAtom,
  isStreamingAtom,
  currentStreamingAppIdAtom,
} from "@/atoms/chatAtoms";
import { IpcClient } from "@/ipc/ipc_client";
import { isPreviewOpenAtom } from "@/atoms/viewAtoms";
import type { ChatResponseEnd } from "@/ipc/ipc_types";
import { useChats } from "./useChats";
import { useLoadApp } from "./useLoadApp";
import { selectedAppIdAtom, appUrlAtom } from "@/atoms/appAtoms";
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
  // 🚨 DYAD PATTERN: Simple state management (no over-engineering!)
  const [, setMessages] = useAtom(chatMessagesAtom);
  const [error, setError] = useAtom(chatErrorAtom);
  const [isStreaming, setIsStreaming] = useAtom(isStreamingAtom); // Simple writable atom
  const setCurrentStreamingAppId = useSetAtom(currentStreamingAppIdAtom);
  
  const setIsPreviewOpen = useSetAtom(isPreviewOpenAtom);
  const [selectedAppId] = useAtom(selectedAppIdAtom);
  const appUrl = useAtomValue(appUrlAtom);
  const [holdBuildingAppId, setHoldBuildingAppId] = useState<number | null>(null);
  const holdBuildingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  // 🚨 DYAD PATTERN: No complex app-specific state management
  // Just use simple setIsStreaming(true/false) like Dyad does

  // Direct state management with global atoms

  // 🚨 CRITICAL: Removed useCallback wrapper - it was causing stale closure issues
  // The massive dependency array was making the function unstable
  const streamMessage = async ({
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

      // 🚨 DYAD PATTERN: Simple global streaming check
      if (isStreaming) {
        console.log(`Stream already active for chatId: ${chatId}, ignoring new request`);
        throw new Error("Stream already in progress");
      }

      console.log(`🚀 Starting stream for chatId: ${chatId}, prompt: "${prompt.substring(0, 50)}..."`);
      setError(null);
      
      // 🚨 DYAD PATTERN: Direct setIsStreaming (no complex state management)
      setIsStreaming(true);
      // ✅ ADD: Track which app is streaming (for app list loader)
      if (selectedAppId) {
        setCurrentStreamingAppId(selectedAppId);
      }

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
              
              // 🚨 SIMPLIFIED: Always update messages - React is smart enough to batch updates
              // The "optimization" of comparing messages was causing silent streaming issues
              setMessages(updatedMessages);
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

              // 🚨 DYAD PATTERN: Direct streaming state reset
              setIsStreaming(false);
              // If files changed, Applaa triggers a preview restart/build.
              // Keep the "building" guard active until the preview URL is ready again.
              if (response.updatedFiles && selectedAppId) {
                setHoldBuildingAppId(selectedAppId);
              } else {
                setCurrentStreamingAppId(null);
                setHoldBuildingAppId(null);
              }
              
              refreshChats();
              refreshApp();
              refreshVersions();
              countTokens(chatId, "");
            },
            onError: (errorMessage: string) => {
              console.error(`[CHAT] Stream error for ${chatId}:`, errorMessage);
              setError(errorMessage);

              // 🚨 DYAD PATTERN: Direct streaming state reset on error
              setIsStreaming(false);
              setCurrentStreamingAppId(null);
              setHoldBuildingAppId(null);
              
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
              // 🚨 DYAD PATTERN: Direct streaming state reset on timeout
              setIsStreaming(false);
              setCurrentStreamingAppId(null);
              reject(new Error("Stream failed to start within timeout"));
            }
          }, 10000);
          
        } catch (error) {
          console.error("[CHAT] Exception during streaming setup:", error);
          // 🚨 DYAD PATTERN: Direct streaming state reset on exception
          setIsStreaming(false);
          setCurrentStreamingAppId(null);
          setHoldBuildingAppId(null);
          setError(error instanceof Error ? error.message : String(error));
          reject(error);
        }
      });
  };

  // Clear the "building" guard once app preview is ready again.
  useEffect(() => {
    if (!holdBuildingAppId) {
      if (holdBuildingTimeoutRef.current) {
        clearTimeout(holdBuildingTimeoutRef.current);
        holdBuildingTimeoutRef.current = null;
      }
      return;
    }

    const isReadyForApp =
      appUrl.appId === holdBuildingAppId && !!appUrl.originalUrl;

    // Clear immediately when preview is ready for the same app.
    if (isReadyForApp) {
      if (holdBuildingTimeoutRef.current) {
        clearTimeout(holdBuildingTimeoutRef.current);
        holdBuildingTimeoutRef.current = null;
      }
      setCurrentStreamingAppId(null);
      setHoldBuildingAppId(null);
      return;
    }

    // Safety net: always clear after 20s even if appUrl never changes.
    if (!holdBuildingTimeoutRef.current) {
      holdBuildingTimeoutRef.current = setTimeout(() => {
        setCurrentStreamingAppId(null);
        setHoldBuildingAppId(null);
        holdBuildingTimeoutRef.current = null;
      }, 20000);
    }

    return () => {
      if (holdBuildingTimeoutRef.current) {
        clearTimeout(holdBuildingTimeoutRef.current);
        holdBuildingTimeoutRef.current = null;
      }
    };
  }, [holdBuildingAppId, appUrl.appId, appUrl.originalUrl, setCurrentStreamingAppId]);

  return {
    streamMessage,
    isStreaming, // 🚨 DYAD PATTERN: Return global streaming state
    error,
    setError,
  };
}
