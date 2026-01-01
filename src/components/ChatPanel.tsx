import { useState, useRef, useEffect, useCallback } from "react";
import { useAtom, useAtomValue } from "jotai";
import { chatMessagesAtom, chatStreamCountAtom, isStreamingAtom } from "../atoms/chatAtoms";
import { IpcClient } from "@/ipc/ipc_client";

import { ChatHeader } from "./chat/ChatHeader";
import { MessagesList } from "./chat/MessagesList";
import { ChatInput } from "./chat/ChatInput";
import { VersionPane } from "./chat/VersionPane";
import { ChatError } from "./chat/ChatError";

interface ChatPanelProps {
  chatId?: number;
}

export function ChatPanel({
  chatId,
}: ChatPanelProps) {
  const [messages, setMessages] = useAtom(chatMessagesAtom);
  
  // 🚨 CRITICAL: Check if streaming to prevent race conditions
  const isStreaming = useAtomValue(isStreamingAtom);
  

  const [isVersionPaneOpen, setIsVersionPaneOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamCount = useAtomValue(chatStreamCountAtom);
  // Reference to store the processed prompt so we don't submit it twice

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  // Scroll-related properties
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const userScrollTimeoutRef = useRef<number | null>(null);
  const lastScrollTopRef = useRef<number>(0);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const handleScroll = () => {
    if (!messagesContainerRef.current) return;

    const container = messagesContainerRef.current;
    const currentScrollTop = container.scrollTop;

    if (currentScrollTop < lastScrollTopRef.current) {
      setIsUserScrolling(true);

      if (userScrollTimeoutRef.current) {
        window.clearTimeout(userScrollTimeoutRef.current);
      }

      userScrollTimeoutRef.current = window.setTimeout(() => {
        setIsUserScrolling(false);
      }, 1000);
    }

    lastScrollTopRef.current = currentScrollTop;
  };

  useEffect(() => {
    console.log("streamCount", streamCount);
    scrollToBottom();
  }, [streamCount]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll, { passive: true });
    }

    return () => {
      if (container) {
        container.removeEventListener("scroll", handleScroll);
      }
      if (userScrollTimeoutRef.current) {
        window.clearTimeout(userScrollTimeoutRef.current);
      }
    };
  }, []);

  // 🚨 DYAD PATTERN: Simple message fetching with minimal dependencies
  // Only fetch when chatId changes, NOT when isStreaming changes
  useEffect(() => {
    if (!chatId) {
      console.log(`📋 ChatPanel: Clearing messages (no chatId)`);
      setMessages([]);
      return;
    }
    
    // Only fetch if not currently streaming
    // This prevents overwriting live stream updates with stale DB data
    if (!isStreaming) {
      console.log(`📋 ChatPanel: Fetching messages for chatId: ${chatId}`);
      IpcClient.getInstance()
        .getChat(chatId)
        .then(chat => {
          console.log(`📋 ChatPanel: Loaded ${chat.messages.length} messages`);
          setMessages(chat.messages);
        })
        .catch(error => {
          console.error(`📋 ChatPanel: Failed to fetch messages:`, error);
          setMessages([]);
        });
    } else {
      console.log(`📋 ChatPanel: Skipping fetch (stream in progress)`);
    }
  }, [chatId, isStreaming]); // ✅ DYAD PATTERN: Simple dependencies, no useCallback

  // Auto-scroll effect when messages change
  useEffect(() => {
    if (
      !isUserScrolling &&
      messagesContainerRef.current &&
      messages.length > 0
    ) {
      const { scrollTop, clientHeight, scrollHeight } =
        messagesContainerRef.current;
      const threshold = 280;
      const isNearBottom =
        scrollHeight - (scrollTop + clientHeight) <= threshold;

      if (isNearBottom) {
        requestAnimationFrame(() => {
          scrollToBottom("instant");
        });
      }
    }
  }, [messages, isUserScrolling]);

  return (
    <div className="flex flex-col h-full">
      <ChatHeader
        isVersionPaneOpen={isVersionPaneOpen}
        onVersionClick={() => setIsVersionPaneOpen(!isVersionPaneOpen)}
      />
      <div className="flex flex-1 overflow-hidden">
        {!isVersionPaneOpen && (
          <div className="flex-1 flex flex-col min-w-0">
            <MessagesList
              messages={messages}
              messagesEndRef={messagesEndRef}
              ref={messagesContainerRef}
              chatId={chatId}
            />
            <ChatError error={error} onDismiss={() => setError(null)} />
            <ChatInput chatId={chatId} />
          </div>
        )}
        <VersionPane
          isVisible={isVersionPaneOpen}
          onClose={() => setIsVersionPaneOpen(false)}
        />
      </div>
    </div>
  );
}
