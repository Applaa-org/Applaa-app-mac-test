import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, Download, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import { IpcClient } from '@/ipc/ipc_client';

interface BuildTools {
    java: boolean;
    gradle: boolean;
    javaVersion?: string;
    gradleVersion?: string;
}

interface MinecraftPrerequisitesProps {
    onReady: () => void;
}

export const MinecraftPrerequisites: React.FC<MinecraftPrerequisitesProps> = ({ onReady }) => {
    const [checking, setChecking] = useState(true);
    const [tools, setTools] = useState<BuildTools | null>(null);
    const ipcClient = IpcClient.getInstance();

    const checkTools = async () => {
        setChecking(true);
        try {
            const result = await ipcClient.checkMinecraftTools();
            setTools(result);

            // If both are installed, automatically proceed
            if (result.java && result.gradle) {
                setTimeout(() => onReady(), 1000);
            }
        } catch (error) {
            console.error('Failed to check build tools:', error);
        } finally {
            setChecking(false);
        }
    };

    useEffect(() => {
        checkTools();
    }, []);

    const allInstalled = tools?.java && tools?.gradle;

    return (
        <div className="p-6 max-w-3xl mx-auto space-y-6">
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Minecraft Mod Builder Setup</h1>
                <p className="text-muted-foreground">
                    To build Minecraft mods, we need to check if you have the required tools installed.
                </p>
            </div>

            {checking ? (
                <Card>
                    <CardContent className="flex items-center justify-center py-12">
                        <div className="text-center space-y-3">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-600" />
                            <p className="text-sm text-muted-foreground">Checking your system...</p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <>
                    {/* Status Overview */}
                    {allInstalled && (
                        <Alert className="border-green-200 bg-green-50 dark:bg-green-900/20">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <AlertDescription className="text-green-800 dark:text-green-300">
                                <strong>All set!</strong> You have everything needed to build Minecraft mods.
                            </AlertDescription>
                        </Alert>
                    )}

                    {!allInstalled && (
                        <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
                            <AlertCircle className="h-4 w-4 text-yellow-600" />
                            <AlertDescription className="text-yellow-800 dark:text-yellow-300">
                                <strong>Setup Required:</strong> Please install the missing tools below to continue.
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Java Status */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {tools?.java ? (
                                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                                    ) : (
                                        <XCircle className="h-6 w-6 text-red-500" />
                                    )}
                                    <div>
                                        <CardTitle>Java Development Kit (JDK)</CardTitle>
                                        <CardDescription>
                                            {tools?.java
                                                ? `Installed: ${tools.javaVersion?.split('\n')[0] || 'Version detected'}`
                                                : 'Required to compile Minecraft mods'}
                                        </CardDescription>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        {!tools?.java && (
                            <CardContent className="space-y-4">
                                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                                    <h4 className="font-semibold text-sm mb-2">Installation Steps:</h4>
                                    <ol className="text-sm space-y-2 list-decimal list-inside text-gray-700 dark:text-gray-300">
                                        <li>Download Java 17 or higher from the link below</li>
                                        <li>Run the installer and follow the setup wizard</li>
                                        <li>Restart Applaa after installation</li>
                                        <li>Click "Recheck" to verify the installation</li>
                                    </ol>
                                </div>
                                <div className="flex gap-3">
                                    <Button
                                        onClick={() => ipcClient.openExternalUrl('https://adoptium.net/temurin/releases/?version=17')}
                                        className="flex-1"
                                    >
                                        <Download className="mr-2 h-4 w-4" />
                                        Download Java 17 (Recommended)
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => ipcClient.openExternalUrl('https://www.oracle.com/java/technologies/downloads/')}
                                    >
                                        <ExternalLink className="mr-2 h-4 w-4" />
                                        Oracle JDK
                                    </Button>
                                </div>
                            </CardContent>
                        )}
                    </Card>

                    {/* Gradle Status */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {tools?.gradle ? (
                                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                                    ) : (
                                        <XCircle className="h-6 w-6 text-red-500" />
                                    )}
                                    <div>
                                        <CardTitle>Gradle Build Tool</CardTitle>
                                        <CardDescription>
                                            {tools?.gradle
                                                ? `Installed: ${tools.gradleVersion?.split('\n')[0] || 'Version detected'}`
                                                : 'Required to build and package mods'}
                                        </CardDescription>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        {!tools?.gradle && (
                            <CardContent className="space-y-4">
                                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                                    <h4 className="font-semibold text-sm mb-2">Installation Steps:</h4>
                                    <ol className="text-sm space-y-2 list-decimal list-inside text-gray-700 dark:text-gray-300">
                                        <li>Download Gradle from the link below</li>
                                        <li>Extract the ZIP file to a folder (e.g., C:\Gradle)</li>
                                        <li>Add Gradle to your PATH environment variable</li>
                                        <li>Restart Applaa after installation</li>
                                        <li>Click "Recheck" to verify the installation</li>
                                    </ol>
                                </div>
                                <div className="flex gap-3">
                                    <Button
                                        onClick={() => ipcClient.openExternalUrl('https://gradle.org/install/')}
                                        className="flex-1"
                                    >
                                        <Download className="mr-2 h-4 w-4" />
                                        Download Gradle
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => ipcClient.openExternalUrl('https://gradle.org/install/#manually')}
                                    >
                                        <ExternalLink className="mr-2 h-4 w-4" />
                                        Installation Guide
                                    </Button>
                                </div>
                            </CardContent>
                        )}
                    </Card>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        <Button
                            onClick={checkTools}
                            variant="outline"
                            className="flex-1"
                            disabled={checking}
                        >
                            {checking ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Checking...
                                </>
                            ) : (
                                'Recheck Prerequisites'
                            )}
                        </Button>
                        {allInstalled && (
                            <Button
                                onClick={onReady}
                                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600"
                            >
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Continue to Mod Builder
                            </Button>
                        )}
                    </div>

                    {/* Help Section */}
                    <Card className="bg-gray-50 dark:bg-gray-900">
                        <CardHeader>
                            <CardTitle className="text-sm">Need Help?</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                            <p>
                                <strong>Why do I need these tools?</strong><br />
                                Minecraft mods are written in Java and need to be compiled into .jar files.
                                Java compiles the code, and Gradle packages everything together.
                            </p>
                            <p>
                                <strong>Having trouble?</strong><br />
                                Make sure to restart Applaa after installing Java or Gradle.
                                If you're still having issues, check that the tools are added to your system PATH.
                            </p>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
};
