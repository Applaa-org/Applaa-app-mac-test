/**
 * MinecraftDirectEditor - Simple Minecraft Editor with 3D Preview
 * 
 * Replaces complex Blockly editor with direct mcfunction code + 3D voxel preview.
 * LLM generates mcfunction commands directly.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Play, Download, RefreshCw, Wand2, Eye, Code } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ApplaaViewer3D } from '@/components/viewer/ApplaaViewer3D';
import { parseMcfunction, generateSampleHouse, MinecraftBlock } from '@/components/viewer/MinecraftAdapter';
import { showSuccess, showError } from '@/lib/toast';
import { IpcClient } from '@/ipc/ipc_client';

interface MinecraftDirectEditorProps {
    appId: string;
    appPath: string;
    initialCode?: string;
    onCodeChange?: (code: string) => void;
}

export const MinecraftDirectEditor: React.FC<MinecraftDirectEditorProps> = ({
    appId,
    appPath,
    initialCode,
    onCodeChange
}) => {
    const [code, setCode] = useState<string>(initialCode || generateSampleHouse());
    const [blocks, setBlocks] = useState<MinecraftBlock[]>([]);
    const [messages, setMessages] = useState<string[]>([]);
    const [viewMode, setViewMode] = useState<'split' | 'preview' | 'code'>('split');
    const [isGenerating, setIsGenerating] = useState(false);
    const [lastSavedCode, setLastSavedCode] = useState<string | null>(null);

    // Save code to file system
    const saveCode = useCallback(async (content: string) => {
        try {
            const ipcClient = IpcClient.getInstance();
            // Write to the correct behavior pack path (relative from app root)
            const filePath = 'behavior_pack/functions/main.mcfunction';

            console.log('[MinecraftDirectEditor] Saving code for appId:', appId, 'to:', filePath);

            await ipcClient.editAppFile(parseInt(appId), filePath, content);
            setLastSavedCode(content);
            console.log('[MinecraftDirectEditor] ✅ File saved successfully');
        } catch (error) {
            console.error('[MinecraftDirectEditor] Failed to save code:', error);
            showError('Failed to save changes to disk');
        }
    }, [appId]);

    // Parse code and update 3D preview
    const updatePreview = useCallback(() => {
        try {
            const result = parseMcfunction(code);
            setBlocks(result.blocks);
            setMessages(result.messages);

            if (result.errors.length > 0) {
                console.warn('Parse errors:', result.errors);
            }
        } catch (error) {
            console.error('Failed to parse mcfunction:', error);
        }
    }, [code]);

    // Load code from file system
    const loadFile = useCallback(async () => {
        try {
            const ipcClient = IpcClient.getInstance();
            // readAppFile expects a relative path from the app directory
            const filePath = 'behavior_pack/functions/main.mcfunction';

            console.log('[MinecraftDirectEditor] Loading code for appId:', appId, 'from:', filePath);

            const content = await ipcClient.readAppFile(parseInt(appId), filePath);
            if (content) {
                console.log('[MinecraftDirectEditor] ✅ Successfully loaded file, length:', content.length);
                setCode(content);
                setLastSavedCode(content);
                // Don't show success toast on auto-load to avoid spam
            } else {
                console.log('[MinecraftDirectEditor] ⚠️ File returned empty content');
            }
        } catch (error) {
            console.log('[MinecraftDirectEditor] ℹ️ No existing file found or failed to load, using default.', error);
        }
    }, [appId]);

    // Check localStorage for template on mount AND save it
    useEffect(() => {
        const templateCode = localStorage.getItem('minecraft-template-code');
        const templateName = localStorage.getItem('minecraft-template-name');

        if (templateCode) {
            console.log('[MinecraftDirectEditor] Found template in storage:', templateName);
            setCode(templateCode);

            // Save immediately to disk so it persists
            saveCode(templateCode);

            // Clear localStorage after loading
            localStorage.removeItem('minecraft-template-code');
            localStorage.removeItem('minecraft-template-name');
            showSuccess(`${templateName || 'Template'} loaded and saved!`);
        } else if (!lastSavedCode && !initialCode) {
            // If no template path and no initial code, try to load from disk
            loadFile();
        }
    }, [saveCode, loadFile, initialCode, lastSavedCode]);

    // 🚀 AUTO-RELOAD: When appId or appPath changes, reload the file and preview
    useEffect(() => {
        if (appId && appPath) {
            console.log('[MinecraftDirectEditor] Auto-reloading file for appId:', appId);
            loadFile();
        }
    }, [appId, appPath, loadFile]);

    // Update preview when code changes
    useEffect(() => {
        updatePreview();
    }, [code, updatePreview]);

    // Handle code change
    const handleCodeChange = (newCode: string) => {
        setCode(newCode);
        onCodeChange?.(newCode);
    };

    // Load sample house
    const loadSample = () => {
        const sample = generateSampleHouse();
        handleCodeChange(sample);
        showSuccess('Loaded sample house!');
    };

    // Export as .mcaddon (placeholder for now)
    const exportAddon = async () => {
        showSuccess('Export to .mcaddon coming soon!');
        // TODO: Implement actual export
    };

    return (
        <div className="h-full flex flex-col bg-gray-900">
            {/* Toolbar */}
            <div className="flex items-center justify-between p-2 bg-gray-800 border-b border-gray-700">
                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        variant={viewMode === 'split' ? 'default' : 'ghost'}
                        onClick={() => setViewMode('split')}
                    >
                        Split
                    </Button>
                    <Button
                        size="sm"
                        variant={viewMode === 'preview' ? 'default' : 'ghost'}
                        onClick={() => setViewMode('preview')}
                    >
                        <Eye className="w-4 h-4 mr-1" />
                        Preview
                    </Button>
                    <Button
                        size="sm"
                        variant={viewMode === 'code' ? 'default' : 'ghost'}
                        onClick={() => setViewMode('code')}
                    >
                        <Code className="w-4 h-4 mr-1" />
                        Code
                    </Button>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={loadSample}
                    >
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Sample House
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={updatePreview}
                    >
                        <Play className="w-4 h-4 mr-1" />
                        Preview
                    </Button>
                    <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={exportAddon}
                    >
                        <Download className="w-4 h-4 mr-1" />
                        Export .mcaddon
                    </Button>
                </div>
            </div>

            {/* Main content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Code editor */}
                {(viewMode === 'split' || viewMode === 'code') && (
                    <div className={`${viewMode === 'split' ? 'w-1/2' : 'w-full'} p-4 border-r border-gray-700`}>
                        <div className="text-sm text-gray-400 mb-2">
                            mcfunction commands:
                        </div>
                        <Textarea
                            value={code}
                            onChange={(e) => handleCodeChange(e.target.value)}
                            className="h-full font-mono text-sm bg-gray-950 text-green-400 border-gray-700 resize-none"
                            placeholder="# Enter mcfunction commands here&#10;fill ~0 ~0 ~0 ~5 ~0 ~5 stone"
                        />
                    </div>
                )}

                {/* 3D Preview */}
                {(viewMode === 'split' || viewMode === 'preview') && (
                    <div className={`${viewMode === 'split' ? 'w-1/2' : 'w-full'} relative`}>
                        <ApplaaViewer3D
                            blocks={blocks}
                            showGrid={true}
                            showStats={false}
                        />

                        {/* Block count overlay */}
                        <div className="absolute bottom-4 left-4 bg-black/50 text-white px-3 py-1 rounded text-sm">
                            {blocks.length} blocks
                        </div>

                        {/* Messages overlay */}
                        {messages.length > 0 && (
                            <div className="absolute top-4 left-4 bg-black/70 text-yellow-300 px-3 py-2 rounded text-sm max-w-md">
                                {messages.map((msg, i) => (
                                    <div key={i}>{msg}</div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default MinecraftDirectEditor;
