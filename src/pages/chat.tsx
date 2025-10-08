import { useState, useRef, useEffect } from "react";
import {
  PanelGroup,
  Panel,
  PanelResizeHandle,
  type ImperativePanelHandle,
} from "react-resizable-panels";
import { ChatPanel } from "../components/ChatPanel";
import { PreviewPanel } from "../components/preview_panel/PreviewPanel";
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

export default function ChatPage() {
  const search = useSearch({ from: "/chat" });
  let { id: chatId } = search;
  const initialPrompt = search.initialPrompt;
  const initialAttachments = search.initialAttachments;
  const navigate = useNavigate();
  const { streamMessage } = useStreamChat({ hasChatId: false });
  const hasAutoSubmitted = useRef(false);
  
  console.log("🏠 ChatPage rendered with chatId:", chatId, "initialPrompt:", initialPrompt ? `"${initialPrompt.substring(0, 50)}..."` : "none");
  const [isPreviewOpen, setIsPreviewOpen] = useAtom(isPreviewOpenAtom);
  const [isResizing, setIsResizing] = useState(false);
  const [leftPanelView, setLeftPanelView] = useState<"chat" | "code">("chat");
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const selectedAppId = useAtomValue(selectedAppIdAtom);
  const setSelectedAppId = useSetAtom(selectedAppIdAtom);
  const { chats, loading } = useChats(selectedAppId);
  const { loading: appLoading, app } = useRunApp();
  const previewMode = useAtomValue(previewModeAtom);

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
            const chatData = await ipcClient.getChat(chatId);
            
            // Get all chats to find the appId (since getChat doesn't return appId directly)
            const allChats = await ipcClient.getChats();
            currentChat = allChats.find(chat => chat.id === chatId);
          }
          
          if (currentChat && currentChat.appId !== selectedAppId) {
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
    console.log("🔄 Chat redirect effect:", { chatId, chatsLength: chats.length, loading, selectedAppId });
    
    if (!chatId && chats.length && !loading) {
      // Not a real navigation, just a redirect, when the user navigates to /chat
      // without a chatId, we redirect to the first chat
      console.log("📍 Redirecting to first chat:", chats[0]);
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

  const ref = useRef<ImperativePanelHandle>(null);
  const leftPanelRef = useRef<ImperativePanelHandle>(null);

  return (
    <PanelGroup autoSaveId="persistence" direction="horizontal">
      <Panel id="left-panel" minSize={30} ref={leftPanelRef} collapsible>
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
          <PreviewPanel 
            isLeftPanelOpen={isLeftPanelOpen}
            onToggleLeftPanel={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
          />
        </Panel>
      </>
    </PanelGroup>
  );
}
