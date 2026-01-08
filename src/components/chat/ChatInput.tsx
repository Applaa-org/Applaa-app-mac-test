import {
  StopCircleIcon,
  X,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  AlertOctagon,
  FileText,
  Check,
  Loader2,
  Package,
  FileX,
  SendToBack,
  Database,
  ChevronsUpDown,
  ChevronsDownUp,
  ChartColumnIncreasing,
  SendHorizontalIcon,
  Zap,
  Mic,
  MicOff,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { useSearch, useNavigate } from "@tanstack/react-router";
import { aiBlockAssistant } from '@/services/AiBlockAssistant'; // Brain Import

import { useSettings } from "@/hooks/useSettings";
import { IpcClient } from "@/ipc/ipc_client";
import { useChatContext } from "@/contexts/ChatContext";
import {
  chatInputValueAtom,
  chatMessagesAtom,
  selectedChatIdAtom,
} from "@/atoms/chatAtoms";
import { atom, useAtom, useSetAtom, useAtomValue } from "jotai";
import { useStreamChat } from "@/hooks/useStreamChat";
import { selectedAppIdAtom } from "@/atoms/appAtoms";
import { Button } from "@/components/ui/button";
import { useProposal } from "@/hooks/useProposal";
import {
  ActionProposal,
  Proposal,
  SuggestedAction,
  FileChange,
  SqlQuery,
} from "@/lib/schemas";
import type { Message, ComponentSelection } from "@/ipc/ipc_types";
import { isPreviewOpenAtom } from "@/atoms/viewAtoms";
import { useRunApp } from "@/hooks/useRunApp";
import { AutoApproveSwitch } from "../AutoApproveSwitch";
import { usePostHog } from "posthog-js/react";
import { CodeHighlight } from "./CodeHighlight";
import { TokenBar } from "./TokenBar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
// import { useNavigate } from "@tanstack/react-router"; // Combined above
import { useVersions } from "@/hooks/useVersions";
import { useAttachments } from "@/hooks/useAttachments";
import { AttachmentsList } from "./AttachmentsList";
import { DragDropOverlay } from "./DragDropOverlay";
import { FileAttachmentDropdown } from "./FileAttachmentDropdown";
import { showError as toastError, showExtraFilesToast } from "@/lib/toast";
import { ChatInputControls } from "../ChatInputControls";
import { ChatErrorBox } from "./ChatErrorBox";
import { selectedComponentPreviewAtom } from "@/atoms/previewAtoms";
import { SelectedComponentDisplay } from "./SelectedComponentDisplay";
// Prompt optimization imports removed for app-specific chat
import { useCheckProblems } from "@/hooks/useCheckProblems";
import { LexicalChatInput } from "./LexicalChatInput";
import { useGeminiSpeech } from "@/hooks/useGeminiSpeech";
// Voice input removed for MVP performance optimization

const showTokenBarAtom = atom(false);

export function ChatInput({ chatId }: { chatId?: number }) {
  const { isBlockChat } = useChatContext();
  const posthog = usePostHog();
  const [inputValue, setInputValue] = useAtom(chatInputValueAtom);
  const { settings } = useSettings();
  const appId = useAtomValue(selectedAppIdAtom);
  const { refreshVersions } = useVersions(appId);
  const { streamMessage, isStreaming, error, setError } =
    useStreamChat({ hasChatId: !isBlockChat });
  const [isErrorVisible, setIsErrorVisible] = useState(true);
  const [isApproving, setIsApproving] = useState(false); // State for approving
  const [isRejecting, setIsRejecting] = useState(false); // State for rejecting
  const [, setMessages] = useAtom<Message[]>(chatMessagesAtom);
  const setIsPreviewOpen = useSetAtom(isPreviewOpenAtom);
  const [showTokenBar, setShowTokenBar] = useAtom(showTokenBarAtom);
  const [selectedComponent, setLocalSelectedComponent] = useAtom(selectedComponentPreviewAtom);
  const { checkProblems } = useCheckProblems(appId);

  // Input history for error recovery
  const [inputHistory, setInputHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const {
    isListening,
    isProcessing: isProcessingVoice,
    toggleListening
  } = useGeminiSpeech({
    onTranscript: (text) => {
      setInputValue(inputValue + (inputValue && !inputValue.endsWith(" ") ? " " : "") + text);
    }
  });

  // Prompt optimization disabled for app-specific chat
  // Only available in main home chat input

  // Voice input removed for MVP performance optimization

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

  // Use the hook to fetch the proposal
  const {
    proposalResult,
    isLoading: isProposalLoading,
    error: proposalError,
    refreshProposal: runRefreshProposal,
  } = useProposal(chatId);
  const { proposal, messageId } = proposalResult ?? {};

  // Handle keyboard navigation for input history
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'ArrowUp' && !event.shiftKey && inputHistory.length > 0) {
      event.preventDefault();
      const newIndex = Math.min(historyIndex + 1, inputHistory.length - 1);
      setHistoryIndex(newIndex);
      setInputValue(inputHistory[newIndex] || '');
    } else if (event.key === 'ArrowDown' && !event.shiftKey) {
      event.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInputValue(inputHistory[newIndex] || '');
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInputValue('');
      }
    }
  }, [inputHistory, historyIndex, setInputValue]);

  // 🚨 REMOVED: Don't fetch messages here - ChatPanel handles this
  // Duplicate fetching causes race conditions with streaming updates

  useEffect(() => {
    if (error) {
      setIsErrorVisible(true);
    }
  }, [error]);

  // Prompt optimization handlers removed for app-specific chat

  // Voice input disabled for MVP

  const handleSubmit = async () => {
    // 🧠 APPY CHAT INTERCEPTION
    if (isBlockChat) {
      if (!inputValue.trim()) return;

      const userMsg: Message = {
        id: Date.now(),
        role: 'user',
        content: inputValue,
        created_at: new Date().toISOString()
      };

      // 1. Add User Message immediately
      setMessages(prev => [...prev, userMsg]);
      setInputValue("");

      try {
        // 2. Ask Appy Brain
        const response = await aiBlockAssistant.processMessage(userMsg.content);

        // 3. Add Appy Response
        const appyMsg: Message = {
          id: Date.now() + 1,
          role: 'assistant',
          content: response.text,
          created_at: new Date().toISOString()
        };

        // Simulate "typing" delay or just push
        setTimeout(() => {
          setMessages(prev => [...prev, appyMsg]);
        }, 500);

      } catch (e) {
        console.error("Appy Brain Error:", e);
      }
      return; // STOP EXECUTION HERE for Block Chat
    }

    console.log("🚀 ChatInput handleSubmit called", { inputValue, chatId, isStreaming, attachments });

    if (
      (!inputValue.trim() && attachments.length === 0) ||
      isStreaming ||
      !chatId
    ) {
      console.log("❌ Submit blocked:", {
        noInput: !inputValue.trim() && attachments.length === 0,
        isStreaming,
        noChatId: !chatId
      });
      return;
    }

    const currentInput = inputValue;
    // Don't clear input immediately - wait for stream to start successfully
    (setLocalSelectedComponent as (val: ComponentSelection | null) => void)(null);

    try {
      console.log("📤 Sending message:", { prompt: currentInput, chatId, attachments: attachments.length });

      // Send message with attachments and clear them after sending
      await streamMessage({
        prompt: currentInput,
        chatId,
        attachments,
        redo: false,
        selectedComponent,
      });

      console.log("✅ Message sent successfully");

      // Only clear input and attachments if stream started successfully
      // Add to history before clearing
      if (currentInput.trim()) {
        setInputHistory(prev => {
          const newHistory = [currentInput, ...prev.filter(item => item !== currentInput)];
          return newHistory.slice(0, 50); // Keep last 50 messages
        });
        setHistoryIndex(-1);
      }

      setInputValue("");
      clearAttachments();
      posthog.capture("chat:submit");
    } catch (error) {
      console.error("❌ Failed to start chat stream:", error);
      // Don't clear input on error - user can retry
      toastError(`Failed to send message: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleCancel = () => {
    if (chatId) {
      IpcClient.getInstance().cancelChatStream(chatId);
    }
    // 🚨 DYAD PATTERN: Don't manually set isStreaming here!
    // The onEnd/onError callbacks in useStreamChat will handle it
    // This prevents race conditions and state corruption
  };

  const dismissError = () => {
    setIsErrorVisible(false);
  };

  const handleApprove = async () => {
    if (!chatId || !messageId || isApproving || isRejecting || isStreaming)
      return;
    console.log(
      `Approving proposal for chatId: ${chatId}, messageId: ${messageId}`,
    );
    setIsApproving(true);
    posthog.capture("chat:approve");
    try {
      const result = await IpcClient.getInstance().approveProposal({
        chatId,
        messageId,
      });
      if (result.extraFiles) {
        showExtraFilesToast({
          files: result.extraFiles,
          error: result.extraFilesError,
          posthog,
        });
      }
    } catch (err) {
      console.error("Error approving proposal:", err);
      setError((err as Error)?.message || "An error occurred while approving");
    } finally {
      setIsApproving(false);
      setIsPreviewOpen(true);
      refreshVersions();
      if (settings?.enableAutoFixProblems) {
        checkProblems();
      }

      // Keep same as handleReject
      runRefreshProposal();
      (setLocalSelectedComponent as (val: ComponentSelection | null) => void)(null); // Clear selected component after approval
      // fetchChatMessages() removed - ChatPanel handles polling/refresh via useProposal
    }
  };

  const handleReject = async () => {
    if (!chatId || !messageId || isApproving || isRejecting || isStreaming)
      return;
    console.log(
      `Rejecting proposal for chatId: ${chatId}, messageId: ${messageId}`,
    );
    setIsRejecting(true);
    posthog.capture("chat:reject");
    try {
      await IpcClient.getInstance().rejectProposal({
        chatId,
        messageId,
      });
    } catch (err) {
      console.error("Error rejecting proposal:", err);
      setError((err as Error)?.message || "An error occurred while rejecting");
    } finally {
      setIsRejecting(false);

      // Keep same as handleApprove
      runRefreshProposal();
      (setLocalSelectedComponent as (val: ComponentSelection | null) => void)(null); // Clear selected component after rejection
      // fetchChatMessages() removed - ChatPanel handles polling/refresh via useProposal
    }
  };

  if (!settings) {
    return null; // Or loading state
  }

  return (
    <>
      {error && isErrorVisible && (
        <ChatErrorBox
          onDismiss={dismissError}
          error={error}
          isDyadProEnabled={settings.enableApplaaPro ?? false}
        />
      )}
      {/* Display loading or error state for proposal */}
      {isProposalLoading && (
        <div className="p-4 text-sm text-muted-foreground">
          Loading proposal...
        </div>
      )}
      {proposalError && (
        <div className="p-4 text-sm text-red-600">
          Error loading proposal: {proposalError}
        </div>
      )}
      <div className="p-4" data-testid="chat-input-container">
        <div
          className={`relative flex flex-col border border-border rounded-lg bg-(--background-lighter) shadow-sm ${isDraggingOver ? "ring-2 ring-blue-500 border-blue-500" : ""
            }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Only render ChatInputActions if proposal is loaded */}
          {proposal &&
            proposalResult?.chatId === chatId &&
            settings.selectedChatMode !== "ask" && (
              <ChatInputActions
                proposal={proposal}
                onApprove={handleApprove}
                onReject={handleReject}
                chatId={chatId}
                isApprovable={
                  !isProposalLoading &&
                  !!proposal &&
                  !!messageId &&
                  !isApproving &&
                  !isRejecting &&
                  !isStreaming
                }
                isApproving={isApproving}
                isRejecting={isRejecting}
              />
            )}

          <SelectedComponentDisplay />

          {/* Use the AttachmentsList component */}
          <AttachmentsList
            attachments={attachments}
            onRemove={removeAttachment}
          />

          {/* Use the DragDropOverlay component */}
          <DragDropOverlay isDraggingOver={isDraggingOver} />

          <div className="flex items-start space-x-2 ">
            <LexicalChatInput
              value={inputValue}
              onChange={setInputValue}
              onSubmit={handleSubmit}
              onPaste={handlePaste}
              onKeyDown={handleKeyDown}
              placeholder={isListening ? "Listening..." : isProcessingVoice ? "Transcribing..." : "Ask Applaa to build..."}
              excludeCurrentApp={false}
              disabled={isStreaming || isProcessingVoice}
            />

            <div className="flex items-center gap-1">
              <button
                onClick={toggleListening}
                disabled={isStreaming || isProcessingVoice}
                className={`px-2 py-2 mt-1 mr-1 rounded-lg transition-colors ${isListening ? "text-red-500 bg-red-50" : "text-(--sidebar-accent-fg) hover:bg-(--background-darkest)"
                  }`}
                title={isListening ? "Stop listening" : "Start voice input"}
              >
                {isProcessingVoice ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isListening ? (
                  <Mic className="w-4 h-4" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>

              {/* Send/Cancel button */}
              {isStreaming ? (
                <button
                  onClick={handleCancel}
                  className="px-2 py-2 mt-1 mr-1 hover:bg-(--background-darkest) text-(--sidebar-accent-fg) rounded-lg"
                  title="Cancel generation"
                >
                  <StopCircleIcon size={20} />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!inputValue.trim() && attachments.length === 0}
                  className="px-2 py-2 mt-1 mr-1 hover:bg-(--background-darkest) text-green-500 rounded-lg disabled:opacity-50"
                  title="Send message"
                >
                  <SendHorizontalIcon size={20} />
                </button>
              )}
            </div>
          </div>
          {/* Controls moved below the input */}
          <div className="pt-2 pb-2 border-t border-border">
            <div className="px-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ChatInputControls
                  showContextFilesPicker={true}
                  showImportButton={false}
                  showPlatformSelector={false}
                  inputValue={inputValue}
                  onInputChange={setInputValue}
                  disabled={isStreaming}
                />
                {/* File attachment dropdown */}
                <FileAttachmentDropdown
                  onFileSelect={handleFileSelect}
                  disabled={isStreaming}
                />
              </div>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={() => setShowTokenBar(!showTokenBar)}
                      variant="ghost"
                      className={`has-[>svg]:px-2 ${showTokenBar ? "text-purple-500 bg-purple-100" : ""
                        }`}
                      size="sm"
                    >
                      <ChartColumnIncreasing size={14} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {showTokenBar ? "Hide token usage" : "Show token usage"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          {/* TokenBar is only displayed when showTokenBar is true */}
          {showTokenBar && <TokenBar chatId={chatId} />}

          {/* Voice input disabled for MVP: no status/error UI */}
        </div>
      </div>
    </>
  );
}

function SuggestionButton({
  children,
  onClick,
  tooltipText,
}: {
  onClick: () => void;
  children: React.ReactNode;
  tooltipText: string;
}) {
  const { isStreaming } = useStreamChat();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          disabled={isStreaming}
          variant="outline"
          size="sm"
          onClick={onClick}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{tooltipText}</TooltipContent>
    </Tooltip>
  );
}

function SummarizeInNewChatButton() {
  const { isBlockChat } = useChatContext();
  const search = useSearch({ from: "/chat" });
  const chatId = useAtomValue(selectedChatIdAtom);
  const appId = useAtomValue(selectedAppIdAtom);
  const { streamMessage } = useStreamChat({ hasChatId: !isBlockChat });

  // Try to get navigate, but it might fail in BlockChat context
  let navigate: ReturnType<typeof useNavigate> | null = null;
  try {
    navigate = useNavigate();
  } catch (e) {
    // Not in a valid route context (e.g., BlockChat), navigation won't work
    console.log("Navigation not available in this context");
  }

  const onClick = async () => {
    if (!appId) {
      console.error("No app id found");
      return;
    }
    try {
      const newChatId = await IpcClient.getInstance().createChat(appId);
      // navigate to new chat (if navigation is available)
      if (navigate) {
        try {
          await navigate({ to: "/chat", search: { ...search, id: newChatId } as any });
        } catch (e) {
          // Navigation might fail in BlockChat context, that's ok
          console.log("Navigation skipped in BlockChat context");
        }
      }
      await streamMessage({
        prompt: "Summarize from chat-id=" + chatId,
        chatId: newChatId,
      });
    } catch (err) {
      toastError(err instanceof Error ? err.message : String(err));
    }
  };
  return (
    <SuggestionButton
      onClick={onClick}
      tooltipText="Creating a new chat makes the AI more focused and efficient"
    >
      Summarize to new chat
    </SuggestionButton>
  );
}

function RefactorFileButton({ path }: { path: string }) {
  const { isBlockChat } = useChatContext();
  const chatId = useAtomValue(selectedChatIdAtom);
  const { streamMessage } = useStreamChat({ hasChatId: !isBlockChat });
  const onClick = () => {
    if (!chatId) {
      console.error("No chat id found");
      return;
    }
    streamMessage({
      prompt: `Refactor ${path} and make it more modular`,
      chatId,
      redo: false,
    });
  };
  return (
    <SuggestionButton
      onClick={onClick}
      tooltipText="Refactor the file to improve maintainability"
    >
      <span className="max-w-[180px] overflow-hidden whitespace-nowrap text-ellipsis">
        Refactor {path.split("/").slice(-2).join("/")}
      </span>
    </SuggestionButton>
  );
}

function WriteCodeProperlyButton() {
  const chatId = useAtomValue(selectedChatIdAtom);
  const { streamMessage } = useStreamChat();
  const onClick = () => {
    if (!chatId) {
      console.error("No chat id found");
      return;
    }
    streamMessage({
      prompt: `Write the code in the previous message in the correct format using \`<applaa-write>\` tags!`,
      chatId,
      redo: false,
    });
  };
  return (
    <SuggestionButton
      onClick={onClick}
      tooltipText="Write code properly (useful when AI generates the code in the wrong format)"
    >
      Write code properly
    </SuggestionButton>
  );
}

function RebuildButton() {
  const { restartApp } = useRunApp();
  const posthog = usePostHog();
  const selectedAppId = useAtomValue(selectedAppIdAtom);

  const onClick = useCallback(async () => {
    if (!selectedAppId) return;

    posthog.capture("action:rebuild");
    await restartApp({ removeNodeModules: true });
  }, [selectedAppId, posthog, restartApp]);

  return (
    <SuggestionButton onClick={onClick} tooltipText="Rebuild the application">
      Rebuild app
    </SuggestionButton>
  );
}

function RestartButton() {
  const { restartApp } = useRunApp();
  const posthog = usePostHog();
  const selectedAppId = useAtomValue(selectedAppIdAtom);

  const onClick = useCallback(async () => {
    if (!selectedAppId) return;

    posthog.capture("action:restart");
    await restartApp();
  }, [selectedAppId, posthog, restartApp]);

  return (
    <SuggestionButton
      onClick={onClick}
      tooltipText="Restart the development server"
    >
      Restart app
    </SuggestionButton>
  );
}

function RefreshButton() {
  const { refreshAppIframe } = useRunApp();
  const posthog = usePostHog();

  const onClick = useCallback(() => {
    posthog.capture("action:refresh");
    refreshAppIframe();
  }, [posthog, refreshAppIframe]);

  return (
    <SuggestionButton
      onClick={onClick}
      tooltipText="Refresh the application preview"
    >
      Refresh app
    </SuggestionButton>
  );
}

function BoostMyAppButton({ chatId }: { chatId?: number }) {
  const { streamMessage } = useStreamChat();
  const posthog = usePostHog();

  const onClick = useCallback(async () => {
    if (!chatId) {
      console.error("No chat id found for Boost My App");
      return;
    }

    console.log(`🚀 Boost My App clicked for chatId: ${chatId}`);
    posthog.capture("action:boost-my-app");

    // Enhanced prompt with UI improvement focus
    const boostPrompt = `🚀 BOOST MY APP: Apply premium design enhancements to this application:

🎨 **VISUAL ENHANCEMENTS:**
- Add modern gradients and premium color schemes
- Implement glassmorphism effects and subtle shadows
- Enhance typography with proper font weights and hierarchy
- Add micro-animations and smooth transitions
- Improve card designs with rounded corners and better spacing

💎 **INTERACTIVE IMPROVEMENTS:**
- Add hover effects and touch feedback
- Implement loading states and skeleton screens
- Enhance navigation with badges and meaningful icons
- Add pull-to-refresh and smooth page transitions
- Improve form interactions with real-time validation

📱 **USER EXPERIENCE:**
- Optimize for mobile-first responsive design
- Add engaging empty states and error handling
- Implement search functionality with live filtering
- Add more realistic mock data (8-12 items per section)
- Enhance accessibility with proper contrast and ARIA labels

Continue building on what's already there while applying these premium design patterns.`;

    try {
      await streamMessage({
        prompt: boostPrompt,
        chatId,
        redo: false,
      });
    } catch (error) {
      console.error("Failed to boost app:", error);
    }
  }, [chatId, streamMessage, posthog]);

  return (
    <SuggestionButton
      onClick={onClick}
      tooltipText="Continue improving your app with more features"
    >
      <Zap size={16} className="mr-1" />
      Boost My App
    </SuggestionButton>
  );
}

function RetryButton({ chatId }: { chatId?: number }) {
  const { streamMessage } = useStreamChat();

  const onClick = () => {
    if (!chatId) {
      console.error("No chat id found for Retry");
      return;
    }
    console.log(`Retry clicked for chatId: ${chatId}`);
    streamMessage({
      prompt: "", // Empty prompt for retry - will use last message
      chatId,
      redo: true, // This is the key for retry functionality
    });
  };

  return (
    <SuggestionButton onClick={onClick} tooltipText="Retry the last message">
      Retry
    </SuggestionButton>
  );
}

function mapActionToButton(action: SuggestedAction, chatId?: number) {
  switch (action.id) {
    case "summarize-in-new-chat":
      return <SummarizeInNewChatButton />;
    case "refactor-file":
      return <RefactorFileButton path={action.path} />;
    case "write-code-properly":
      return <WriteCodeProperlyButton />;
    case "rebuild":
      return <RebuildButton />;
    case "restart":
      return <RestartButton />;
    case "refresh":
      return <RefreshButton />;
    case "keep-going":
      return <BoostMyAppButton chatId={chatId} />;
    case "retry":
      return <RetryButton chatId={chatId} />;
    default:
      console.error(`Unsupported action: ${action.id}`);
      return (
        <Button variant="outline" size="sm" disabled key={action.id}>
          Unsupported: {action.id}
        </Button>
      );
  }
}

function ActionProposalActions({ proposal, chatId }: { proposal: ActionProposal; chatId?: number }) {
  return (
    <div className="border-b border-border p-2 pb-0 flex items-center justify-between">
      <div className="flex items-center space-x-2 overflow-x-auto pb-2">
        {proposal.actions.map((action) => (
          <span key={action.id}>{mapActionToButton(action, chatId)}</span>
        ))}
      </div>
    </div>
  );
}

interface ChatInputActionsProps {
  proposal: Proposal;
  onApprove: () => void;
  onReject: () => void;
  isApprovable: boolean; // Can be used to enable/disable buttons
  isApproving: boolean; // State for approving
  isRejecting: boolean; // State for rejecting
  chatId?: number; // Chat ID for proper isolation
}

// Update ChatInputActions to accept props
function ChatInputActions({
  proposal,
  onApprove,
  onReject,
  isApprovable,
  isApproving,
  isRejecting,
  chatId,
}: ChatInputActionsProps) {
  const [isDetailsVisible, setIsDetailsVisible] = useState(false);

  if (proposal.type === "tip-proposal") {
    return <div>Tip proposal</div>;
  }
  if (proposal.type === "action-proposal") {
    return <ActionProposalActions proposal={proposal} chatId={chatId}></ActionProposalActions>;
  }

  // Split files into server functions and other files - only for CodeProposal
  const serverFunctions =
    proposal.filesChanged?.filter((f: FileChange) => f.isServerFunction) ?? [];
  const otherFilesChanged =
    proposal.filesChanged?.filter((f: FileChange) => !f.isServerFunction) ?? [];

  function formatTitle({
    title,
    isDetailsVisible,
  }: {
    title: string;
    isDetailsVisible: boolean;
  }) {
    if (isDetailsVisible) {
      return title;
    }
    return title.slice(0, 60) + "...";
  }

  return (
    <div className="border-b border-border">
      <div className="p-2">
        {/* Row 1: Title, Expand Icon, and Security Chip */}
        <div className="flex items-center gap-2 mb-1">
          <button
            className="flex flex-col text-left text-sm hover:bg-muted p-1 rounded justify-start w-full"
            onClick={() => setIsDetailsVisible(!isDetailsVisible)}
          >
            <div className="flex items-center">
              {isDetailsVisible ? (
                <ChevronUp size={16} className="mr-1 flex-shrink-0" />
              ) : (
                <ChevronDown size={16} className="mr-1 flex-shrink-0" />
              )}
              <span className="font-medium">
                {formatTitle({ title: proposal.title, isDetailsVisible })}
              </span>
            </div>
            <div className="text-xs text-muted-foreground ml-6">
              <ProposalSummary
                sqlQueries={proposal.sqlQueries}
                serverFunctions={serverFunctions}
                packagesAdded={proposal.packagesAdded}
                filesChanged={otherFilesChanged}
              />
            </div>
          </button>
          {proposal.securityRisks.length > 0 && (
            <span className="bg-red-100 text-red-700 text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0">
              Security risks found
            </span>
          )}
        </div>

        {/* Row 2: Buttons and Toggle */}
        <div className="flex items-center justify-start space-x-2">
          <Button
            className="px-8"
            size="sm"
            variant="outline"
            onClick={onApprove}
            disabled={!isApprovable || isApproving || isRejecting}
            data-testid="approve-proposal-button"
          >
            {isApproving ? (
              <Loader2 size={16} className="mr-1 animate-spin" />
            ) : (
              <Check size={16} className="mr-1" />
            )}
            Approve
          </Button>
          <Button
            className="px-8"
            size="sm"
            variant="outline"
            onClick={onReject}
            disabled={!isApprovable || isApproving || isRejecting}
            data-testid="reject-proposal-button"
          >
            {isRejecting ? (
              <Loader2 size={16} className="mr-1 animate-spin" />
            ) : (
              <X size={16} className="mr-1" />
            )}
            Reject
          </Button>
          <div className="flex items-center space-x-1 ml-auto">
            <AutoApproveSwitch />
          </div>
        </div>
      </div>

      <div className="overflow-y-auto max-h-[calc(100vh-300px)]">
        {isDetailsVisible && (
          <div className="p-3 border-t border-border bg-muted/50 text-sm">
            {!!proposal.securityRisks.length && (
              <div className="mb-3">
                <h4 className="font-semibold mb-1">Security Risks</h4>
                <ul className="space-y-1">
                  {proposal.securityRisks.map((risk, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      {risk.type === "warning" ? (
                        <AlertTriangle
                          size={16}
                          className="text-yellow-500 mt-0.5 flex-shrink-0"
                        />
                      ) : (
                        <AlertOctagon
                          size={16}
                          className="text-red-500 mt-0.5 flex-shrink-0"
                        />
                      )}
                      <div>
                        <span className="font-medium">{risk.title}:</span>{" "}
                        <span>{risk.description}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {proposal.sqlQueries?.length > 0 && (
              <div className="mb-3">
                <h4 className="font-semibold mb-1">SQL Queries</h4>
                <ul className="space-y-2">
                  {proposal.sqlQueries.map((query, index) => (
                    <SqlQueryItem key={index} query={query} />
                  ))}
                </ul>
              </div>
            )}

            {proposal.packagesAdded?.length > 0 && (
              <div className="mb-3">
                <h4 className="font-semibold mb-1">Packages Added</h4>
                <ul className="space-y-1">
                  {proposal.packagesAdded.map((pkg, index) => (
                    <li
                      key={index}
                      className="flex items-center space-x-2"
                      onClick={() => {
                        IpcClient.getInstance().openExternalUrl(
                          `https://www.npmjs.com/package/${pkg}`,
                        );
                      }}
                    >
                      <Package
                        size={16}
                        className="text-muted-foreground flex-shrink-0"
                      />
                      <span className="cursor-pointer text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                        {pkg}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {serverFunctions.length > 0 && (
              <div className="mb-3">
                <h4 className="font-semibold mb-1">Server Functions Changed</h4>
                <ul className="space-y-1">
                  {serverFunctions.map((file: FileChange, index: number) => (
                    <li key={index} className="flex items-center space-x-2">
                      {getIconForFileChange(file)}
                      <span
                        title={file.path}
                        className="truncate cursor-default"
                      >
                        {file.name}
                      </span>
                      <span className="text-muted-foreground text-xs truncate">
                        - {file.summary}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {otherFilesChanged.length > 0 && (
              <div>
                <h4 className="font-semibold mb-1">Files Changed</h4>
                <ul className="space-y-1">
                  {otherFilesChanged.map((file: FileChange, index: number) => (
                    <li key={index} className="flex items-center space-x-2">
                      {getIconForFileChange(file)}
                      <span
                        title={file.path}
                        className="truncate cursor-default"
                      >
                        {file.name}
                      </span>
                      <span className="text-muted-foreground text-xs truncate">
                        - {file.summary}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function getIconForFileChange(file: FileChange) {
  switch (file.type) {
    case "write":
      return (
        <FileText size={16} className="text-muted-foreground flex-shrink-0" />
      );
    case "rename":
      return (
        <SendToBack size={16} className="text-muted-foreground flex-shrink-0" />
      );
    case "delete":
      return (
        <FileX size={16} className="text-muted-foreground flex-shrink-0" />
      );
  }
}

// Proposal summary component to show counts of changes
function ProposalSummary({
  sqlQueries = [],
  serverFunctions = [],
  packagesAdded = [],
  filesChanged = [],
}: {
  sqlQueries?: Array<SqlQuery>;
  serverFunctions?: FileChange[];
  packagesAdded?: string[];
  filesChanged?: FileChange[];
}) {
  // If no changes, show a simple message
  if (
    !sqlQueries.length &&
    !serverFunctions.length &&
    !packagesAdded.length &&
    !filesChanged.length
  ) {
    return <span>No changes</span>;
  }

  // Build parts array with only the segments that have content
  const parts: string[] = [];

  if (sqlQueries.length) {
    parts.push(
      `${sqlQueries.length} SQL ${sqlQueries.length === 1 ? "query" : "queries"
      }`,
    );
  }

  if (serverFunctions.length) {
    parts.push(
      `${serverFunctions.length} Server ${serverFunctions.length === 1 ? "Function" : "Functions"
      }`,
    );
  }

  if (packagesAdded.length) {
    parts.push(
      `${packagesAdded.length} ${packagesAdded.length === 1 ? "package" : "packages"
      }`,
    );
  }

  if (filesChanged.length) {
    parts.push(
      `${filesChanged.length} ${filesChanged.length === 1 ? "file" : "files"}`,
    );
  }

  // Join all parts with separator
  return <span>{parts.join(" | ")}</span>;
}

// SQL Query item with expandable functionality
function SqlQueryItem({ query }: { query: SqlQuery }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const queryContent = query.content;
  const queryDescription = query.description;

  return (
    <li
      className="bg-(--background-lightest) hover:bg-(--background-lighter) rounded-lg px-3 py-2 border border-border cursor-pointer"
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database size={16} className="text-muted-foreground flex-shrink-0" />
          <span className="text-sm font-medium">
            {queryDescription || "SQL Query"}
          </span>
        </div>
        <div>
          {isExpanded ? (
            <ChevronsDownUp size={18} className="text-muted-foreground" />
          ) : (
            <ChevronsUpDown size={18} className="text-muted-foreground" />
          )}
        </div>
      </div>
      {isExpanded && (
        <div className="mt-2 text-xs max-h-[200px] overflow-auto">
          <CodeHighlight className="language-sql ">
            {queryContent}
          </CodeHighlight>
        </div>
      )}
    </li>
  );
}
