import { useState, useRef, useEffect } from 'react';
import { Bot, Loader2, User, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { Message } from '@/ipc/ipc_types';

interface BuddyMessageProps {
    message: Message;
    onNavigateToUrl?: (url: string) => void;
    isPlanPending?: boolean;
    onApprovePlan?: () => void;
    onRejectPlan?: () => void;
}

export function BuddyMessage({
    message,
    onNavigateToUrl,
    isPlanPending,
    onApprovePlan,
    onRejectPlan
}: BuddyMessageProps) {
    const isUser = message.role === 'user';
    const isAssistant = message.role === 'assistant';

    // Detect URLs in message content
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const hasUrl = urlRegex.test(message.content);

    const renderContent = () => {
        if (!hasUrl) return message.content;

        const parts = message.content.split(urlRegex);
        return parts.map((part, index) => {
            if (part.match(urlRegex)) {
                return (
                    <button
                        key={index}
                        onClick={() => onNavigateToUrl?.(part)}
                        className="text-orange-500 hover:text-orange-600 underline font-medium"
                    >
                        {part}
                    </button>
                );
            }
            return <span key={index}>{part}</span>;
        });
    };

    return (
        <div className={cn(
            "flex gap-3 mb-4",
            isUser && "flex-row-reverse"
        )}>
            {/* Avatar */}
            <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                isUser ? "bg-orange-500" : "bg-muted"
            )}>
                {isUser ? (
                    <User className="h-4 w-4 text-white" />
                ) : (
                    <Bot className="h-4 w-4 text-muted-foreground" />
                )}
            </div>

            {/* Message Bubble */}
            <div className={cn(
                "max-w-[80%] rounded-lg px-4 py-2",
                isUser
                    ? "bg-orange-500 text-white"
                    : "bg-muted text-foreground"
            )}>
                <div className="text-sm whitespace-pre-wrap break-words">
                    {renderContent()}
                </div>

                {/* Plan Approval Buttons */}
                {isPlanPending && isAssistant && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                        <Button
                            onClick={onApprovePlan}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white flex-1"
                        >
                            <Check className="h-4 w-4 mr-1" />
                            Yes, Execute
                        </Button>
                        <Button
                            onClick={onRejectPlan}
                            size="sm"
                            variant="outline"
                            className="flex-1"
                        >
                            <X className="h-4 w-4 mr-1" />
                            No, Cancel
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}

export function TypingIndicator() {
    return (
        <div className="flex gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="bg-muted rounded-lg px-4 py-2">
                <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
            </div>
        </div>
    );
}
