import { useEffect, useState, useRef } from 'react';
import { IpcClient } from '@/ipc/ipc_client';
import { Button } from '@/components/ui/button';
import { Loader2, Play, Square, ExternalLink, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";

interface MinecraftSandboxViewerProps {
    modPath?: string;
}

interface SandboxStatus {
    running: boolean;
    port: number;
    viewerUrl?: string;
    message?: string;
}

export function MinecraftSandboxViewer({ modPath }: MinecraftSandboxViewerProps) {
    const [status, setStatus] = useState<SandboxStatus | null>(null);
    const [isStarting, setIsStarting] = useState(false);
    const [isStopping, setIsStopping] = useState(false);
    const [iframeKey, setIframeKey] = useState(0); // Force iframe reload

    // Check sandbox status on mount and subscribe to updates
    useEffect(() => {
        checkStatus();

        // Auto-start if not running
        handleStart();

        // Listen for status updates from main process
        const unsubscribe = IpcClient.getInstance().onMinecraftSandboxStatus((newStatus: SandboxStatus) => {
            console.log('Received sandbox status:', newStatus);
            setStatus(newStatus);
        });

        // Cleanup: Stop sandbox when component unmounts (User switches away)
        return () => {
            unsubscribe();
            handleStop();
        };
    }, []); // Run once on mount

    const checkStatus = async () => {
        try {
            const sandboxStatus = await IpcClient.getInstance().minecraftSandboxStatus();
            setStatus(sandboxStatus);
        } catch (error) {
            console.error('Failed to get sandbox status:', error);
        }
    };

    const handleStart = async () => {
        if (isStarting || status?.running) return;

        setIsStarting(true);
        setStatus(prev => ({ ...prev!, message: 'Starting process...' }));

        try {
            await IpcClient.getInstance().minecraftSandboxStart({
                modPath,
                port: 25565,
            });
            // Status updates will come via IPC event
        } catch (error) {
            console.error('Failed to start sandbox:', error);
            setStatus(prev => ({
                ...prev!,
                running: false,
                port: 25565,
                message: `Failed to start: ${error instanceof Error ? error.message : String(error)}`
            }));
        } finally {
            setIsStarting(false);
        }
    };

    const handleStop = async () => {
        // Don't set isStopping state here because unmount might happen immediately
        // Just fire and forget the stop command
        try {
            await IpcClient.getInstance().minecraftSandboxStop();
        } catch (error) {
            console.error('Failed to stop sandbox:', error);
        }
    };

    const handleRestart = async () => {
        await handleStop();
        // Wait a bit for cleanup
        setTimeout(() => {
            handleStart();
            setIframeKey(prev => prev + 1); // Refresh iframe
        }, 1000);
    };

    return (
        <div className="minecraft-sandbox-viewer h-full flex flex-col bg-slate-950">
            {/* Header */}
            <div className="p-3 border-b border-border bg-background/50 backdrop-blur flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-white">3D Preview</h3>
                    {status?.running ? (
                        <span className="flex items-center text-xs text-green-400 bg-green-950/50 px-2 py-0.5 rounded border border-green-900">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 mr-2 animate-pulse" />
                            Live
                        </span>
                    ) : (
                        <span className="flex items-center text-xs text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-500 mr-2" />
                            Stopped
                        </span>
                    )}
                </div>

                <div className="flex gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={handleRestart}
                        disabled={!status?.running}
                    >
                        <RefreshCw className="w-3 h-3 mr-2" />
                        Reload
                    </Button>
                    {status?.viewerUrl && (
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => window.open(status.viewerUrl, '_blank')}
                        >
                            <ExternalLink className="w-3 h-3" />
                        </Button>
                    )}
                </div>
            </div>

            {/* 3D Viewer Area */}
            <div className="flex-1 relative overflow-hidden bg-slate-900">
                {status?.viewerUrl ? (
                    <iframe
                        key={iframeKey}
                        src={status.viewerUrl}
                        className="w-full h-full border-0"
                        allow="cross-origin-isolated"
                    />
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                        {isStarting ? (
                            <>
                                <Loader2 className="w-8 h-8 mb-4 animate-spin text-blue-500" />
                                <p className="text-sm">{status?.message || 'Starting sandbox...'}</p>
                            </>
                        ) : (
                            <div className="text-center">
                                <div className="text-4xl mb-4 grayscale opacity-50">⛏️</div>
                                <p className="text-sm opacity-70">Sandbox stopped</p>
                                <Button
                                    variant="link"
                                    onClick={handleStart}
                                    className="text-blue-400"
                                >
                                    Start Manually
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {/* Status Overlay */}
                {status?.message && !status.viewerUrl && !isStarting && (
                    <div className="absolute bottom-4 left-4 right-4">
                        <Alert className="bg-slate-900/90 border-slate-800 text-slate-300">
                            <AlertDescription className="text-xs font-mono">
                                {status.message}
                            </AlertDescription>
                        </Alert>
                    </div>
                )}
            </div>

            {/* Quick Controls */}
            {status?.running && (
                <div className="p-2 border-t border-border bg-background/50 flex justify-center gap-2">
                    <div className="text-[10px] text-slate-500 font-mono">
                        Server: {status.port} | Viewer: {status.viewerUrl}
                    </div>
                </div>
            )}
        </div>
    );
}
