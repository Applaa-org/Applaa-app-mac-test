import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Box, Download, ExternalLink, CheckCircle2, XCircle, AlertCircle, RefreshCw, Loader2, Rocket } from 'lucide-react';
import { IpcClient } from '@/ipc/ipc_client';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FolderOpen, FileJson } from 'lucide-react';

interface MinecraftModPreviewProps {
    app: any;
}

export const MinecraftModPreview: React.FC<MinecraftModPreviewProps> = ({ app }) => {
    const ipcClient = IpcClient.getInstance();
    const [checking, setChecking] = useState(true);
    const [installing, setInstalling] = useState(false);
    const [building, setBuilding] = useState(false);
    const [installLogs, setInstallLogs] = useState<string[]>([]);
    const [buildLogs, setBuildLogs] = useState<string[]>([]);
    const [jarPath, setJarPath] = useState<string | null>(null);
    const [buildError, setBuildError] = useState<string | null>(null);
    const [tools, setTools] = useState<{
        java: boolean;
        gradle: boolean;
        javaVersion?: string;
        gradleVersion?: string;
    } | null>(null);

    useEffect(() => {
        checkTools();
    }, []);

    const checkTools = async () => {
        setChecking(true);
        try {
            const result = await ipcClient.checkMinecraftTools();
            setTools(result);
        } catch (error) {
            console.error('Failed to check tools:', error);
        } finally {
            setChecking(false);
        }
    };

    const handleAutoInstall = async () => {
        setInstalling(true);
        setInstallLogs(['Starting automatic installation...']);

        // Listen for progress
        ipcClient.onMinecraftInstallProgress((log) => {
            setInstallLogs(prev => [...prev, log]);
        });

        try {
            const result = await ipcClient.installMinecraftTools();

            if (result.success) {
                setInstallLogs(prev => [...prev, '✅ Installation complete! Rechecking...']);
                await checkTools();
            } else {
                setInstallLogs(prev => [...prev, `❌ Error: ${result.error}`]);
            }
        } catch (error) {
            console.error('Installation failed:', error);
            setInstallLogs(prev => [...prev, `❌ Error: ${error instanceof Error ? error.message : String(error)}`]);
        } finally {
            setInstalling(false);
        }
    };

    const getModSpec = async () => {
        let mainClassCode = '';
        try {
            const filesReq = await ipcClient.listFiles(app.id);
            if (filesReq.success && filesReq.files) {
                // Find potential mod file
                // Prioritize file matching AppName or just "MyMod.java"
                const javaFiles = filesReq.files.filter(f => f.name.endsWith('.java'));
                const targetFile = javaFiles.find(f => f.name === 'MyMod.java') ||
                    javaFiles.find(f => f.name.toLowerCase().includes(app.name.toLowerCase())) ||
                    javaFiles[0];

                if (targetFile) {
                    const contentReq = await ipcClient.readFile({ appId: app.id, filePath: targetFile.path } as any);
                    if (contentReq.content) {
                        mainClassCode = contentReq.content;
                    }
                }
            }
        } catch (e) {
            console.warn("Failed to read mod files", e);
        }

        return {
            modId: app.name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
            modName: app.name,
            version: '1.0.0',
            description: `A custom Minecraft mod created with Applaa`,
            author: 'Applaa User',
            minecraftVersion: '1.20.1',
            loaderType: 'forge' as const,
            items: [],
            blocks: [],
            entities: [],
            commands: [],
            events: [],
            mainClass: mainClassCode,
            additionalClasses: {},
            dependencies: []
        };
    };

    const handleBuildMod = async () => {
        setBuilding(true);
        setBuildLogs([]);
        setBuildError(null);
        setJarPath(null);

        try {
            const spec = await getModSpec();

            if (!spec.mainClass) {
                setBuildError("No Java file found! Please ask the AI to write 'MyMod.java' first.");
                setBuilding(false);
                return;
            }

            const result = await ipcClient.buildMinecraftMod(spec);

            if (result.success) {
                setJarPath(result.jarPath);
                setBuildLogs(result.logs);
            } else {
                setBuildError(result.error || 'Build failed');
                setBuildLogs(result.logs);
            }
        } catch (error) {
            console.error('Build failed:', error);
            setBuildError(error instanceof Error ? error.message : 'Unknown error');
        } finally {
            setBuilding(false);
        }
    };

    const handleBuildAndTest = async () => {
        setBuilding(true);
        setBuildLogs([]);
        setBuildError(null);
        setJarPath(null);

        try {
            const spec = await getModSpec();

            if (!spec.mainClass) {
                setBuildError("No Java file found! Please ask the AI to write 'MyMod.java' first.");
                setBuilding(false);
                return;
            }

            const result = await ipcClient.buildAndTestMod(spec);

            if (result.success) {
                setJarPath(result.jarPath);
                setBuildLogs(result.logs);
            } else {
                setBuildError(result.error || 'Build failed');
                setBuildLogs(result.logs);
            }
        } catch (error) {
            console.error('Build and test failed:', error);
            setBuildError(error instanceof Error ? error.message : 'Unknown error');
        } finally {
            setBuilding(false);
        }
    };

    const allInstalled = tools?.java && tools?.gradle;

    return (
        <div className="flex flex-col h-full bg-background">
            <div className="flex items-center gap-2 p-4 border-b">
                <Box className="h-6 w-6 text-green-600" />
                <h2 className="text-lg font-semibold tracking-tight">Minecraft Mod Builder</h2>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">

                {/* Build Success */}
                {jarPath && (
                    <Alert className="border-green-200 bg-green-50 dark:bg-green-900/20">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-800 dark:text-green-300">
                            <strong>Build Successful!</strong> Your mod is ready at: <code className="text-xs bg-black/10 px-1 py-0.5 rounded">{jarPath}</code>
                            <Button
                                variant="link"
                                className="ml-2 p-0 h-auto text-green-800 dark:text-green-300 underline"
                                onClick={() => ipcClient.showItemInFolder(jarPath)}
                            >
                                Open Location →
                            </Button>
                        </AlertDescription>
                    </Alert>
                )}

                {/* Build Error */}
                {buildError && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            <strong>Build Failed:</strong> {buildError}
                            {buildLogs.length > 0 && (
                                <details className="mt-2">
                                    <summary className="cursor-pointer text-sm">View logs</summary>
                                    <pre className="mt-2 text-xs bg-black/10 p-2 rounded overflow-auto max-h-40">
                                        {buildLogs.join('\n')}
                                    </pre>
                                </details>
                            )}
                        </AlertDescription>
                    </Alert>
                )}

                {/* Prerequisites Status */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Build Tools</CardTitle>
                                <CardDescription>
                                    Required to compile your mod into a .jar file
                                </CardDescription>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={checkTools}
                                disabled={checking || installing}
                            >
                                {checking ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Checking...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="mr-2 h-4 w-4" />
                                        Recheck
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {checking ? (
                            <div className="text-center py-8 text-muted-foreground">
                                Checking your system...
                            </div>
                        ) : (
                            <>
                                {/* Java Status */}
                                <div className="flex items-start justify-between p-4 border rounded-lg">
                                    <div className="flex items-start gap-3">
                                        {tools?.java ? (
                                            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                                        ) : (
                                            <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                                        )}
                                        <div className="flex-1">
                                            <div className="font-semibold">Java Development Kit (JDK) 17+</div>
                                            {tools?.java ? (
                                                <div className="text-sm text-green-600 dark:text-green-400">
                                                    ✓ Installed: {tools.javaVersion?.split('\n')[0] || 'Version detected'}
                                                </div>
                                            ) : (
                                                <div className="text-sm text-muted-foreground mt-1">
                                                    Required to compile Minecraft mods
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {!tools?.java && !installing && (
                                        <Button
                                            size="sm"
                                            onClick={() => ipcClient.openExternalUrl('https://adoptium.net/temurin/releases/?version=17')}
                                        >
                                            <Download className="mr-2 h-4 w-4" />
                                            Download
                                        </Button>
                                    )}
                                </div>

                                {/* Gradle Status */}
                                <div className="flex items-start justify-between p-4 border rounded-lg">
                                    <div className="flex items-start gap-3">
                                        {tools?.gradle ? (
                                            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                                        ) : (
                                            <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                                        )}
                                        <div className="flex-1">
                                            <div className="font-semibold">Gradle Build Tool</div>
                                            {tools?.gradle ? (
                                                <div className="text-sm text-green-600 dark:text-green-400">
                                                    ✓ Installed: {tools.gradleVersion?.split('\n')[0] || 'Version detected'}
                                                </div>
                                            ) : (
                                                <div className="text-sm text-muted-foreground mt-1">
                                                    Required to build and package mods
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {!tools?.gradle && !installing && (
                                        <Button
                                            size="sm"
                                            onClick={() => ipcClient.openExternalUrl('https://gradle.org/install/')}
                                        >
                                            <Download className="mr-2 h-4 w-4" />
                                            Download
                                        </Button>
                                    )}
                                </div>

                                {/* Installation Progress */}
                                {installing && (
                                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                                            <span className="font-semibold text-blue-800 dark:text-blue-300">
                                                Installing build tools...
                                            </span>
                                        </div>
                                        <div className="space-y-1 max-h-32 overflow-y-auto">
                                            {installLogs.map((log, i) => (
                                                <div key={i} className="text-xs text-blue-700 dark:text-blue-400 font-mono">
                                                    {log}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                {!allInstalled && !installing && (
                                    <Button
                                        onClick={handleAutoInstall}
                                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                                        size="lg"
                                    >
                                        <Download className="mr-2 h-5 w-5" />
                                        Auto-Install Build Tools
                                    </Button>
                                )}

                                {allInstalled && (
                                    <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                                            <span className="font-semibold text-green-800 dark:text-green-300">
                                                All build tools are ready!
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Build & Assets Section */}
                {allInstalled && (
                    <Tabs defaultValue="build" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="build">Build & Test</TabsTrigger>
                            <TabsTrigger value="assets">Assets & Models</TabsTrigger>
                        </TabsList>

                        <TabsContent value="build">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Build Your Mod</CardTitle>
                                    <CardDescription>
                                        Compile your Java code into a Minecraft mod (.jar file)
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {building && (
                                        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                                            <div className="flex items-center gap-2 mb-3">
                                                <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
                                                <span className="font-semibold text-purple-800 dark:text-purple-300">
                                                    Building mod... (This may take a few minutes)
                                                </span>
                                            </div>
                                            {buildLogs.length > 0 && (
                                                <div className="space-y-1 max-h-32 overflow-y-auto">
                                                    {buildLogs.map((log, i) => (
                                                        <div key={i} className="text-xs text-purple-700 dark:text-purple-400 font-mono">
                                                            {log}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <Button
                                        onClick={handleBuildMod}
                                        disabled={building}
                                        variant="outline"
                                        className="w-full"
                                        size="lg"
                                    >
                                        {building ? (
                                            <>
                                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                                Building...
                                            </>
                                        ) : (
                                            <>
                                                <Box className="mr-2 h-5 w-5" />
                                                Build Mod (.jar)
                                            </>
                                        )}
                                    </Button>

                                    <Button
                                        onClick={handleBuildAndTest}
                                        disabled={building}
                                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                                        size="lg"
                                    >
                                        {building ? (
                                            <>
                                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                                Building & Testing...
                                            </>
                                        ) : (
                                            <>
                                                <Rocket className="mr-2 h-5 w-5" />
                                                Build & Test in Minecraft
                                            </>
                                        )}
                                    </Button>

                                    <Button
                                        variant="outline"
                                        className="w-full"
                                        onClick={() => ipcClient.showItemInFolder(app.path)}
                                    >
                                        <ExternalLink className="mr-2 h-4 w-4" />
                                        Open Project Folder
                                    </Button>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="assets">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Mod Assets</CardTitle>
                                    <CardDescription>
                                        View extracted structures (.nbt) and models from your built mod.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {!jarPath ? (
                                        <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                                            <Box className="h-10 w-10 mx-auto mb-2 opacity-50" />
                                            <p>Build your mod first to see assets!</p>
                                        </div>
                                    ) : (
                                        <AssetsView jarPath={jarPath} ipcClient={ipcClient} />
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                )}

                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-900">
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                        💡 <b>Tip:</b> Use the chat to add features, then rebuild to see changes in Minecraft!
                    </p>
                </div>
            </div>
        </div>
    );
};

const AssetsView: React.FC<{ jarPath: string; ipcClient: IpcClient }> = ({ jarPath, ipcClient }) => {
    const [assets, setAssets] = useState<Array<{ name: string; path: string; type: string; relativePath: string }>>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (jarPath) loadAssets();
    }, [jarPath]);

    const loadAssets = async () => {
        setLoading(true);
        try {
            const res = await ipcClient.extractAssets(jarPath);
            if (res.success) {
                setAssets(res.assets);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                    {assets.length} assets found
                </div>
                <Button size="sm" variant="outline" onClick={loadAssets} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            <div className="border rounded-lg max-h-60 overflow-y-auto bg-background">
                {assets.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                        No assets found (structures or models).
                    </div>
                ) : (
                    <div className="divide-y">
                        {assets.map((a, i) => (
                            <div key={i} className="flex items-center justify-between p-2 text-sm hover:bg-muted/50">
                                <div className="flex items-center gap-2">
                                    {a.type === 'structure' ? (
                                        <Box className="h-4 w-4 text-orange-500" />
                                    ) : (
                                        <FileJson className="h-4 w-4 text-blue-500" />
                                    )}
                                    <span className="font-medium">{a.name}</span>
                                    <span className="text-xs text-muted-foreground ml-2">({a.relativePath})</span>
                                </div>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => ipcClient.showItemInFolder(a.path)}
                                    title="Show in Folder"
                                >
                                    <FolderOpen className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="p-4 bg-muted/50 rounded-lg text-sm">
                <p>
                    <strong>How to Preview:</strong>
                    <br />
                    • <b>Structures (.nbt):</b> Use <a href="#" onClick={() => ipcClient.openExternalUrl('https://cubical.xyz')} className="text-blue-500 hover:underline">Cubical.xyz</a> (Drag & Drop).
                    <br />
                    • <b>Models (.json):</b> Use <a href="#" onClick={() => ipcClient.openExternalUrl('https://web.blockbench.net/')} className="text-blue-500 hover:underline">Blockbench</a>.
                </p>
            </div>
        </div>
    );
};
