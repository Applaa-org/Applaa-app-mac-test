import React, { useState, useEffect, useCallback } from 'react';
import { Copy, Save, FileCode, Check, RefreshCw, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { IpcClient } from '@/ipc/ipc_client';
import { showSuccess, showError } from '@/lib/toast';
import { downloadRbxmx } from '@/services/roblox/rbxmx_generator';

interface RobloxEditorProps {
    appId: string;
    appPath: string;
}

type Tab = 'server' | 'client' | 'shared';

export const RobloxEditor: React.FC<RobloxEditorProps> = ({ appId, appPath }) => {
    const [activeTab, setActiveTab] = useState<Tab>('server');
    const [files, setFiles] = useState({
        server: { path: 'src/ServerScriptService/main.server.lua', content: '' },
        client: { path: 'src/StarterPlayer/StarterPlayerScripts/main.client.lua', content: '' },
        shared: { path: 'src/ReplicatedStorage/config.lua', content: '' }
    });
    const [isLoading, setIsLoading] = useState(true);

    const loadFiles = useCallback(async () => {
        setIsLoading(true);
        try {
            const ipcClient = IpcClient.getInstance();
            // Deep copy to avoid reference issues
            const newFiles = JSON.parse(JSON.stringify(files));

            for (const key of Object.keys(newFiles) as Tab[]) {
                try {
                    const content = await ipcClient.readAppFile(parseInt(appId), newFiles[key].path);
                    newFiles[key].content = content || '';
                } catch (e) {
                    console.warn(`[RobloxEditor] Failed to load ${key} file`, e);
                }
            }
            setFiles(newFiles);
        } catch (error) {
            console.error('[RobloxEditor] Failed to load files:', error);
            showError('Failed to load project files');
        } finally {
            setIsLoading(false);
        }
    }, [appId]);

    // Initial load
    useEffect(() => {
        loadFiles();
    }, [appId]);

    // Polling for file changes (simple auto-reload mostly for when AI writes to files)
    useEffect(() => {
        const interval = setInterval(() => {
            loadFiles();
        }, 5000);
        return () => clearInterval(interval);
    }, [loadFiles]);

    const handleCodeChange = (newCode: string) => {
        setFiles(prev => ({
            ...prev,
            [activeTab]: { ...prev[activeTab], content: newCode }
        }));
    };

    const saveCurrentFile = async () => {
        try {
            const ipcClient = IpcClient.getInstance();
            await ipcClient.editAppFile(parseInt(appId), files[activeTab].path, files[activeTab].content);
            showSuccess('File saved successfully!');
        } catch (error) {
            console.error('[RobloxEditor] Save failed:', error);
            showError('Failed to save file');
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(files[activeTab].content);
        showSuccess('Copied! Paste into a Script in Roblox Studio.');
    };

    const handleDownloadRbxmx = () => {
        try {
            downloadRbxmx({
                appName: `roblox-project-${appId}`,
                serverScript: files.server.content,
                clientScript: files.client.content,
                sharedModule: files.shared.content
            });
            showSuccess('Downloaded! Drag the .rbxmx file into Roblox Studio.');
        } catch (error) {
            console.error('[RobloxEditor] Download failed:', error);
            showError('Failed to generate RBXMX file');
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-950 text-slate-100 font-sans">
            {/* Toolbar */}
            <div className="flex items-center justify-between p-3 bg-slate-900 border-b border-slate-800 shadow-sm">
                <div className="flex gap-2">
                    <Button
                        variant={activeTab === 'server' ? 'default' : 'ghost'}
                        onClick={() => setActiveTab('server')}
                        className={`h-8 text-xs font-medium ${activeTab === 'server' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        <FileCode className="w-3.5 h-3.5 mr-2" />
                        Server
                    </Button>
                    <Button
                        variant={activeTab === 'client' ? 'default' : 'ghost'}
                        onClick={() => setActiveTab('client')}
                        className={`h-8 text-xs font-medium ${activeTab === 'client' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        <FileCode className="w-3.5 h-3.5 mr-2" />
                        Client
                    </Button>
                    <Button
                        variant={activeTab === 'shared' ? 'default' : 'ghost'}
                        onClick={() => setActiveTab('shared')}
                        className={`h-8 text-xs font-medium ${activeTab === 'shared' ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        <FileCode className="w-3.5 h-3.5 mr-2" />
                        Config
                    </Button>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={loadFiles} title="Reload files" className="h-8 w-8 p-0 border-slate-700 bg-slate-800 hover:bg-slate-700">
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button variant="outline" size="sm" onClick={copyToClipboard} className="h-8 text-xs border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200">
                        <Copy className="w-3.5 h-3.5 mr-2" />
                        Copy Code
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDownloadRbxmx} className="h-8 text-xs border-purple-700 bg-purple-900/50 hover:bg-purple-800 text-purple-200">
                        <Download className="w-3.5 h-3.5 mr-2" />
                        Download .rbxmx
                    </Button>
                    <Button size="sm" onClick={saveCurrentFile} className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700">
                        <Save className="w-3.5 h-3.5 mr-2" />
                        Save
                    </Button>
                </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 relative bg-[#0d1117]">
                {isLoading && (
                    <div className="absolute top-2 right-4 z-10 text-xs text-slate-500 animate-pulse">
                        Loading...
                    </div>
                )}
                <Textarea
                    value={files[activeTab].content}
                    onChange={(e) => handleCodeChange(e.target.value)}
                    className="absolute inset-0 w-full h-full p-4 font-mono text-sm bg-transparent text-slate-300 resize-none border-none focus-visible:ring-0 rounded-none leading-relaxed"
                    spellCheck={false}
                    style={{ fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace" }}
                />
            </div>

            {/* Footer / Instructions */}
            <div className="p-2 px-4 bg-slate-900 border-t border-slate-800 text-[10px] text-slate-500 flex justify-between items-center select-none">
                <div className="flex gap-4">
                    <span className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'server' ? 'bg-blue-500' : activeTab === 'client' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        {activeTab === 'server' && "Runs on Server (ServerScriptService)"}
                        {activeTab === 'client' && "Runs on Client (StarterPlayerScripts)"}
                        {activeTab === 'shared' && "Shared Module (ReplicatedStorage)"}
                    </span>
                </div>
                <span className="opacity-50 font-mono">{files[activeTab].path}</span>
            </div>
        </div>
    );
};
