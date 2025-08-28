import type React from "react";
import type { Message } from "@/ipc/ipc_types";
import { forwardRef, useState } from "react";
import ChatMessage from "./ChatMessage";
import { SetupBanner } from "../SetupBanner";

import { useStreamChat } from "@/hooks/useStreamChat";
import { selectedChatIdAtom } from "@/atoms/chatAtoms";
import { useAtomValue, useSetAtom } from "jotai";
import { Loader2, RefreshCw, Undo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVersions } from "@/hooks/useVersions";
import { selectedAppIdAtom } from "@/atoms/appAtoms";
import { showError, showWarning } from "@/lib/toast";
import { IpcClient } from "@/ipc/ipc_client";
import { chatMessagesAtom } from "@/atoms/chatAtoms";
import { useLanguageModelProviders } from "@/hooks/useLanguageModelProviders";
import { useSettings } from "@/hooks/useSettings";
import { useUserBudgetInfo } from "@/hooks/useUserBudgetInfo";
// import { PromoMessage } from "./PromoMessage";

interface MessagesListProps {
  messages: Message[];
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export const MessagesList = forwardRef<HTMLDivElement, MessagesListProps>(
  function MessagesList({ messages, messagesEndRef }, ref) {
    const appId = useAtomValue(selectedAppIdAtom);
    const { versions, revertVersion } = useVersions(appId);
    const { streamMessage, isStreaming } = useStreamChat();
    const { isAnyProviderSetup } = useLanguageModelProviders();
    const { settings } = useSettings();
    const setMessages = useSetAtom(chatMessagesAtom);
    const [isUndoLoading, setIsUndoLoading] = useState(false);
    const [isRetryLoading, setIsRetryLoading] = useState(false);
    const selectedChatId = useAtomValue(selectedChatIdAtom);
    const { userBudget } = useUserBudgetInfo();

    return (
      <div
        className="flex-1 overflow-y-auto p-4"
        ref={ref}
        data-testid="messages-list"
      >
        {messages.length > 0 ? (
          messages.map((message, index) => (
            <ChatMessage
              key={index}
              message={message}
              showUndoButton={
                index === messages.length - 1 &&
                message.role === "assistant" &&
                !isStreaming &&
                versions &&
                versions.length > 1
              }
              showRetryButton={
                index === messages.length - 1 &&
                message.role === "assistant" &&
                !isStreaming
              }
              onUndo={async () => {
                if (!appId) return;
                setIsUndoLoading(true);
                try {
                  const result = await revertVersion(appId);
                  if (!result.success) {
                    showError(result.error || "Failed to undo changes");
                    return;
                  }

                  // Remove the last assistant message from chat
                  setMessages((prev) => prev.slice(0, -1));
                } catch (error) {
                  console.error("Error undoing:", error);
                  showError("Failed to undo changes");
                } finally {
                  setIsUndoLoading(false);
                }
              }}
              onRetry={async () => {
                if (!appId || !selectedChatId) return;
                setIsRetryLoading(true);
                try {
                  // Find the last user message
                  const lastUserMessage = [...messages]
                    .reverse()
                    .find((m) => m.role === "user");
                  if (!lastUserMessage) {
                    showWarning("No user message to retry");
                    return;
                  }

                  // Remove the last assistant message
                  setMessages((prev) => prev.slice(0, -1));

                  // Re-send the user message
                  await streamMessage(
                    lastUserMessage.content,
                    selectedChatId,
                    "build",
                  );
                } catch (error) {
                  console.error("Error retrying:", error);
                  showError("Failed to retry message");
                } finally {
                  setIsRetryLoading(false);
                }
              }}
              isUndoLoading={isUndoLoading}
              isRetryLoading={isRetryLoading}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            {!isAnyProviderSetup ? (
              <SetupBanner />
            ) : (
              <>
                <div className="mb-8">
                  <div className="text-6xl mb-4">🍊</div>
                  <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
                    Welcome to Applaa
                  </h2>
                  <p className="text-gray-600 max-w-md">
                    Your AI-powered app builder. Start by describing what you'd
                    like to create, and Applaa will build it for you!
                  </p>
                </div>
                {/* Dyad Banners hidden - PromoMessage component commented out */}
                {/* {!userBudget?.hasUserReachedBudgetLimit && settings?.isProModeEnabled && (
                  <PromoMessage />
                )} */}
              </>
            )}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    );
  },
);







