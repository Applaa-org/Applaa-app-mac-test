import { useState, useRef, useEffect } from "react";
import {
  PanelGroup,
  Panel,
  PanelResizeHandle,
  type ImperativePanelHandle,
} from "react-resizable-panels";
import { ChatPanel } from "../components/ChatPanel";
// 🚀 CRITICAL: Lazy load PreviewPanel to prevent blocking app startup
// PreviewPanel imports BlocklyEditor which is huge (~500KB+)
import { lazy, Suspense } from "react";
const PreviewPanel = lazy(() => import("../components/preview_panel/PreviewPanel").then(m => ({ default: m.PreviewPanel })));
import { CodeView } from "../components/preview_panel/CodeView";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { isPreviewOpenAtom } from "@/atoms/viewAtoms";
import { previewModeAtom } from "@/atoms/appAtoms";
import { useChats } from "@/hooks/useChats";
import { selectedAppIdAtom } from "@/atoms/appAtoms";
import { useRunApp } from "@/hooks/useRunApp";
import { MessageSquare, Code } from "lucide-react";
import { useStreamChat } from "@/hooks/useStreamChat";
import type { FileAttachment } from "@/ipc/ipc_types";
import { usePreviewReady } from '@/hooks/usePreviewReady';
import { PreviewReadyPopup } from '@/components/PreviewReadyPopup';

