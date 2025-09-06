import type React from "react";
import type { Message } from "@/ipc/ipc_types";
import { forwardRef, useState, useMemo } from "react";
import ChatMessage from "./ChatMessage";
import { SetupBanner } from "../SetupBanner";
import { ApplaaBuddyWidget } from "../buddy/ApplaaBuddyWidget";

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
  chatId?: number; // Add chatId prop to fix button functionality
}

// 🤖 Helper functions for Applaa Buddy
function getLatestAppCode(messages: Message[]): string {
  // Extract code from the latest assistant message
  const latestAssistantMessage = [...messages]
    .reverse()
    .find((msg) => msg.role === 'assistant');
  
  if (!latestAssistantMessage) return '';
  
  // Look for code blocks in the content
  const codeBlockRegex = /```(?:typescript|javascript|tsx|jsx)?\n([\s\S]*?)```/g;
  const matches = latestAssistantMessage.content.match(codeBlockRegex);
  
  return matches ? matches.join('\n\n') : latestAssistantMessage.content;
}

function getLatestUserPrompt(messages: Message[]): string {
  // Get the latest user message
  const latestUserMessage = [...messages]
    .reverse()
    .find((msg) => msg.role === 'user');
  
  return latestUserMessage?.content || '';
}

function getAppType(appId: number | null): 'web' | 'mobile' {
  // TODO: Determine app type based on appId or app structure
  // For now, default to 'web' - this should be enhanced
  return 'web';
}

