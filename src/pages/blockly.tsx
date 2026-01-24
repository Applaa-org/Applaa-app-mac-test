import React, { useEffect, useState } from 'react';
import { useSearch, useNavigate } from '@tanstack/react-router';
import { IpcClient } from '@/ipc/ipc_client';
import { BlocklyEditor } from '@/components/blockly/BlocklyEditor';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MessageSquare, Trash2, Pencil, Check, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { BlockChat } from '@/components/blockly/BlockChat';
import { Input } from '@/components/ui/input';
import { useSetAtom } from 'jotai';
import { appsListAtom } from '@/atoms/appAtoms';

export default function BlocklyPage() {
    const params = useSearch({ from: '/blockly' });
    const appId = (params as any).id;
    const navigate = useNavigate();
    const [app, setApp] = useState<any>(null);
    const [workspace, setWorkspace] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [isChatOpen, setIsChatOpen] = useState(false);

    // Rename App State
    const [isEditingName, setIsEditingName] = useState(false);
    const [newName, setNewName] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const saveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    // Global State Sync
    const setAppsList = useSetAtom(appsListAtom);

    useEffect(() => {
        if (!appId) return;

        // CANCEL ANY PENDING SAVE from previous app
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = null;
        }
        setIsSaving(false);

        // Reset state immediately when appId changes to prevent stale data
        setLoading(true);
        setWorkspace(null);
        setApp(null);

        const load = async () => {
            try {
                const client = IpcClient.getInstance();
                
                // 🚀 OPTIMIZATION: Load app data and workspace in parallel
                const [appData, workspaceResult] = await Promise.allSettled([
                    client.getApp(appId),
                    client.readFile({ appId, filePath: 'workspace.json' }).catch(() => null)
                ]);

                // Handle app data
                if (appData.status === 'fulfilled') {
                    setApp(appData.value);
                    setNewName(appData.value.displayName || appData.value.name);
                    // Show UI immediately after app data loads
                    setLoading(false);
                } else {
                    throw appData.reason;
                }

                // Handle workspace data
                let loadedWorkspace = null;
                if (workspaceResult.status === 'fulfilled' && workspaceResult.value?.content) {
                    try {
                        loadedWorkspace = JSON.parse(workspaceResult.value.content);
                        console.log("✅ Loaded workspace from Backend");
                    } catch (parseErr) {
                        console.warn("Failed to parse workspace.json", parseErr);
                    }
                }

                // EMERGENCY FALLBACK: Check LocalStorage if backend failed
                if (!loadedWorkspace) {
                    const backup = localStorage.getItem(`blockly-backup-${appId}`);
                    if (backup) {
                        try {
                            loadedWorkspace = JSON.parse(backup);
                            console.log("🛡️ Loaded workspace from LocalStorage Backup");
                            toast.success("Restored from local backup");
                        } catch (jsonErr) {
                            console.error("Failed to parse backup", jsonErr);
                        }
                    }
                }

                if (loadedWorkspace) {
                    setWorkspace(loadedWorkspace);
                } else {
                    console.log("⚪ No workspace found (New App)");
                }

            } catch (err) {
                console.error("Failed to load app", err);
                toast.error("Failed to load app data");
                setLoading(false);
            }
        };
        load();
    }, [appId]);

    const handleSave = async ({ workspaceJson, generatedCode, generatedCodeMap }: { workspaceJson: any, generatedCode: string, generatedCodeMap?: Record<string, string> }) => {
        if (!app) return;

        // Clear existing timeout
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        setIsSaving(true);

        // IMMEDIATE LOCAL BACKUP (Synchronous protection)
        try {
            localStorage.setItem(`blockly-backup-${appId}`, JSON.stringify(workspaceJson));
        } catch (storageErr) {
            console.warn("Quota exceeded for local backup", storageErr);
        }

        // Debounce save (1 second)
        saveTimeoutRef.current = setTimeout(async () => {
            try {
                const client = IpcClient.getInstance();

                // Save to file system via IPC
                const result = await client.saveBlocklyWorkspace({
                    appId,
                    workspaceJson,
                    generatedCode: generatedCodeMap || {
                        javascript: generatedCode,
                        python: '',
                        php: '',
                        lua: '',
                        dart: '',
                        xml: '',
                        json: JSON.stringify(workspaceJson, null, 2)
                    }
                });

                if (result.success) {
                    setLastSaved(new Date());
                    // toast.success('Workspace saved!'); // Too noisy with auto-save
                } else {
                    toast.error('Failed to save workspace');
                }
            } catch (err: any) {
                // Silently handle IPC channel errors (will be fixed on app restart)
                if (!err?.message?.includes('Invalid channel')) {
                    console.error("Failed to save workspace", err);
                    toast.error("Failed to save workspace");
                }
            } finally {
                setIsSaving(false);
            }
        }, 1000);
    };

    const handleRename = async () => {
        if (!newName.trim() || !app) return;

        try {
            // Optimistic update
            const oldName = app.name;
            setApp({ ...app, name: newName, displayName: newName });
            setIsEditingName(false);

            const client = IpcClient.getInstance();
            const result = await client.renameApp(appId, newName);

            if (result.success) {
                toast.success('App renamed');
                // Update global app list for sidebar
                setAppsList(prev => prev.map(a => a.id === Number(appId) ? { ...a, name: newName } : a));
            } else {
                // Revert on failure
                setApp({ ...app, name: oldName, displayName: oldName });
                toast.error('Failed to rename: ' + result.error);
            }
        } catch (e) {
            toast.error('Failed to rename app');
        }
    };

    const handleDelete = async () => {
        if (!confirm(`Delete "${app?.name}"? This cannot be undone.`)) return;

        try {
            const client = IpcClient.getInstance();
            await client.deleteApp(appId);
            toast.success('App deleted');
            navigate({ to: '/' });
        } catch (err) {
            toast.error('Failed to delete app');
        }
    };

    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-background">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!app) {
        return <div className="p-8">App not found</div>;
    }

    return (
        <div className="h-full w-full flex flex-col bg-background">
            <div className="h-14 border-b flex items-center justify-between px-4 bg-card app-region-drag select-none">
                <div className="flex items-center gap-4 no-app-region-drag">
                    <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/' })}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
                    </Button>
                    <div className="flex items-center gap-2">
                        {isEditingName ? (
                            <div className="flex items-center gap-1">
                                <Input
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                    className="h-7 w-48 text-sm"
                                    autoFocus
                                    onKeyDown={e => e.key === 'Enter' && handleRename()}
                                />
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleRename}>
                                    <Check className="w-4 h-4 text-green-500" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setIsEditingName(false)}>
                                    <X className="w-4 h-4 text-red-500" />
                                </Button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditingName(true)}>
                                <span className="font-semibold text-lg">{app.displayName || app.name}</span>
                                <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        )}
                        <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">Blocklaa</span>
                    </div>
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-2 no-app-region-drag">
                    {isSaving ? (
                        <span className="flex items-center gap-1 text-primary">
                            <Loader2 className="w-3 h-3 animate-spin" /> Saving...
                        </span>
                    ) : (
                        <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">
                                {lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : 'Unsaved changes'}
                            </span>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-xs px-2"
                                onClick={() => {
                                    if (workspace && app) {
                                        // Manual trigger
                                        // We need to re-generate logic or just trigger the change event?
                                        // Ideally we pass a 'forceSave' prop or expose a ref, but for now
                                        // we can just rely on the auto-save or trigger a state update.
                                        // Actually, let's just show the status for now, or trigger a "touch".
                                        toast.info("Saving...");
                                        // To force save, we call workspace change
                                        const event = new CustomEvent('force-save');
                                        window.dispatchEvent(event);
                                    }
                                }}
                            >
                                Save Now
                            </Button>
                        </div>
                    )}
                    <div className="h-4 w-px bg-border mx-2" />
                    {/* Block Chat Disabled by User Request */}
                    {/* <div className="h-4 w-px bg-border mx-2" />
                    <Button
                        variant={isChatOpen ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => setIsChatOpen(!isChatOpen)}
                        className="gap-2"
                    >
                        <MessageSquare className="w-4 h-4" />
                        Block Chat
                    </Button> */}
                    <div className="h-4 w-px bg-border mx-2" />
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDelete}
                        className="gap-2 text-destructive hover:text-destructive"
                    >
                        <Trash2 className="w-4 h-4" />
                        Delete
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden relative">
                <BlocklyEditor
                    appId={appId}
                    initialWorkspace={workspace}
                    onWorkspaceChange={handleSave}
                    isLoading={loading}
                />

                {/* Block Chat - Fixed overlay panel */}
                <BlockChat
                    appId={Number(appId)}
                    isOpen={isChatOpen}
                    onClose={() => setIsChatOpen(false)}
                />
            </div>
        </div>
    );
}
