import React, { useEffect, useState } from 'react';
import { useSearch, useNavigate } from '@tanstack/react-router';
import { IpcClient } from '@/ipc/ipc_client';
import { ArcadeEditor } from '@/components/arcade/ArcadeEditor';
import { ArcadeChat } from '@/components/arcade/ArcadeChat';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MessageSquare, Play, Download } from 'lucide-react';
import { toast } from 'sonner';

export default function ArcadePage() {
    const params = useSearch({ from: '/arcade' });
    const appId = (params as any).id;
    const navigate = useNavigate();
    const [app, setApp] = useState<any>(null);
    const [project, setProject] = useState<any>(null);
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

                // Load arcade project data
                try {
                    const result = await client.readFile({ appId, filePath: 'arcade-project.json' });
                    if (result && result.content) {
                        setProject(JSON.parse(result.content));
                    }
                } catch (e) {
                    console.log("No arcade project found, starting fresh");
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

    const handleProjectChange = async (projectData: any) => {
        if (!app) return;

        setLastSaved(new Date());

        // Store in localStorage as backup
        try {
            localStorage.setItem(`arcade-project-${appId}`, JSON.stringify(projectData));
        } catch (err) {
            console.error("Failed to save to localStorage", err);
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
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                    <div className="h-6 w-px bg-border" />
                    <div className="flex flex-col">
                        <h1 className="text-sm font-semibold">{app.title || 'Untitled Arcade Game'}</h1>
                        {lastSaved && (
                            <span className="text-xs text-muted-foreground">
                                Last saved: {lastSaved.toLocaleTimeString()}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 no-app-region-drag">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsChatOpen(!isChatOpen)}
                    >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        AI Assistant
                    </Button>

                    <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Export
                    </Button>

                    <Button variant="default" size="sm">
                        <Play className="h-4 w-4 mr-2" />
                        Run Game
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden relative">
                <ArcadeEditor
                    appId={appId}
                    initialProject={project}
                    onProjectChange={handleProjectChange}
                />

                {/* Arcade AI Chat Panel */}
                <ArcadeChat
                    appId={parseInt(appId)}
                    isOpen={isChatOpen}
                    onClose={() => setIsChatOpen(false)}
                />
            </div>
        </div>
    );
}
