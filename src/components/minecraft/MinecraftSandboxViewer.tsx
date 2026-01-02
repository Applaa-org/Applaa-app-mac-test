import { useEffect, useState, useRef } from 'react';
import { IpcClient } from '@/ipc/ipc_client';
import { Button } from '@/components/ui/button';
import { Loader2, Play, Square, TestTube } from 'lucide-react';

interface MinecraftSandboxViewerProps {
    modPath?: string;
}

export function MinecraftSandboxViewer({ modPath }: MinecraftSandboxViewerProps) {
    const [status, setStatus] = useState<{
        running: boolean;
        port: number;
        version: string;
        playersOnline: number;
    } | null>(null);
    const [isStarting, setIsStarting] = useState(false);
    const [isStopping, setIsStopping] = useState(false);
    const [testResult, setTestResult] = useState<string | null>(null);
    const viewerRef = useRef<HTMLDivElement>(null);

    // Check sandbox status on mount
    useEffect(() => {
        checkStatus();
    }, []);

    const checkStatus = async () => {
        try {
            const sandboxStatus = await IpcClient.getInstance().minecraftSandboxStatus();
            setStatus(sandboxStatus);
        } catch (error) {
            console.error('Failed to get sandbox status:', error);
        }
    };

    const handleStart = async () => {
        setIsStarting(true);
        setTestResult(null);
        try {
            const result = await IpcClient.getInstance().minecraftSandboxStart({
                modPath,
                port: 25565,
            });
            console.log('Sandbox started:', result);
            await checkStatus();
            setTestResult('✅ Sandbox started successfully!');
        } catch (error) {
            console.error('Failed to start sandbox:', error);
            setTestResult(`❌ Failed to start: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsStarting(false);
        }
    };

    const handleStop = async () => {
        setIsStopping(true);
        try {
            await IpcClient.getInstance().minecraftSandboxStop();
            await checkStatus();
            setTestResult('🛑 Sandbox stopped');
        } catch (error) {
            console.error('Failed to stop sandbox:', error);
            setTestResult(`❌ Failed to stop: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsStopping(false);
        }
    };

    const handleTestItem = async () => {
        try {
            const result = await IpcClient.getInstance().minecraftSandboxTestItem('fire_sword');
            if (result.success) {
                setTestResult(`✅ ${result.message}`);
            } else {
                setTestResult(`❌ ${result.error}`);
            }
        } catch (error) {
            console.error('Failed to test item:', error);
            setTestResult(`❌ Test failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    };

    return (
        <div className="minecraft-sandbox-viewer h-full flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-border">
                <h3 className="text-lg font-semibold mb-2">Minecraft Sandbox Preview</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className={`w-2 h-2 rounded-full ${status?.running ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <span>{status?.running ? 'Running' : 'Stopped'}</span>
                    {status?.running && (
                        <>
                            <span>•</span>
                            <span>Port: {status.port}</span>
                            <span>•</span>
                            <span>Version: {status.version}</span>
                        </>
                    )}
                </div>
            </div>

            {/* 3D Viewer (Placeholder for now) */}
            <div
                ref={viewerRef}
                className="flex-1 bg-gradient-to-b from-blue-900 to-blue-950 relative overflow-hidden"
            >
                {!status?.running ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center text-white/70">
                            <div className="text-6xl mb-4">⛏️</div>
                            <p className="text-lg mb-2">Minecraft Sandbox</p>
                            <p className="text-sm">Start the sandbox to preview your mod</p>
                        </div>
                    </div>
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center text-white">
                            <div className="text-6xl mb-4 animate-bounce">🎮</div>
                            <p className="text-lg mb-2">Sandbox Running!</p>
                            <p className="text-sm text-white/70">
                                3D Viewer coming soon...
                            </p>
                            <p className="text-xs text-white/50 mt-2">
                                (PrismarineViewer integration in progress)
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="p-4 border-t border-border space-y-3">
                {/* Start/Stop Controls */}
                <div className="flex gap-2">
                    {!status?.running ? (
                        <Button
                            onClick={handleStart}
                            disabled={isStarting}
                            className="flex-1"
                        >
                            {isStarting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Starting...
                                </>
                            ) : (
                                <>
                                    <Play className="w-4 h-4 mr-2" />
                                    Start Sandbox
                                </>
                            )}
                        </Button>
                    ) : (
                        <Button
                            onClick={handleStop}
                            disabled={isStopping}
                            variant="destructive"
                            className="flex-1"
                        >
                            {isStopping ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Stopping...
                                </>
                            ) : (
                                <>
                                    <Square className="w-4 h-4 mr-2" />
                                    Stop Sandbox
                                </>
                            )}
                        </Button>
                    )}
                </div>

                {/* Test Controls */}
                {status?.running && (
                    <div className="flex gap-2">
                        <Button
                            onClick={handleTestItem}
                            variant="outline"
                            className="flex-1"
                        >
                            <TestTube className="w-4 h-4 mr-2" />
                            Test Item
                        </Button>
                    </div>
                )}

                {/* Test Results */}
                {testResult && (
                    <div className="p-3 bg-muted rounded-md text-sm">
                        {testResult}
                    </div>
                )}

                {/* Info */}
                <div className="text-xs text-muted-foreground">
                    <p>💡 Tip: The sandbox runs a lightweight Minecraft server using PrismarineJS</p>
                    {modPath && <p className="mt-1">📦 Mod path: {modPath}</p>}
                </div>
            </div>
        </div>
    );
}
