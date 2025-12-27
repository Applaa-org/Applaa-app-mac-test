/**
 * MakeCode Editor Component
 * 
 * High-performance iframe wrapper for Microsoft MakeCode editors
 * (Arcade, micro:bit, Minecraft) with postMessage RPC bridge.
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Loader2, RefreshCw, ExternalLink, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import { useAtomValue } from 'jotai';
import { IpcClient } from '@/ipc/ipc_client';
import { selectedAppIdAtom } from '@/atoms/appAtoms';
import { isStreamingAtom } from '@/atoms/chatAtoms';

export type MakeCodeType = 'arcade' | 'microbit' | 'minecraft';

interface MakeCodeEditorProps {
    type: MakeCodeType;
    initialCode?: string;
    className?: string;
    onCodeChange?: (code: string) => void;
    onReady?: () => void;
}

const EDITOR_URLS: Record<MakeCodeType, string> = {
    arcade: 'https://arcade.makecode.com/--embed',
    microbit: 'https://makecode.microbit.org/--embed',
    minecraft: 'https://minecraft.makecode.com/--embed',
};

export function MakeCodeEditor({
    type,
    initialCode: propInitialCode,
    className,
    onCodeChange,
    onReady
}: MakeCodeEditorProps) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isExpanded, setIsExpanded] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const appId = useAtomValue(selectedAppIdAtom);
    const isStreaming = useAtomValue(isStreamingAtom);
    const [lastSyncedCode, setLastSyncedCode] = useState<string | null>(null);

    // Initialize MakeCode RPC
    const sendMessage = useCallback((action: string, data?: any) => {
        if (!iframeRef.current?.contentWindow) return;

        iframeRef.current.contentWindow.postMessage({
            type: "pxteditor",
            action,
            ...data
        }, "*");
    }, []);

    // Fetch code from file system
    const loadCodeFromFile = useCallback(async () => {
        if (!appId) return;
        try {
            const ipcClient = IpcClient.getInstance();
            const { content } = await ipcClient.readFile({ appId, filePath: 'main.ts' });
            if (content) {
                sendMessage("importproject", {
                    project: {
                        text: { "main.ts": content }
                    }
                });
                setLastSyncedCode(content);
            }
        } catch (err) {
            console.error("Failed to load MakeCode main.ts:", err);
        }
    }, [appId, sendMessage]);

    useEffect(() => {
        const handleMessage = async (event: MessageEvent) => {
            const data = event.data;
            if (data.type !== "pxteditor") return;

            switch (data.action) {
                case "editorready":
                    console.log(`[MakeCode ${type}] Editor Ready`);
                    setIsLoading(false);
                    onReady?.();
                    await loadCodeFromFile();
                    break;
                case "updateready":
                    // Handle code updates from the block editor
                    if (data.sourceCode && data.sourceCode !== lastSyncedCode) {
                        console.log("Syncing blocks to file system...");
                        setLastSyncedCode(data.sourceCode);
                        if (appId) {
                            const ipcClient = IpcClient.getInstance();
                            await ipcClient.writeFile({
                                appId,
                                filePath: 'main.ts',
                                content: data.sourceCode
                            });
                        }
                        onCodeChange?.(data.sourceCode);
                    }
                    break;
                case "error":
                    setError(data.message || "An error occurred in MakeCode");
                    break;
            }
        };

        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, [type, appId, onCodeChange, onReady, sendMessage, loadCodeFromFile, lastSyncedCode]);

    // Reload when streaming finishes
    useEffect(() => {
        if (!isStreaming && appId && !isLoading) {
            console.log("AI finished streaming, refreshing MakeCode editor...");
            loadCodeFromFile();
        }
    }, [isStreaming, appId, isLoading, loadCodeFromFile]);

    const handleReload = () => {
        setIsLoading(true);
        setError(null);
        if (iframeRef.current) {
            iframeRef.current.src = EDITOR_URLS[type];
        }
    };

    return (
        <Card className={cn(
            "relative flex flex-col overflow-hidden bg-background border-muted shadow-lg transition-all duration-300",
            isExpanded ? "fixed inset-4 z-50" : "h-full w-full",
            className
        )}>
            {/* Editor Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b border-muted">
                <div className="flex items-center gap-2">
                    <div className={cn(
                        "w-2 h-2 rounded-full",
                        isLoading ? "bg-yellow-500 animate-pulse" : "bg-green-500"
                    )} />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        MakeCode {type}
                    </span>
                </div>

                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleReload}>
                        <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsExpanded(!isExpanded)}>
                        {isExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => window.open(EDITOR_URLS[type].replace('/--embed', ''), '_blank')}>
                        <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>

            {/* Iframe Container */}
            <div className="flex-1 relative bg-white">
                {isLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-10">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                        <p className="text-sm text-muted-foreground font-medium">Booting MakeCode Engine...</p>
                    </div>
                )}

                {error && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-destructive/10 backdrop-blur-sm z-20 p-6 text-center">
                        <p className="text-destructive font-bold mb-2">Editor Error</p>
                        <p className="text-sm text-muted-foreground mb-4">{error}</p>
                        <Button variant="outline" size="sm" onClick={handleReload}>Try Again</Button>
                    </div>
                )}

                <iframe
                    ref={iframeRef}
                    src={EDITOR_URLS[type]}
                    className="w-full h-full border-none"
                    allow="usb; autoplay; camera; microphone"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
                />
            </div>

            {/* Footer / Status */}
            <div className="px-4 py-1.5 bg-muted/10 border-t border-muted flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground">
                    {isLoading ? 'Connecting...' : 'Microsoft MakeCode Engine Active'}
                </p>
                <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                    <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400">AI Sync Enabled</span>
                </div>
            </div>
        </Card>
    );
}
