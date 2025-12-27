import { useState, useRef, useEffect } from 'react';
import { BuddyMessage, TypingIndicator } from './BuddyMessage';
import { BuddyInput } from './BuddyInput';
import type { Message } from '@/ipc/ipc_types';
import { ipcClient } from '@/ipc/ipc_client';

type BuddyMode = 'chat' | 'build' | 'plan';

interface BuddyChatProps {
    onNavigateToUrl?: (url: string) => void;
    tabs?: any[];
    onTabSwitch?: (tabId: string) => void;
    onTabCreate?: (url: string) => void;
}

export function BuddyChat({ onNavigateToUrl, tabs, onTabSwitch, onTabCreate }: BuddyChatProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [mode, setMode] = useState<BuddyMode>('chat');
    const [pendingPlan, setPendingPlan] = useState<{ instruction: string, plan: string } | null>(null);
    const [isVoiceInput, setIsVoiceInput] = useState(false); // Track if current input is from voice

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Detect and auto-navigate to URLs in user messages
    useEffect(() => {
        if (messages.length === 0) return;

        const lastMessage = messages[messages.length - 1];
        if (lastMessage.role !== 'user') return;

        // Check if message contains a URL
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const urls = lastMessage.content.match(urlRegex);

        if (urls && urls.length > 0 && onNavigateToUrl) {
            // Auto-navigate to the first URL found
            console.log('[Buddy] Auto-navigating to:', urls[0]);
            onNavigateToUrl(urls[0]);
        }
    }, [messages, onNavigateToUrl]);

    // Listen for automation progress updates
    useEffect(() => {
        const handleProgress = (_event: any, data?: { type: string; message: string }) => {
            if (!data) return; // Safety check
            console.log('[Buddy] Progress update:', data);

            // Find the last assistant message and update it
            setMessages(prev => {
                const lastAssistantIndex = prev.length - 1;
                if (lastAssistantIndex >= 0 && prev[lastAssistantIndex].role === 'assistant') {
                    const updated = [...prev];
                    if (data.type === 'status') {
                        // Append status updates
                        updated[lastAssistantIndex] = {
                            ...updated[lastAssistantIndex],
                            content: updated[lastAssistantIndex].content + `\n${data.message}`
                        };
                    } else if (data.type === 'complete') {
                        // Mark as complete
                        updated[lastAssistantIndex] = {
                            ...updated[lastAssistantIndex],
                            content: updated[lastAssistantIndex].content + `\n\n${data.message}`
                        };
                    }
                    return updated;
                }
                return prev;
            });
        };

        // @ts-ignore - Electron IPC
        window.electron?.ipcRenderer?.on('automation:progress', handleProgress);

        return () => {
            // @ts-ignore
            window.electron?.ipcRenderer?.removeListener('automation:progress', handleProgress);
        };
    }, []);

    const handleApprovePlan = async () => {
        if (!pendingPlan) return;

        const instruction = pendingPlan.instruction;
        setPendingPlan(null);

        const assistantMessage: Message = {
            id: Date.now() + 1,
            role: 'assistant',
            content: 'Executing plan... 🚀',
            dbTimestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, assistantMessage]);
        setIsLoading(true);

        try {
            const actResult = await ipcClient.automationExecute({ instruction });
            if (actResult.success) {
                setMessages(prev => prev.map(m => m.id === assistantMessage.id ? {
                    ...m,
                    content: actResult.message
                } : m));
            } else {
                throw new Error(actResult.message);
            }
        } catch (error: any) {
            setMessages(prev => prev.map(m => m.id === assistantMessage.id ? {
                ...m,
                content: `❌ Execution failed: ${error.message || String(error)}`
            } : m));
        }
        setIsLoading(false);
    };

    const handleRejectPlan = () => {
        setPendingPlan(null);
        setMessages(prev => [...prev, {
            id: Date.now() + 1,
            role: 'assistant',
            content: 'Plan cancelled.',
            dbTimestamp: new Date().toISOString(),
        }]);
    };

    const handleSubmit = async () => {
        if (!inputValue.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now(),
            role: 'user',
            content: inputValue.trim(),
            dbTimestamp: new Date().toISOString(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);

        // Handle Pending Plan Confirmation
        if (pendingPlan) {
            const lowerInput = userMessage.content.toLowerCase();
            if (lowerInput === 'yes' || lowerInput === 'execute' || lowerInput === 'ok' || lowerInput === 'proceed') {
                // Execute the pending plan
                const instruction = pendingPlan.instruction;
                setPendingPlan(null);

                const assistantMessage: Message = {
                    id: Date.now() + 1,
                    role: 'assistant',
                    content: 'Executing plan... 🚀',
                    dbTimestamp: new Date().toISOString(),
                };
                setMessages(prev => [...prev, assistantMessage]);

                try {
                    const actResult = await ipcClient.automationExecute({ instruction });
                    if (actResult.success) {
                        setMessages(prev => prev.map(m => m.id === assistantMessage.id ? {
                            ...m,
                            content: actResult.message // Message already formatted by backend
                        } : m));
                    } else {
                        throw new Error(actResult.message);
                    }
                } catch (error: any) {
                    setMessages(prev => prev.map(m => m.id === assistantMessage.id ? {
                        ...m,
                        content: `❌ Execution failed: ${error.message || String(error)}`
                    } : m));
                }
                setIsLoading(false);
                return;
            } else if (lowerInput === 'no' || lowerInput === 'cancel') {
                setPendingPlan(null);
                setMessages(prev => [...prev, {
                    id: Date.now() + 1,
                    role: 'assistant',
                    content: 'Plan cancelled.',
                    dbTimestamp: new Date().toISOString(),
                }]);
                setIsLoading(false);
                return;
            }
            // If neither yes nor no, continue to standard handling (maybe user is asking a question about the plan)
        }

        try {
            // Check if this looks like an automation request
            const isAutomation = inputValue.toLowerCase().includes('click') ||
                inputValue.toLowerCase().includes('type') ||
                inputValue.toLowerCase().includes('extract') ||
                inputValue.toLowerCase().includes('go to') ||
                inputValue.toLowerCase().includes('search') ||
                mode === 'plan' ||
                isVoiceInput; // Voice input always triggers planning

            if (isAutomation) {
                // Voice input OR explicit plan mode -> Generate Plan
                if (mode === 'plan' || isVoiceInput) {
                    const assistantMessage: Message = {
                        id: Date.now() + 1,
                        role: 'assistant',
                        content: '🧠 Analyzing your request and generating a plan...',
                        dbTimestamp: new Date().toISOString(),
                    };
                    setMessages(prev => [...prev, assistantMessage]);

                    const planResult = await ipcClient.automationPlan({ instruction: userMessage.content });

                    if (planResult.success) {
                        setPendingPlan({ instruction: userMessage.content, plan: planResult.plan });

                        setMessages(prev => prev.map(m => m.id === assistantMessage.id ? {
                            ...m,
                            content: `**📋 Proposed Plan:**\n\n${planResult.plan}\n\n_Do you want to execute this plan? (Type "yes" or "execute")_`
                        } : m));
                    } else {
                        setMessages(prev => prev.map(m => m.id === assistantMessage.id ? {
                            ...m,
                            content: `❌ Failed to generate plan: ${planResult.message}`
                        } : m));
                    }

                    // Reset voice flag after processing
                    setIsVoiceInput(false);
                } else {
                    // Direct Execute (Existing Logic)
                    const assistantMessage: Message = {
                        id: Date.now() + 1,
                        role: 'assistant',
                        content: 'Analyzing the page with Gemini AI... 🧠',
                        dbTimestamp: new Date().toISOString(),
                    };
                    setMessages(prev => [...prev, assistantMessage]);

                    try {
                        // Initialize Gemini Automation
                        setMessages(prev => prev.map(m => m.id === assistantMessage.id ? {
                            ...m,
                            content: 'Initializing Gemini AI automation... 🚀'
                        } : m));

                        const initResult = await ipcClient.automationInit();
                        if (!initResult.success) {
                            throw new Error(initResult.error || 'Failed to initialize AI automation');
                        }

                        setMessages(prev => prev.map(m => m.id === assistantMessage.id ? {
                            ...m,
                            content: `Executing: "${userMessage.content}"... 🪄`
                        } : m));

                        // Execute action
                        const actResult = await ipcClient.automationExecute({ instruction: userMessage.content });

                        if (actResult.success) {
                            setMessages(prev => prev.map(m => m.id === assistantMessage.id ? {
                                ...m,
                                content: actResult.message
                            } : m));
                        } else {
                            throw new Error(actResult.message || 'AI action failed');
                        }
                    } catch (err: any) {
                        const error = err.message || String(err);
                        let message = `Sorry, the AI automation failed: ${error}`;

                        if (error.toLowerCase().includes('api key')) {
                            message += `\n\n💡 **Tip:** Please check if you have added your **Google Gemini API Key** in the **Settings > LLM Providers** section.`;
                        }

                        setMessages(prev => prev.map(m => m.id === assistantMessage.id ? {
                            ...m,
                            content: message
                        } : m));
                    }
                }
            } else {
                // Simulate regular chat
                await new Promise(resolve => setTimeout(resolve, 1000));
                const assistantMessage: Message = {
                    id: Date.now() + 1,
                    role: 'assistant',
                    content: getAIResponse(userMessage.content, mode),
                    dbTimestamp: new Date().toISOString(),
                };
                setMessages(prev => [...prev, assistantMessage]);
            }
        } catch (error) {
            console.error('[Buddy] Error:', error);
            const errorMessage: Message = {
                id: Date.now() + 1,
                role: 'assistant',
                content: 'Sorry, I encountered an error. Please try again.',
                dbTimestamp: new Date().toISOString(),
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const getAIResponse = (userInput: string, currentMode: BuddyMode): string => {
        // Mode-specific responses
        if (currentMode === 'chat') {
            return `I'm here to help you browse! You can ask me to:\n• Navigate to websites\n• Fill out forms\n• Extract data\n• Click elements\n• Take screenshots\n\nWhat would you like me to do?`;
        } else if (currentMode === 'build') {
            return `Build mode activated! I can help you create automation scripts. Describe what you want to automate, and I'll generate the code for you.`;
        } else {
            return `Planning mode activated! Let's break down your automation into steps. What's your goal?`;
        }
    };

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Messages Area */}
            <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-4"
            >
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center mb-4">
                            <span className="text-3xl">🤖</span>
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Applaa Buddy</h3>
                        <p className="text-sm text-muted-foreground max-w-[280px] mb-6">
                            Your AI-powered browsing assistant. Ask me to navigate, automate, or extract data.
                        </p>
                        <div className="space-y-2 w-full max-w-[300px]">
                            <button
                                onClick={() => setInputValue('Go to https://app.applaa.com')}
                                className="w-full p-3 rounded-lg bg-muted/50 hover:bg-muted text-left text-sm transition-colors"
                            >
                                "Go to https://app.applaa.com"
                            </button>
                            <button
                                onClick={() => setInputValue('Extract all links from this page')}
                                className="w-full p-3 rounded-lg bg-muted/50 hover:bg-muted text-left text-sm transition-colors"
                            >
                                "Extract all links from this page"
                            </button>
                            <button
                                onClick={() => setInputValue('Fill the login form')}
                                className="w-full p-3 rounded-lg bg-muted/50 hover:bg-muted text-left text-sm transition-colors"
                            >
                                "Fill the login form"
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {messages.map((message, index) => {
                            // Check if this is the last assistant message with a pending plan
                            const isLastAssistantMessage =
                                message.role === 'assistant' &&
                                index === messages.length - 1;
                            const showApprovalButtons = pendingPlan !== null && isLastAssistantMessage;

                            return (
                                <BuddyMessage
                                    key={message.id}
                                    message={message}
                                    onNavigateToUrl={onNavigateToUrl}
                                    isPlanPending={showApprovalButtons}
                                    onApprovePlan={handleApprovePlan}
                                    onRejectPlan={handleRejectPlan}
                                />
                            );
                        })}
                        {isLoading && <TypingIndicator />}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* Input Area */}
            <BuddyInput
                value={inputValue}
                onChange={setInputValue}
                onSubmit={handleSubmit}
                isLoading={isLoading}
                onAttachFile={() => console.log('Attach File clicked')}
                onAttachScreenshot={() => console.log('Attach Screenshot clicked')}
                onVoiceInput={() => setIsVoiceInput(true)}
            />
        </div>
    );
}
