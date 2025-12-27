import { useState, useRef, useEffect } from 'react';
import { Bot, Loader2, User, Check, X, ChevronDown, ChevronRight, CheckCircle2, Circle } from 'lucide-react';
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

function CollapsibleSteps({ steps }: { steps: NonNullable<Message['steps']> }) {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!steps || steps.length === 0) return null;

    const completedCount = steps.filter(s => s.status === 'completed').length;
    const runningStep = steps.find(s => s.status === 'running');

    return (
        <div className="mb-2">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors group"
            >
                <span>{completedCount} {completedCount === 1 ? 'step' : 'steps'} completed</span>
                {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                {!isExpanded && runningStep && (
                    <span className="text-[12px] font-normal opacity-60 ml-1">
                        • {runningStep.title}...
                    </span>
                )}
            </button>

            {isExpanded && (
                <div className="mt-2 ml-1 pl-3 border-l-2 border-border space-y-2 py-1">
                    {steps.map((step, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 text-[12px] text-muted-foreground">
                            {step.status === 'completed' ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                            ) : step.status === 'running' ? (
                                <Loader2 className="h-4 w-4 animate-spin text-orange-500 flex-shrink-0" />
                            ) : (
                                <Circle className="h-4 w-4 text-muted-foreground/20 flex-shrink-0" />
                            )}
                            <span className={cn(
                                "leading-tight",
                                step.status === 'completed' && "text-muted-foreground/60"
                            )}>
                                {step.title}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
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
                "max-w-[85%] rounded-2xl px-4 py-3 shadow-sm",
                isUser
                    ? "bg-orange-500 text-white rounded-tr-none"
                    : "bg-background border border-border text-foreground rounded-tl-none"
            )}>
                {/* Steps Section (Assistant Only) */}
                {isAssistant && message.steps && message.steps.length > 0 && (
                    <CollapsibleSteps steps={message.steps} />
                )}

                <div className="text-sm leading-relaxed whitespace-pre-wrap break-words font-normal">
                    {renderContent()}
                </div>

                {/* Plan Approval Buttons */}
                {isPlanPending && isAssistant && (
                    <div className="flex gap-2 mt-4 pt-4 border-t border-border/50">
                        <Button
                            onClick={onApprovePlan}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white flex-1 font-semibold rounded-lg"
                        >
                            <Check className="h-4 w-4 mr-1.5" />
                            Yes, Execute
                        </Button>
                        <Button
                            onClick={onRejectPlan}
                            size="sm"
                            variant="ghost"
                            className="flex-1 hover:bg-muted text-muted-foreground rounded-lg"
                        >
                            <X className="h-4 w-4 mr-1.5" />
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
