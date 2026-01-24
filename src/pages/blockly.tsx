import React, { useEffect, useState } from 'react';
import { useSearch, useNavigate } from '@tanstack/react-router';
import { IpcClient } from '@/ipc/ipc_client';
import { BlocklyEditor } from '@/components/blockly/BlocklyEditor';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MessageSquare, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { BlockChat } from '@/components/blockly/BlockChat';

export default function BlocklyPage() {
    const params = useSearch({ from: '/blockly' });
    const appId = (params as any).id;
    const navigate = useNavigate();
    const [app, setApp] = useState<any>(null);
    const [workspace, setWorkspace] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [isChatOpen, setIsChatOpen] = useState(false);

    useEffect(() => {
        if (!appId) return;
        const load = async () => {
            try {
                const client = IpcClient.getInstance();
                const appData = await client.getApp(appId);
                setApp(appData);

                // Load workspace.json
                try {
                    const result = await client.readFile({ appId, filePath: 'workspace.json' });
                    if (result && result.content) {
                        setWorkspace(JSON.parse(result.content));
                    }
                } catch (e) {
                    console.log("No workspace found or empty, starting fresh");
                }
            } catch (err) {
                console.error("Failed to load app", err);
                toast.error("Failed to load app data");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [appId]);

    const handleSave = async ({ workspaceJson, generatedCode, generatedCodeMap }: { workspaceJson: any, generatedCode: string, generatedCodeMap?: Record<string, string> }) => {
        if (!app) return;

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
                toast.success('Workspace saved!');
            } else {
                toast.error('Failed to save workspace');
            }
        } catch (err: any) {
            // Silently handle IPC channel errors (will be fixed on app restart)
            if (!err?.message?.includes('Invalid channel')) {
                console.error("Failed to save workspace", err);
                toast.error("Failed to save workspace");
            }
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
                        <span className="font-semibold text-lg">{app.name}</span>
                        <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">Blocklaa</span>
                    </div>
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-2 no-app-region-drag">
                    {lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : 'Unsaved changes'}
                    <div className="h-4 w-px bg-border mx-2" />
                    <Button
                        variant={isChatOpen ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => setIsChatOpen(!isChatOpen)}
                        className="gap-2"
                    >
                        <MessageSquare className="w-4 h-4" />
                        Block Chat
                    </Button>
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
