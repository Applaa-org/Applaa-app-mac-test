/**
 * Simplified Minecraft Mod Preview Component
 * Shows prerequisites status and installation UI instead of live preview
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, Download, ExternalLink, Loader2, FolderOpen } from 'lucide-react';
import { IpcClient } from '@/ipc/ipc_client';

interface MinecraftModPreviewProps {
    app: any;
}

export function MinecraftModPreview({ app }: MinecraftModPreviewProps) {
    const [prerequisites, setPrerequisites] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [installing, setInstalling] = useState(false);

    useEffect(() => {
        checkPrerequisites();
    }, []);

    const checkPrerequisites = async () => {
        setLoading(true);
        try {
            const ipcClient = IpcClient.getInstance();
            const result = await ipcClient.minecraftCheckPrerequisites();
            setPrerequisites(result);
        } catch (error) {
            console.error('Failed to check prerequisites:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInstallMCreator = async () => {
        const url = 'https://mcreator.net/download';
        const ipcClient = IpcClient.getInstance();
        await ipcClient.openExternalUrl(url);
    };

    const handleInstallJava = async () => {
        const url = 'https://adoptium.net/temurin/releases/?version=17';
        const ipcClient = IpcClient.getInstance();
        await ipcClient.openExternalUrl(url);
    };

    const handleTestInMCreator = async () => {
        if (!prerequisites?.mcreator?.installed) {
            return;
        }

        try {
            setInstalling(true);
            const ipcClient = IpcClient.getInstance();
            await ipcClient.minecraftOpenInMCreator({
                appPath: app.path,
                mcreatorPath: prerequisites.mcreator.path,
            });
        } catch (error) {
            console.error('Failed to open in MCreator:', error);
        } finally {
            setInstalling(false);
        }
    };

    const handleOpenFolder = async () => {
        const ipcClient = IpcClient.getInstance();
        await ipcClient.showItemInFolder(app.path);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    const allReady = prerequisites?.mcreator?.installed && prerequisites?.java?.installed;

    return (
        <div className="h-full overflow-auto p-6 space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold">🧊 Minecraft Mod</h2>
                <p className="text-muted-foreground">
                    {app.name || 'Untitled Mod'}
                </p>
            </div>

            {/* Prerequisites Status */}
            <Card>
                <CardHeader>
                    <CardTitle>Prerequisites</CardTitle>
                    <CardDescription>
                        Required tools to build and test your Minecraft mod
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* MCreator Status */}
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                            {prerequisites?.mcreator?.installed ? (
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                            ) : (
                                <XCircle className="w-5 h-5 text-red-500" />
                            )}
                            <div>
                                <div className="font-medium">MCreator</div>
                                <div className="text-sm text-muted-foreground">
                                    {prerequisites?.mcreator?.installed
                                        ? `Version ${prerequisites.mcreator.version || 'Unknown'}`
                                        : 'Not installed'}
                                </div>
                            </div>
                        </div>
                        {!prerequisites?.mcreator?.installed && (
                            <Button onClick={handleInstallMCreator} size="sm">
                                <Download className="w-4 h-4 mr-2" />
                                Download
                            </Button>
                        )}
                    </div>

                    {/* Java Status */}
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                            {prerequisites?.java?.installed ? (
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                            ) : (
                                <XCircle className="w-5 h-5 text-red-500" />
                            )}
                            <div>
                                <div className="font-medium">Java 17+</div>
                                <div className="text-sm text-muted-foreground">
                                    {prerequisites?.java?.installed
                                        ? `Version ${prerequisites.java.version || 'Unknown'}`
                                        : 'Not installed'}
                                </div>
                            </div>
                        </div>
                        {!prerequisites?.java?.installed && (
                            <Button onClick={handleInstallJava} size="sm">
                                <Download className="w-4 h-4 mr-2" />
                                Download
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Installation Instructions */}
            {!allReady && (
                <Alert>
                    <AlertDescription>
                        <div className="space-y-2">
                            <p className="font-medium">📋 Installation Steps:</p>
                            <ol className="list-decimal list-inside space-y-1 text-sm">
                                {!prerequisites?.java?.installed && (
                                    <li>Download and install Java 17 (click Download button above)</li>
                                )}
                                {!prerequisites?.mcreator?.installed && (
                                    <li>Download and install MCreator (click Download button above)</li>
                                )}
                                <li>Restart Applaa after installation</li>
                                <li>Come back here to test your mod!</li>
                            </ol>
                        </div>
                    </AlertDescription>
                </Alert>
            )}

            {/* Test Button */}
            {allReady && (
                <Card className="border-primary">
                    <CardHeader>
                        <CardTitle>🎮 Ready to Test!</CardTitle>
                        <CardDescription>
                            Your mod is ready. Click below to open it in MCreator and test in Minecraft.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Button
                            onClick={handleTestInMCreator}
                            disabled={installing}
                            className="w-full"
                            size="lg"
                        >
                            {installing ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Opening MCreator...
                                </>
                            ) : (
                                <>
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    Test in MCreator
                                </>
                            )}
                        </Button>

                        <Button
                            onClick={handleOpenFolder}
                            variant="outline"
                            className="w-full"
                        >
                            <FolderOpen className="w-4 h-4 mr-2" />
                            Open Mod Folder
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Generated Files */}
            <Card>
                <CardHeader>
                    <CardTitle>Generated Files</CardTitle>
                    <CardDescription>
                        Your mod files are ready in the project folder
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2 font-mono text-sm">
                        {app.files?.slice(0, 10).map((file: string, index: number) => (
                            <div key={index} className="text-muted-foreground">
                                📄 {file}
                            </div>
                        ))}
                        {app.files?.length > 10 && (
                            <div className="text-muted-foreground">
                                ... and {app.files.length - 10} more files
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* How to Use */}
            <Card>
                <CardHeader>
                    <CardTitle>📖 How to Use Your Mod</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                    <p>1. Click "Test in MCreator" to open your mod project</p>
                    <p>2. In MCreator, click the "Run Client" button</p>
                    <p>3. Minecraft will launch with your mod loaded</p>
                    <p>4. Test your mod in the game!</p>
                    <p className="text-muted-foreground mt-4">
                        💡 Tip: Check the README.md file in your mod folder for specific commands and features.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
