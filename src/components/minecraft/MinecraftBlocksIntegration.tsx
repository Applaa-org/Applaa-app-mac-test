/**
 * Minecraft Blockly Integration
 * 
 * Handles 2-way sync between:
 * - Chat (AI responses) → Blocks (canvas)
 * - Blocks (canvas) → Files (workspace.json)
 * - Files (workspace.json) → Chat (AI context)
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { BlocklyEditor } from '../blockly/BlocklyEditor';
import { MinecraftSimulator } from './MinecraftSimulator';
import {
    Blocks,
    Eye,
    Download,
    Save,
    RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ipcClient } from '@/ipc/ipc_client';

interface MinecraftBlocksIntegrationProps {
    appId: number;
    appPath: string;
}

export function MinecraftBlocksIntegration({ appId, appPath }: MinecraftBlocksIntegrationProps) {
    const [generatedCode, setGeneratedCode] = useState<string>('');
    const [showSimulator, setShowSimulator] = useState(true);
    const [splitRatio, setSplitRatio] = useState(50);
    const [workspace, setWorkspace] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const saveTimeoutRef = useRef<NodeJS.Timeout>();

    // Load initial workspace from file
    useEffect(() => {
        loadWorkspaceFromFile();
    }, [appId, appPath]);

    // Listen for file changes from AI
    useEffect(() => {
        const handleFileChange = (event: any) => {
            if (event.appId === appId && event.fileName === 'workspace.json') {
                console.log('📝 workspace.json changed by AI, reloading...');
                loadWorkspaceFromFile();
            }
        };

        // Listen for file write events
        window.addEventListener('file-written', handleFileChange);
        return () => window.removeEventListener('file-written', handleFileChange);
    }, [appId]);

    /**
     * Load workspace.json from file system
     */
    const loadWorkspaceFromFile = async () => {
        try {
            console.log('📂 [FILE LOAD] Reading workspace.json from:', appPath);
            const workspaceFile = await ipcClient.readFile(appPath, 'workspace.json');
            console.log('📄 [FILE LOAD] File content:', workspaceFile);

            if (workspaceFile) {
                const workspaceData = JSON.parse(workspaceFile as string);
                console.log('📦 [FILE LOAD] Parsed workspace data:', workspaceData);
                setWorkspace(workspaceData);
                console.log('✅ [FILE LOAD] Workspace state updated');
            } else {
                console.log('⚠️ [FILE LOAD] No workspace file found');
            }
        } catch (error) {
            console.error('❌ [FILE LOAD] Failed to load workspace:', error);
        }
    };

    /**
     * Handle workspace changes from BlocklyEditor
     * Debounced save to avoid spam
     */
    const handleWorkspaceChange = useCallback((data: {
        workspaceJson: any;
        generatedCode: string;
        generatedCodeMap?: Record<string, string>;
    }) => {
        console.log('🔄 Workspace changed:', data);
        setGeneratedCode(data.generatedCode || '');
        setWorkspace(data.workspaceJson);

        // Debounced save
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(async () => {
            await saveWorkspaceToFile(data.workspaceJson);
        }, 1000); // Save after 1 second of inactivity
    }, [appPath]);

    /**
     * Save workspace to file system
     */
    const saveWorkspaceToFile = async (workspaceData: any) => {
        setIsSaving(true);
        try {
            await ipcClient.writeFile(
                appPath,
                'workspace.json',
                JSON.stringify(workspaceData, null, 2)
            );
            setLastSaved(new Date());
            console.log('💾 Saved workspace to file');
        } catch (error) {
            console.error('Failed to save workspace:', error);
        } finally {
            setIsSaving(false);
        }
    };

    /**
     * Convert JavaScript-style code to mcfunction
     */
    const getMcfunctionCode = (): string => {
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

                    {/* Save indicator */}
                    {isSaving && (
                        <div className="flex items-center gap-2 text-xs text-blue-400">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            Saving...
                        </div>
                    )}
                    {lastSaved && !isSaving && (
                        <div className="flex items-center gap-2 text-xs text-green-400">
                            <Save className="w-3 h-3" />
                            Saved {lastSaved.toLocaleTimeString()}
                        </div>
                    )}
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
                        initialWorkspace={workspace}
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

export default MinecraftBlocksIntegration;
