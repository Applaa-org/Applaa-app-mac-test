import React, { useEffect, useState } from 'react';
import { X, Minimize2, Maximize2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BlockChatPanel } from '@/components/BlockChatPanel';
import { useChats } from '@/hooks/useChats';
import { IpcClient } from '@/ipc/ipc_client';
import { toast } from 'sonner';
import { useSetAtom } from 'jotai';
import { chatMessagesAtom } from '@/atoms/chatAtoms';

interface BlockChatProps {
    appId: number;
    isOpen: boolean;
    onClose: () => void;
}

export function BlockChat({ appId, isOpen, onClose }: BlockChatProps) {
    const [isMinimized, setIsMinimized] = useState(false);
    const { chats, refreshChats } = useChats(appId);
    const [activeChatId, setActiveChatId] = useState<number | null>(null);
    const [isCreatingChat, setIsCreatingChat] = useState(false);
    const setMessages = useSetAtom(chatMessagesAtom);

    // Auto-select or create chat
    useEffect(() => {
        const initChat = async () => {
            if (!isOpen) return;

            if (chats && chats.length > 0) {
                // Use existing chat
                setActiveChatId(chats[0].id);
            } else if (!isCreatingChat && chats && chats.length === 0) {
                // Auto-create a new chat
                setIsCreatingChat(true);
                try {
                    const id = await IpcClient.getInstance().createChat(appId);
                    await refreshChats();
                    setActiveChatId(id);
                } catch (e) {
                    console.error("Failed to create chat", e);
                    toast.error("Failed to start Block Chat");
                } finally {
                    setIsCreatingChat(false);
                }
            }
        };

        initChat();
    }, [isOpen, chats, appId, refreshChats, isCreatingChat]);

    // Load messages when chat changes
    useEffect(() => {
        if (!activeChatId) return;

        const loadMessages = async () => {
            try {
                const chatData = await IpcClient.getInstance().getChat(activeChatId);
                setMessages(chatData.messages);
            } catch (e) {
                console.error("Failed to load messages", e);
            }
        };
        loadMessages();
    }, [activeChatId, setMessages]);

    if (!isOpen) return null;

    return (
        <div
            className={`fixed right-0 top-14 bottom-0 bg-background border-l shadow-2xl z-50 flex flex-col transition-all duration-300 ${isMinimized ? 'w-16' : 'w-96'
                }`}
        >
            {/* Header */}
            <div className="h-12 border-b flex items-center justify-between px-3 bg-card shrink-0">
                <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-primary" />
                    {!isMinimized && (
                        <span className="font-semibold text-sm">Block Chat</span>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => setIsMinimized(!isMinimized)}
                        title={isMinimized ? "Maximize" : "Minimize"}
                    >
                        {isMinimized ? (
                            <Maximize2 className="w-4 h-4" />
                        ) : (
                            <Minimize2 className="w-4 h-4" />
                        )}
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={onClose}
                        title="Close"
                    >
                        <X className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Content */}
            {!isMinimized && (
                <div className="flex-1 overflow-hidden">
                    {isCreatingChat ? (
                        <div className="h-full flex items-center justify-center">
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                                <p className="text-sm text-muted-foreground">Starting Block Chat...</p>
                            </div>
                        </div>
                    ) : activeChatId ? (
                        <BlockChatPanel chatId={activeChatId} />
                    ) : (
                        <div className="h-full flex items-center justify-center p-4">
                            <div className="text-center">
                                <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                                <p className="text-sm text-muted-foreground mb-4">
                                    Block Chat helps you learn Blocklaa!
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Ask questions about blocks, coding, or get help with your project.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Minimized hint */}
            {isMinimized && (
                <div className="flex-1 flex items-center justify-center">
                    <div className="transform -rotate-90 whitespace-nowrap text-xs text-muted-foreground">
                        Block Chat
                    </div>
                </div>
            )}
        </div>
    );
}