export default function ChatPage() {
  const search = useSearch({ from: "/chat" });
  let { id: chatId } = search;
  const initialPrompt = search.initialPrompt;
  const initialAttachments = search.initialAttachments;
  const navigate = useNavigate();
  const { streamMessage } = useStreamChat({ hasChatId: false });
  const hasAutoSubmitted = useRef(false);

  const [isPreviewOpen, setIsPreviewOpen] = useAtom(isPreviewOpenAtom);
  const [isResizing, setIsResizing] = useState(false);
  const [leftPanelView, setLeftPanelView] = useState<"chat" | "code">("chat");
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const selectedAppId = useAtomValue(selectedAppIdAtom);
  const setSelectedAppId = useSetAtom(selectedAppIdAtom);
  const { chats, loading } = useChats(selectedAppId);
  const { loading: appLoading, app } = useRunApp();
  const previewMode = useAtomValue(previewModeAtom);
  const { isPreviewReady, previewType } = usePreviewReady();
  const [showPreviewReadyPopup, setShowPreviewReadyPopup] = useState(false);
  const [isAlreadyRendered, setIsAlreadyRendered] = useState(false);

  // 🚀 CRITICAL FIX: Auto-sync selectedAppId with current chat's appId
  // This ensures the preview panel shows the correct app when user navigates to /chat?id=123
  useEffect(() => {
    const syncAppIdWithChat = async () => {
      if (chatId) {
        try {
          // First try to find the chat in the already loaded chats
          let currentChat = chats.find(chat => chat.id === chatId);

          // If not found in loaded chats, get it directly from the database
          if (!currentChat) {
            console.log(`🔍 [ChatPage] Chat ${chatId} not found in loaded chats, fetching directly...`);
            const { IpcClient } = await import("@/ipc/ipc_client");
            const ipcClient = IpcClient.getInstance();

            // Retry logic for getChat (up to 5 times for race conditions)
            let attempts = 0;
            const maxAttempts = 5;

            while (attempts < maxAttempts) {
              try {
                const chatData = await ipcClient.getChat(chatId);
                if (chatData) {
                  // Direct result has appId, no need to fetch all chats!
                  currentChat = chatData as any;
                  console.log(`✅ [ChatPage] Successfully fetched chat ${chatId} (appId: ${chatData.appId})`);
                  break;
                }
              } catch (err) {
                attempts++;
                console.warn(`⚠️ [ChatPage] getChat ${chatId} failed (attempt ${attempts}/${maxAttempts}):`, err);
                if (attempts >= maxAttempts) throw err;
                // Exponential backoff
                await new Promise(r => setTimeout(r, 500 * attempts));
              }
            }
          }

          if (currentChat && currentChat.appId && currentChat.appId !== selectedAppId) {
            console.log(`🔄 [ChatPage] Syncing selectedAppId: ${selectedAppId} -> ${currentChat.appId} for chatId: ${chatId}`);
            setSelectedAppId(currentChat.appId);
          }
        } catch (error) {
          console.error(`❌ [ChatPage] Failed to sync appId for chatId ${chatId}:`, error);
        }
      }
    };

    syncAppIdWithChat();
  }, [chatId, chats, selectedAppId, setSelectedAppId]);

  // 🚀 FIX: Auto-submit initial prompt after chat panel mounts (Dyad-style)
  // This ensures callbacks are registered before streaming starts
  useEffect(() => {
    if (initialPrompt && chatId && !hasAutoSubmitted.current) {
      console.log(`🚀 [ChatPage] Auto-submitting initial prompt for chatId: ${chatId}`);
      hasAutoSubmitted.current = true;

      // Parse attachments if provided
      let attachments: FileAttachment[] = [];
      if (initialAttachments) {
        try {
          attachments = JSON.parse(initialAttachments);
        } catch (error) {
          console.error("Failed to parse initial attachments:", error);
        }
      }

      // Wait 100ms to ensure ChatPanel is mounted and callbacks are registered
      // This matches Dyad's proven pattern and avoids race conditions
      setTimeout(() => {
        streamMessage({
          prompt: initialPrompt,
          chatId,
          attachments
        }).then(() => {
          console.log(`✅ [ChatPage] Initial prompt submitted successfully for chatId: ${chatId}`);

          // Clean up URL to remove initialPrompt/initialAttachments params
          navigate({
            to: "/chat",
            search: { id: chatId },
            replace: true // Replace history entry to hide params
          });
        }).catch((error) => {
          console.error(`❌ [ChatPage] Failed to submit initial prompt for chatId: ${chatId}:`, error);
        });
      }, 100); // Small delay to ensure ChatPanel is ready
    }
  }, [initialPrompt, chatId, streamMessage, navigate, initialAttachments]);

  useEffect(() => {

    if (!chatId && chats.length && !loading) {
      // Not a real navigation, just a redirect, when the user navigates to /chat
      // without a chatId, we redirect to the first chat

      setSelectedAppId(chats[0].appId);
      navigate({ to: "/chat", search: { id: chats[0].id }, replace: true });
    }
  }, [chatId, chats, loading, navigate, selectedAppId]);

  useEffect(() => {
    if (isPreviewOpen) {
      ref.current?.expand();
    } else {
      ref.current?.collapse();
    }
  }, [isPreviewOpen]);

  useEffect(() => {
    if (isLeftPanelOpen) {
      leftPanelRef.current?.expand();
    } else {
      leftPanelRef.current?.collapse();
    }
  }, [isLeftPanelOpen]);

  // Close left panel when publish mode is activated, reopen when closed
  useEffect(() => {
    if (previewMode === "publish") {
      setIsLeftPanelOpen(false);
    } else {
      // Reopen chat window when publish mode is closed
      setIsLeftPanelOpen(true);
    }
  }, [previewMode]);

  // 🚀 GAME MODE: Auto-collapse chat for game apps to give full screen focus
  // NOTE: Minecraft KEEPS chat open so users can modify templates via chat
  // DISABLED: Chat should show by default for all app types
  // const isGameApp = app && ['blockly', 'godot'].includes(app.appType || '');

  // useEffect(() => {
  //   if (isGameApp && isLeftPanelOpen) {
  //     setIsLeftPanelOpen(false);
  //   }
  // }, [isGameApp]); // Only run when app type changes/loads

  // Sync state to Panel ref
  useEffect(() => {
    const panel = leftPanelRef.current;
    if (panel) {
      if (isLeftPanelOpen) {
        panel.expand();
      } else {
        panel.collapse();
      }
    }
  }, [isLeftPanelOpen]);

  // Show popup when preview becomes ready (only once)
  useEffect(() => {
    if (isPreviewReady && !showPreviewReadyPopup && !isAlreadyRendered) {
      setShowPreviewReadyPopup(true);
      setIsAlreadyRendered(true);
    }
  }, [isPreviewReady, showPreviewReadyPopup, isAlreadyRendered]);

  const ref = useRef<ImperativePanelHandle>(null);
  const leftPanelRef = useRef<ImperativePanelHandle>(null);

  // 🚀 BLOCKLAA EXCLUSIVE: Full Screen "Builder" Mode
  // Completely bypass the Chat/AI interface for Blocklaa to emphasize manual learning/building.
  const isBlocklaaApp = app?.appType === 'blockly';

  if (isBlocklaaApp) {
    return (
      <div className="h-full w-full bg-background">
        <Suspense fallback={<div className="h-full w-full flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
          <PreviewPanel
            isLeftPanelOpen={false}
            onToggleLeftPanel={() => { }} // No-op, no panel to toggle
            isBlocklaaMode={true} // New prop to signal simplified UI
          />
        </Suspense>

        {/* Preview Ready Popup - Keep for consistency if needed */}
        <PreviewReadyPopup
          isOpen={showPreviewReadyPopup}
          onClose={() => setShowPreviewReadyPopup(false)}
          appName={app?.name}
          previewType={previewType}
        />
      </div>
    );
  }

  return (
    <PanelGroup autoSaveId="persistence" direction="horizontal">
      <Panel
        id="left-panel"
        minSize={30}
        ref={leftPanelRef}
        collapsible
        onCollapse={() => setIsLeftPanelOpen(false)}
        onExpand={() => setIsLeftPanelOpen(true)}
      >
        <div className="h-full w-full flex flex-col">
          {/* Toggle Header */}
          <div className="flex items-center border-b border-border bg-background px-4 py-1">
            <div className="flex rounded-md p-1 bg-muted">
              <button
                onClick={() => setLeftPanelView("chat")}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-sm text-sm font-medium transition-colors",
                  leftPanelView === "chat"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <MessageSquare size={16} />
                Chat
              </button>
              <button
                onClick={() => setLeftPanelView("code")}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-sm text-sm font-medium transition-colors",
                  leftPanelView === "code"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Code size={16} />
                Code
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-hidden">
            {leftPanelView === "chat" ? (
              <ChatPanel
                chatId={chatId}
              />
            ) : (
              <CodeView loading={appLoading} app={app} />
            )}
          </div>
        </div>
      </Panel>

      <>
        <PanelResizeHandle
          onDragging={(e) => setIsResizing(e)}
          className="w-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors cursor-col-resize"
        />
        <Panel
          collapsible
          ref={ref}
          id="preview-panel"
          minSize={20}
          className={cn(
            !isResizing && "transition-all duration-100 ease-in-out",
          )}
        >
          <Suspense fallback={<div className="h-full w-full flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
            <PreviewPanel
              isLeftPanelOpen={isLeftPanelOpen}
              onToggleLeftPanel={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
            />
          </Suspense>
        </Panel>
      </>

      {/* Preview Ready Popup */}
      <PreviewReadyPopup
        isOpen={showPreviewReadyPopup}
        onClose={() => setShowPreviewReadyPopup(false)}
        appName={app?.name}
        previewType={previewType}
      />
    </PanelGroup>
  );
}