export const MessagesList = forwardRef<HTMLDivElement, MessagesListProps>(
  function MessagesList({ messages, messagesEndRef, chatId }, ref) {
    const appId = useAtomValue(selectedAppIdAtom);
    const { versions, revertVersion } = useVersions(appId);
    const { streamMessage, isStreaming } = useStreamChat();
    const { isAnyProviderSetup } = useLanguageModelProviders();
    const { settings } = useSettings();
    const setMessages = useSetAtom(chatMessagesAtom);
    const [isUndoLoading, setIsUndoLoading] = useState(false);
    const [isRetryLoading, setIsRetryLoading] = useState(false);
    // 🚨 CRITICAL FIX: Use chatId prop instead of global selectedChatIdAtom
    const selectedChatId = chatId;
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
              isLastMessage={index === messages.length - 1}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto">
            <div className="flex items-center justify-center h-full text-gray-500">
              No messages yet
            </div>
            {!isAnyProviderSetup() && <SetupBanner />}
          </div>
        )}
        {!isStreaming && (
          <div className="flex max-w-3xl mx-auto gap-2">
            {!!messages.length &&
              messages[messages.length - 1].role === "assistant" &&
              messages[messages.length - 1].commitHash && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isUndoLoading}
                  onClick={async () => {
                    if (!selectedChatId || !appId) {
                      console.error("No chat selected or app ID not available");
                      return;
                    }

                    setIsUndoLoading(true);
                    try {
                      if (messages.length >= 3) {
                        const previousAssistantMessage =
                          messages[messages.length - 3];
                        if (
                          previousAssistantMessage?.role === "assistant" &&
                          previousAssistantMessage?.commitHash
                        ) {
                          console.debug(
                            "Reverting to previous assistant version",
                          );
                          await revertVersion({
                            versionId: previousAssistantMessage.commitHash,
                          });
                          const chat =
                            await IpcClient.getInstance().getChat(
                              selectedChatId,
                            );
                          setMessages(chat.messages);
                        }
                      } else {
                        const chat =
                          await IpcClient.getInstance().getChat(selectedChatId);
                        if (chat.initialCommitHash) {
                          await revertVersion({
                            versionId: chat.initialCommitHash,
                          });
                          try {
                            await IpcClient.getInstance().deleteMessages(
                              selectedChatId,
                            );
                            setMessages([]);
                          } catch (err) {
                            showError(err);
                          }
                        } else {
                          showWarning(
                            "No initial commit hash found for chat. Need to manually undo code changes",
                          );
                        }
                      }
                    } catch (error) {
                      console.error("Error during undo operation:", error);
                      showError("Failed to undo changes");
                    } finally {
                      setIsUndoLoading(false);
                    }
                  }}
                >
                  {isUndoLoading ? (
                    <Loader2 size={16} className="mr-1 animate-spin" />
                  ) : (
                    <Undo size={16} />
                  )}
                  Undo
                </Button>
              )}
            {!!messages.length && (
              <Button
                variant="outline"
                size="sm"
                disabled={isRetryLoading}
                onClick={async () => {
                  if (!selectedChatId) {
                    console.error("No chat selected");
                    showError("No chat selected for retry operation");
                    return;
                  }

                  if (!messages.length) {
                    console.error("No messages to retry");
                    showError("No messages to retry");
                    return;
                  }

                  setIsRetryLoading(true);
                  try {
                    // The last message is usually an assistant, but it might not be.
                    const lastVersion = versions?.[0];
                    const lastMessage = messages[messages.length - 1];
                    let shouldRedo = true;
                    if (
                      lastVersion?.oid === lastMessage.commitHash &&
                      lastMessage.role === "assistant"
                    ) {
                      const previousAssistantMessage =
                        messages[messages.length - 3];
                      if (
                        previousAssistantMessage?.role === "assistant" &&
                        previousAssistantMessage?.commitHash
                      ) {
                        console.debug(
                          "Reverting to previous assistant version",
                        );
                        await revertVersion({
                          versionId: previousAssistantMessage.commitHash,
                        });
                        shouldRedo = false;
                      } else {
                        const chat =
                          await IpcClient.getInstance().getChat(selectedChatId);
                        if (chat.initialCommitHash) {
                          console.debug(
                            "Reverting to initial commit hash",
                            chat.initialCommitHash,
                          );
                          await revertVersion({
                            versionId: chat.initialCommitHash,
                          });
                        } else {
                          showWarning(
                            "No initial commit hash found for chat. Need to manually undo code changes",
                          );
                        }
                      }
                    }

                    // Find the last user message
                    const lastUserMessage = [...messages]
                      .reverse()
                      .find((message) => message.role === "user");
                    if (!lastUserMessage) {
                      console.error("No user message found to retry");
                      showError("No user message found to retry");
                      return;
                    }
                    // Need to do a redo, if we didn't delete the message from a revert.
                    const redo = shouldRedo;
                    console.debug("Streaming message with redo", redo);

                    streamMessage({
                      prompt: lastUserMessage.content,
                      chatId: selectedChatId,
                      redo,
                    });
                  } catch (error) {
                    console.error("Error during retry operation:", error);
                    showError("Failed to retry message");
                  } finally {
                    setIsRetryLoading(false);
                  }
                }}
              >
                {isRetryLoading ? (
                  <Loader2 size={16} className="mr-1 animate-spin" />
                ) : (
                  <RefreshCw size={16} />
                )}
                Retry
              </Button>
            )}
          </div>
        )}

        {/* PromoMessage temporarily disabled per branding request */}
        
        {/* 🤖 Applaa Buddy - Personal AI Robot Widget - DISABLED FOR TESTING */}
        {/* {messages.length > 0 && (
          <ApplaaBuddyWidget
            appCode={getLatestAppCode(messages)}
            appType={getAppType(appId)}
            userPrompt={getLatestUserPrompt(messages)}
            onSuggestionAccept={(suggestion) => {
              console.log('🤖 Buddy suggestion accepted:', suggestion);
              // TODO: Apply suggestion to the app
            }}
            onSuggestionReject={(suggestion) => {
              console.log('🤖 Buddy suggestion rejected:', suggestion);
            }}
          />
        )} */}
        
        <div ref={messagesEndRef} />
      </div>
    );
  },
);
