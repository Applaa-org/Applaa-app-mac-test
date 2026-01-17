/**
 * MakeCode Minecraft Preview Component
 * Embeds the MakeCode Minecraft editor with simulator for instant preview
 * 
 * Kids can see their mods work in real-time!
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Play, ExternalLink, Code, Gamepad2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MakeCodePreviewProps {
    /** TypeScript code to run in the simulator */
    code?: string;
    /** App data for context */
    app?: any;
    /** Callback when code is edited in MakeCode */
    onCodeChange?: (code: string) => void;
}

// MakeCode Minecraft embed URL with parameters
const MAKECODE_EMBED_URL = 'https://minecraft.makecode.com/?controller=1&norender=1&embed=1&hideprojects=1';

export function MakeCodePreview({ code, app, onCodeChange }: MakeCodePreviewProps) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isConnected, setIsConnected] = useState(false);
    const [showCode, setShowCode] = useState(false);

    // Handle messages from MakeCode iframe
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            // Only accept messages from MakeCode
            if (!event.origin.includes('makecode.com')) return;

            const data = event.data;

            switch (data.type) {
                case 'pxteditor':
                    // Editor is ready
                    if (data.action === 'ready') {
                        console.log('MakeCode editor ready');
                        setIsLoading(false);
                        setIsConnected(true);
                        // Send initial code if we have it
                        if (code) {
                            sendCodeToMakeCode(code);
                        }
                    }
                    break;

                case 'pxthost':
                    // Handle host events
                    if (data.action === 'importexternalproject') {
                        console.log('Project imported');
                    }
                    break;
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [code]);

    // Send code to MakeCode iframe
    const sendCodeToMakeCode = useCallback((tsCode: string) => {
        if (!iframeRef.current?.contentWindow) return;

        // Create a MakeCode project structure
        const project = {
            name: app?.name || 'My Minecraft Mod',
            text: {
                'main.ts': tsCode,
                'pxt.json': JSON.stringify({
                    name: app?.name || 'my-mod',
                    description: 'Created with Applaa',
                    dependencies: {
                        core: '*',
                        minecraft: '*'
                    },
                    files: ['main.ts']
                }, null, 2)
            }
        };

        // Send to MakeCode
        iframeRef.current.contentWindow.postMessage({
            type: 'importproject',
            project
        }, '*');

        console.log('Sent code to MakeCode:', tsCode.substring(0, 100));
    }, [app]);

    // Reload the preview
    const handleReload = () => {
        if (iframeRef.current) {
            setIsLoading(true);
            setIsConnected(false);
            iframeRef.current.src = MAKECODE_EMBED_URL;
        }
    };

    // Open in new tab
    const handleOpenExternal = () => {
        window.open('https://minecraft.makecode.com/', '_blank');
    };

    // Run the current code
    const handleRun = () => {
        if (code) {
            sendCodeToMakeCode(code);
        }
    };

    // Default starter code if none provided
    const displayCode = code || `
// 🎮 My Minecraft Mod
// Type commands in Minecraft chat to trigger actions!

player.onChat("fly", function() {
    mobs.applyEffect(EffectType.Levitation, mobs.target(LOCAL_PLAYER), 60, 1)
    player.say("🚀 Flying!")
})

player.onChat("heal", function() {
    player.setHealth(20)
    player.say("💚 Healed!")
})
`.trim();

    return (
        <div className="h-full flex flex-col bg-slate-950">
            {/* Header */}
            <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                <div className="flex items-center gap-3">
                    <Gamepad2 className="w-5 h-5 text-green-500" />
                    <h3 className="font-semibold text-white">Minecraft Preview</h3>
                    {isConnected ? (
                        <span className="flex items-center text-xs text-green-400 bg-green-950/50 px-2 py-0.5 rounded border border-green-900">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 mr-2 animate-pulse" />
                            Connected
                        </span>
                    ) : (
                        <span className="flex items-center text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-500 mr-2" />
                            {isLoading ? 'Loading...' : 'Disconnected'}
                        </span>
                    )}
                </div>

                <div className="flex gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => setShowCode(!showCode)}
                    >
                        <Code className="w-3 h-3 mr-1" />
                        {showCode ? 'Hide Code' : 'Show Code'}
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={handleRun}
                        disabled={!isConnected}
                    >
                        <Play className="w-3 h-3 mr-1" />
                        Run
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={handleReload}
                    >
                        <RefreshCw className="w-3 h-3" />
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={handleOpenExternal}
                    >
                        <ExternalLink className="w-3 h-3" />
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Code Panel (collapsible) */}
                {showCode && (
                    <div className="w-1/3 border-r border-slate-800 bg-slate-900 overflow-auto">
                        <pre className="p-4 text-xs text-slate-300 font-mono whitespace-pre-wrap">
                            {displayCode}
                        </pre>
                    </div>
                )}

                {/* MakeCode Iframe */}
                <div className={cn(
                    "flex-1 relative",
                    showCode ? "w-2/3" : "w-full"
                )}>
                    {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-950 z-10">
                            <div className="text-center">
                                <Loader2 className="w-8 h-8 animate-spin text-green-500 mx-auto mb-4" />
                                <p className="text-slate-400 text-sm">Loading MakeCode Minecraft...</p>
                                <p className="text-slate-500 text-xs mt-2">This may take a few seconds</p>
                            </div>
                        </div>
                    )}

                    <iframe
                        ref={iframeRef}
                        src={MAKECODE_EMBED_URL}
                        className="w-full h-full border-0"
                        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                        allow="usb; serial"
                        onLoad={() => {
                            console.log('MakeCode iframe loaded');
                            // Give it a moment to initialize
                            setTimeout(() => {
                                setIsLoading(false);
                                setIsConnected(true);
                                if (code) {
                                    sendCodeToMakeCode(code);
                                }
                            }, 2000);
                        }}
                    />
                </div>
            </div>

            {/* Footer Help */}
            <div className="p-2 border-t border-slate-800 bg-slate-900/50">
                <p className="text-xs text-slate-500 text-center">
                    💡 Type commands like <code className="text-green-400">/fly</code> or <code className="text-green-400">/heal</code> in the Minecraft chat to test your mod!
                </p>
            </div>
        </div>
    );
}

export default MakeCodePreview;
