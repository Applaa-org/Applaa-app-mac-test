import { useState, useRef, useEffect } from "react";
import { useAtom } from "jotai";
import { chatMessagesAtom } from "@/atoms/chatAtoms";
import { MessagesList } from "./chat/MessagesList";
import { ChatInput } from "./chat/ChatInput";
import { ChatError } from "./chat/ChatError";
import { ChatContextProvider } from "@/contexts/ChatContext";

interface BlockChatPanelProps {
    chatId: number;
}

/**
 * Simplified ChatPanel for BlockChat - without ChatHeader to avoid routing issues
 */
export function BlockChatPanel({ chatId }: BlockChatPanelProps) {
    const [messages] = useAtom(chatMessagesAtom);
    const [error, setError] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const messagesContainerRef = useRef<HTMLDivElement | null>(null);
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

        // User scrolled up
        if (currentScrollTop < lastScrollTopRef.current) {
            setIsUserScrolling(true);

            // Clear existing timeout
            if (userScrollTimeoutRef.current) {
                window.clearTimeout(userScrollTimeoutRef.current);
            }

            // Set new timeout
            userScrollTimeoutRef.current = window.setTimeout(() => {
                setIsUserScrolling(false);
            }, 2000);
        }

        lastScrollTopRef.current = currentScrollTop;
    };

    // Auto-scroll on new messages (unless user is scrolling)
    useEffect(() => {
        if (!isUserScrolling && messages.length > 0) {
            // Use setTimeout to ensure DOM has updated
            setTimeout(() => {
                scrollToBottom("instant");
            });
        }
    }, [messages, isUserScrolling]);

    return (
        <ChatContextProvider value={{ isBlockChat: true }}>
            <div className="flex flex-col h-full">
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
            </div>
        </ChatContextProvider>
    );
}
