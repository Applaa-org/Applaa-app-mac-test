/**
 * Minecraft Block Preview Panel
 * 
 * Combines the Blockly editor with a visual simulator
 * Left side: Block canvas for dragging/connecting
 * Right side: Visual preview of what the mod does
 */

import React, { useState, useCallback } from 'react';
import { BlocklyEditor } from '../blockly/BlocklyEditor';
import { MinecraftSimulator } from './MinecraftSimulator';
import {
    Blocks,
    Play,
    Eye,
    ChevronLeft,
    ChevronRight,
    Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MinecraftBlockPreviewProps {
    appId: number;
    initialWorkspace?: any;
}

export function MinecraftBlockPreview({ appId, initialWorkspace }: MinecraftBlockPreviewProps) {
    const [generatedCode, setGeneratedCode] = useState<string>('');
    const [showSimulator, setShowSimulator] = useState(true);
    const [splitRatio, setSplitRatio] = useState(50); // 50-50 split

    // Handle workspace changes from Blockly
    const handleWorkspaceChange = useCallback((data: {
        workspaceJson: any;
        generatedCode: string;
        generatedCodeMap?: Record<string, string>;
    }) => {
        console.log('Minecraft blocks updated:', data);
        setGeneratedCode(data.generatedCode || '');
    }, []);

    // Convert JavaScript-style code to mcfunction
    const getMcfunctionCode = (): string => {
        // The Blockly blocks already generate mcfunction-style code
        return generatedCode;
    };

    return (
        <div className="h-full flex flex-col bg-slate-900">
            {/* Header Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <Blocks className="w-5 h-5 text-green-400" />
                        <span className="font-semibold text-white">Minecraft Mod Builder</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        variant={showSimulator ? "default" : "ghost"}
                        onClick={() => setShowSimulator(!showSimulator)}
                        className="h-8"
                    >
                        <Eye className="w-4 h-4 mr-1" />
                        {showSimulator ? 'Hide Preview' : 'Show Preview'}
                    </Button>

                    <Button
                        size="sm"
                        variant="outline"
                        className="h-8 bg-green-600 hover:bg-green-700 text-white border-green-500"
                    >
                        <Download className="w-4 h-4 mr-1" />
                        Build .mcaddon
                    </Button>
                </div>
            </div>

            {/* Main Content - Split View */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel: Blockly Editor */}
                <div
                    className="relative overflow-hidden border-r border-slate-700"
                    style={{ width: showSimulator ? `${splitRatio}%` : '100%' }}
                >
                    <BlocklyEditor
                        appId={appId}
                        initialWorkspace={initialWorkspace}
                        onWorkspaceChange={handleWorkspaceChange}
                    />
                </div>

                {/* Resize Handle */}
                {showSimulator && (
                    <div
                        className="w-1 bg-slate-600 hover:bg-green-500 cursor-col-resize transition-colors flex items-center justify-center"
                        onMouseDown={(e) => {
                            e.preventDefault();
                            const startX = e.clientX;
                            const startRatio = splitRatio;

                            const handleMouseMove = (e: MouseEvent) => {
                                const delta = e.clientX - startX;
                                const container = document.body.clientWidth;
                                const newRatio = startRatio + (delta / container) * 100;
                                setSplitRatio(Math.max(30, Math.min(70, newRatio)));
                            };

                            const handleMouseUp = () => {
                                document.removeEventListener('mousemove', handleMouseMove);
                                document.removeEventListener('mouseup', handleMouseUp);
                            };

                            document.addEventListener('mousemove', handleMouseMove);
                            document.addEventListener('mouseup', handleMouseUp);
                        }}
                    >
                        <div className="flex flex-col gap-1">
                            <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
                            <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
                            <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
                        </div>
                    </div>
                )}

                {/* Right Panel: Visual Simulator */}
                {showSimulator && (
                    <div
                        className="relative overflow-hidden"
                        style={{ width: `${100 - splitRatio}%` }}
                    >
                        <MinecraftSimulator
                            mcfunctionCode={getMcfunctionCode()}
                            autoPlay={false}
                        />

                        {/* Code Preview Overlay */}
                        {generatedCode && (
                            <div className="absolute bottom-0 left-0 right-0 max-h-32 overflow-auto bg-black/80 text-green-400 font-mono text-xs p-2 border-t border-green-500/30">
                                <div className="text-green-500/60 text-[10px] mb-1">Generated mcfunction:</div>
                                <pre className="whitespace-pre-wrap">{getMcfunctionCode() || '# Add blocks to generate code'}</pre>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default MinecraftBlockPreview;
