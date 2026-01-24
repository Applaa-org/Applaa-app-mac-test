/**
 * Create with Prompt Screen
 * 
 * Kid-friendly interface for creating projects from natural language prompts
 * Uses AI to route to the best framework and generate starter code
 */

import React, { useState, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, AlertCircle, CheckCircle2, Lightbulb, ArrowRight, Gamepad2, Code, Cpu, Box, ExternalLink } from 'lucide-react';
import { routePromptToFramework, type RoutingResult } from '@/lib/universal/prompt-processor';
import { UNIVERSAL_FRAMEWORKS } from '@/lib/universal/framework-registry';
import { filterPrompt, getKidFriendlyMessage } from '@/lib/safety-filter';
// import { generateStarterProject } from '@/lib/llm-orchestrator';
import { promptToProjectRoute } from '@/routes/create-with-prompt';
import { IpcClient } from '@/ipc/ipc_client';
import { showError, showSuccess } from '@/lib/toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MINECRAFT_INSPIRATION_CATEGORIES } from '@/prompts/minecraft_inspiration_prompts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PromptToProjectScreenProps {
    onProjectCreated?: (appId: number) => void;
}

export function PromptToProjectScreen({ onProjectCreated }: PromptToProjectScreenProps) {
    const { type } = promptToProjectRoute.useSearch();
    const navigate = useNavigate();
    const [prompt, setPrompt] = useState('');
    const [routing, setRouting] = useState<RoutingResult | null>(() => {
        if (type) {
            const framework = UNIVERSAL_FRAMEWORKS.find(f => {
                const appTypeMap: Record<string, string> = {
                    'arcade': 'makecode-arcade',
                    'microbit': 'microbit',
                    'minecraft': 'minecraft-makecode',
                    'blockly': 'blockly',
                    'roblox': 'roblox-lua',
                    'python': 'python',
                };
                return f.id === appTypeMap[type];
            });

            if (framework) {
                return {
                    frameworkId: framework.id as any,
                    framework,
                    confidence: 1,
                    reasons: [`You selected ${framework.name}`]
                };
            }
        }
        return null;
    });
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedProject, setGeneratedProject] = useState<any>(null);
    const [safetyError, setSafetyError] = useState<string | null>(null);
    const [createdAppPath, setCreatedAppPath] = useState<string | null>(null);

    // Manual Name Prompt State
    const [isNameDialogOpen, setIsNameDialogOpen] = useState(false);
    const [customName, setCustomName] = useState("");
    const [pendingCreation, setPendingCreation] = useState<any>(null);

    const ipcClient = IpcClient.getInstance();

    // Example prompts for inspiration
    const examplePrompts = [
        { text: "Make a space shooter game", icon: Gamepad2, color: "text-orange-600" },
        { text: "Show a heart when I press button A", icon: Cpu, color: "text-teal-600" },
        { text: "Build a house in Minecraft when I say 'build'", icon: Box, color: "text-green-600" },
        { text: "Count from 1 to 10", icon: Code, color: "text-indigo-600" },
    ];

    const createAppWithRetry = async (baseName: string, appType: string, frameworkId: string) => {
        try {
            return await ipcClient.createApp({
                name: baseName,
                appType: appType as any,
                framework: frameworkId as any,
            });
        } catch (error: any) {
            const msg = error.message || error.toString();
            if (msg.includes('DUPLICATE_APP_NAME')) {
                // Parse the suggested name from the error message
                // Format: "DUPLICATE_APP_NAME:Original Name:Suggested Name"
                const parts = msg.split(':');
                if (parts.length >= 3) {
                    const suggestedName = parts[2].trim();
                    // Throw error with suggested name so it can be handled by the caller
                    const duplicateError = new Error(`DUPLICATE_NAME_WITH_SUGGESTION:${baseName}:${suggestedName}`);
                    throw duplicateError;
                }
            }
            // Re-throw other errors
            throw error;
        }
    };


    const handleManualCreate = useCallback(async () => {
        if (!pendingCreation || !customName.trim()) return;

        try {
            const result = await ipcClient.createApp({
                name: customName,
                appType: pendingCreation.appType,
                framework: pendingCreation.frameworkId,
            });

            const appId = result.app.id;

            if (pendingCreation.type === 'generated' && pendingCreation.payload) {
                if (pendingCreation.payload.payload.makecode) {
                    await ipcClient.writeFile({
                        appId,
                        filePath: 'main.ts',
                        content: pendingCreation.payload.payload.makecode.typescript,
                    });
                } else if (pendingCreation.payload.payload.blockly) {
                    await ipcClient.writeFile({
                        appId,
                        filePath: 'workspace.json',
                        content: JSON.stringify(pendingCreation.payload.payload.blockly.workspaceJson, null, 2),
                    });
                } else if (pendingCreation.payload.payload.minecraftMod) {
                    await ipcClient.writeFile({
                        appId,
                        filePath: pendingCreation.payload.payload.minecraftMod.fileName || 'Mod.java',
                        content: pendingCreation.payload.payload.minecraftMod.code,
                    });
                }
            }

            if (onProjectCreated) {
                onProjectCreated(appId);
            } else {
                if (pendingCreation.appType === 'blockly') {
                    navigate({ to: '/blockly', search: { id: appId } as any });
                } else {
                    navigate({ to: '/chat', search: { id: result.chatId } as any });
                }
            }

            setCreatedAppPath(result.app.path);
            setIsNameDialogOpen(false);
            showSuccess('App created successfully!');

        } catch (error) {
            console.error('Error in manual creation:', error);
            showError(`Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }, [pendingCreation, customName, ipcClient, onProjectCreated, navigate]);

    const handleAnalyze = useCallback(() => {
        if (!prompt.trim()) {
            showError('Please enter a prompt first!');
            return;
        }

        setIsAnalyzing(true);
        setSafetyError(null);

        try {
            // Safety check
            const safetyCheck = filterPrompt(prompt);
            if (!safetyCheck.safe) {
                setSafetyError(getKidFriendlyMessage(safetyCheck));
                setIsAnalyzing(false);
                return;
            }

            // Route to framework
            const result = routePromptToFramework(prompt);
            setRouting(result);
        } catch (error) {
            console.error('Error analyzing prompt:', error);
            showError('Failed to analyze prompt. Please try again.');
        } finally {
            setIsAnalyzing(false);
        }
    }, [prompt]);

    const handleGenerate = useCallback(async () => {
        if (!routing || !routing.frameworkId) {
            showError('Please analyze your prompt first!');
            return;
        }

        setIsGenerating(true);

        try {
            // Generate starter project using LLM
            // Generate starter project using LLM via IPC to avoid renderer bundling issues
            const project = await IpcClient.getInstance().generateStarterProject({
                prompt,
                frameworkId: routing.frameworkId as any,
            });

            setGeneratedProject(project);
            showSuccess(`Created "${project.title}"!`);
        } catch (error) {
            console.error('Error generating project:', error);
            showError(`Failed to generate project: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsGenerating(false);
        }
    }, [prompt, routing]);

    const handleCreateApp = useCallback(async () => {
        if (!generatedProject || !routing) {
            return;
        }

        // Map framework ID to app type
        const appTypeMap: Record<string, string> = {
            'makecode-arcade': 'arcade',
            'microbit': 'microbit',
            'minecraft-makecode': 'minecraft',
            'blockly': 'blockly',
            'roblox-lua': 'roblox',
            'python': 'python',
        };

        const appType = appTypeMap[routing.frameworkId!];

        try {
            // Create the app
            const result = await createAppWithRetry(generatedProject.title, appType, routing.frameworkId!);

            const appId = result.app.id;

            // Save the generated code to the app
            if (generatedProject.payload.makecode) {
                // For MakeCode apps, save to main.ts
                await ipcClient.writeFile({
                    appId: appId,
                    filePath: 'main.ts',
                    content: generatedProject.payload.makecode.typescript,
                });
            } else if (generatedProject.payload.blockly) {
                // For Blockly apps, save workspace.json
                await ipcClient.writeFile({
                    appId: appId,
                    filePath: 'workspace.json',
                    content: JSON.stringify(generatedProject.payload.blockly.workspaceJson, null, 2),
                });
            } else if (generatedProject.payload.minecraftMod) {
                // For Minecraft Java mods, save to the specified file name
                await ipcClient.writeFile({
                    appId: appId,
                    filePath: generatedProject.payload.minecraftMod.fileName || 'Mod.java',
                    content: generatedProject.payload.minecraftMod.code,
                });
            }

            showSuccess(`App "${generatedProject.title}" created successfully!`);
            setCreatedAppPath(result.app.path);

            // Navigate to the app
            if (onProjectCreated) {
                onProjectCreated(appId);
            } else {
                if (appType === 'blockly') {
                    navigate({ to: '/blockly', search: { id: appId } as any });
                } else {
                    navigate({ to: '/chat', search: { id: result.chatId, initialPrompt: prompt } as any });
                }
            }
        } catch (error) {
            console.error('Error creating app:', error);

            // Check if it's a duplicate name error with suggestion
            const errorMsg = error instanceof Error ? error.message : String(error);
            let suggestedName = generatedProject.title;

            if (errorMsg.includes('DUPLICATE_NAME_WITH_SUGGESTION')) {
                const parts = errorMsg.split(':');
                if (parts.length >= 3) {
                    suggestedName = parts[2].trim();
                }
            }

            // Fallback to manual naming
            setPendingCreation({
                type: 'generated',
                appType,
                frameworkId: routing.frameworkId!,
                payload: generatedProject
            });
            setCustomName(suggestedName);
            setIsNameDialogOpen(true);
        }
    }, [generatedProject, routing, ipcClient, navigate, onProjectCreated]);

    const handleSkipPrompt = useCallback(async () => {
        if (!routing || !routing.frameworkId) return;

        // Map framework ID to app type
        const appTypeMap: Record<string, string> = {
            'makecode-arcade': 'arcade',
            'microbit': 'microbit',
            'minecraft-makecode': 'minecraft',
            'blockly': 'blockly',
            'roblox-lua': 'roblox',
            'python': 'python',
        };

        const appType = appTypeMap[routing.frameworkId!];

        try {
            // Generate unique name with timestamp to avoid conflicts
            const timestamp = Date.now().toString().slice(-6);
            const uniqueName = `${routing.framework?.name || 'Project'} ${timestamp}`;

            // For Minecraft, generate a starter template instead of empty app
            if (appType === 'minecraft') {
                setIsGenerating(true);
                showSuccess('Generating starter Minecraft mod...');

                // Generate a basic starter mod
                const starterPrompt = "Create a basic Minecraft mod template with a simple example";
                const project = await ipcClient.generateStarterProject({
                    prompt: starterPrompt,
                    frameworkId: routing.frameworkId as any
                });

                setGeneratedProject(project);

                // 🚀 CRITICAL FIX: Create app directly with the project data instead of calling handleCreateApp()
                // handleCreateApp uses stale state due to React's async state updates
                try {
                    const result = await createAppWithRetry(project.title, appType, routing.frameworkId!);
                    const appId = result.app.id;

                    // Save the generated code to the app
                    if ((project.payload as any)?.minecraftMod) {
                        await ipcClient.writeFile({
                            appId: appId,
                            filePath: (project.payload as any).minecraftMod.fileName || 'Mod.java',
                            content: (project.payload as any).minecraftMod.code,
                        });
                    }

                    setIsGenerating(false);
                    showSuccess(`App "${project.title}" created successfully!`);
                    setCreatedAppPath(result.app.path);

                    // Navigate to chat page for Minecraft apps
                    if (onProjectCreated) {
                        onProjectCreated(appId);
                    } else {
                        navigate({ to: '/chat', search: { id: result.chatId, initialPrompt: starterPrompt } as any });
                    }
                } catch (error) {
                    console.error('Error creating Minecraft app:', error);
                    setIsGenerating(false);

                    // Fallback to manual naming
                    setPendingCreation({
                        type: 'generated',
                        appType,
                        frameworkId: routing.frameworkId!,
                        payload: project
                    });
                    setCustomName(project.title);
                    setIsNameDialogOpen(true);
                }
                return;
            }


            // For other types, create an empty app
            const result = await createAppWithRetry(
                uniqueName,
                appType,
                routing.frameworkId!
            );

            showSuccess(`Created your ${routing.framework?.name} project!`);
            setCreatedAppPath(result.app.path);

            if (onProjectCreated) {
                onProjectCreated(result.app.id);
            } else {
                if (appType === 'blockly') {
                    navigate({ to: '/blockly', search: { id: result.app.id } as any });
                } else {
                    navigate({ to: '/chat', search: { id: result.chatId } as any });
                }
            }
        } catch (error) {
            console.error('Error creating empty app:', error);
            setIsGenerating(false);
            // Fallback to manual naming
            setPendingCreation({
                type: 'empty',
                appType,
                frameworkId: routing.frameworkId!
            });
            setCustomName(`My ${routing.framework?.name || 'New Project'}`);
            setIsNameDialogOpen(true);
        }
    }, [routing, ipcClient, navigate, onProjectCreated, handleCreateApp]);

    const getFrameworkIcon = (frameworkId: string | null) => {
        switch (frameworkId) {
            case 'makecode-arcade': return <Gamepad2 className="h-5 w-5" />;
            case 'microbit': return <Cpu className="h-5 w-5" />;
            case 'minecraft-makecode': return <Box className="h-5 w-5" />;
            case 'blockly': return <Code className="h-5 w-5" />;
            case 'roblox-lua': return <Box className="h-5 w-5" />; // TODO: Add Roblox icon
            case 'python': return <Code className="h-5 w-5" />;
            default: return <Sparkles className="h-5 w-5" />;
        }
    };

    const getConfidenceColor = (confidence: number) => {
        if (confidence >= 0.75) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
        if (confidence >= 0.55) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    };

    return (
        <div className="container max-w-4xl mx-auto py-8 px-4">
            {/* Header */}
            <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 mb-4">
                    <Sparkles className="h-8 w-8 text-purple-600" />
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                        Create with AI
                    </h1>
                </div>
                <p className="text-lg text-gray-600 dark:text-gray-400">
                    Describe what you want to make, and AI will build it!
                </p>
            </div>

            {/* Framework Info */}
            {routing && (
                <div className="mb-6 flex items-center justify-center">
                    <div className="flex items-center gap-3 px-4 py-2 bg-purple-50 dark:bg-purple-900/30 rounded-full border border-purple-100 dark:border-purple-800">
                        {getFrameworkIcon(routing.frameworkId)}
                        <span className="font-semibold text-purple-700 dark:text-purple-300">
                            Creating {routing.framework?.name || 'Project'}
                        </span>
                    </div>
                </div>
            )}

            {/* Main Card */}
            <Card className="mb-6 shadow-xl border-purple-100 dark:border-purple-900/50">
                <CardHeader>
                    <CardTitle className="text-2xl">
                        {routing?.frameworkId === 'blockly' ? 'What should we start with?' : 'How should we build it?'}
                    </CardTitle>
                    <CardDescription className="text-base">
                        {routing?.frameworkId === 'blockly'
                            ? 'Describe your logic or skip to start from scratch'
                            : 'Describe your idea in simple words'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Prompt Input */}
                    <div>
                        <Textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Example: Make a game where I collect stars and avoid enemies..."
                            className="min-h-[120px] text-base"
                            disabled={isAnalyzing || isGenerating}
                        />
                    </div>

                    {/* Safety Error */}
                    {safetyError && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{safetyError}</AlertDescription>
                        </Alert>
                    )}

                    {/* Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <Button
                            onClick={routing ? handleGenerate : handleAnalyze}
                            disabled={!prompt.trim() || (routing ? isGenerating : isAnalyzing)}
                            className="flex-1 h-14 text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg transition-all duration-200"
                            size="lg"
                        >
                            {routing ? (
                                isGenerating ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Building your project...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="mr-2 h-5 w-5" />
                                        Build Project with AI
                                    </>
                                )
                            ) : (
                                isAnalyzing ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Analyzing...
                                    </>
                                ) : (
                                    <>
                                        <ArrowRight className="mr-2 h-5 w-5" />
                                        Continue
                                    </>
                                )
                            )}
                        </Button>

                        {routing?.frameworkId === 'blockly' && !isGenerating && (
                            <Button
                                onClick={handleSkipPrompt}
                                variant="outline"
                                className="h-14 px-8 text-lg font-semibold"
                                size="lg"
                            >
                                Skip & Just Open Blocklaa
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Routing Result - Hidden if routing was pre-defined */}
            {routing && !generatedProject && !type && (
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                            AI Analysis Complete
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Framework Selection */}
                        <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div className="flex-shrink-0">
                                {getFrameworkIcon(routing.frameworkId)}
                            </div>
                            <div className="flex-1">
                                <div className="font-semibold">{routing.framework?.name || 'Unknown Framework'}</div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                    {routing.framework?.description}
                                </div>
                            </div>
                            <Badge className={getConfidenceColor(routing.confidence)}>
                                {(routing.confidence * 100).toFixed(0)}% confident
                            </Badge>
                        </div>

                        {/* Reasons */}
                        <div className="space-y-2">
                            <div className="text-sm font-medium">Why this framework?</div>
                            <ul className="space-y-1">
                                {routing.reasons.map((reason, index) => (
                                    <li key={index} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                                        <span className="text-purple-600 mt-0.5">•</span>
                                        <span>{reason}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Generate Button */}
                        <Button
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            className="w-full"
                            size="lg"
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Generating Project...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="mr-2 h-5 w-5" />
                                    Generate Project
                                </>
                            )}
                        </Button>

                        {/* Change Mind */}
                        <Button
                            onClick={() => {
                                setRouting(null);
                                setPrompt('');
                            }}
                            variant="outline"
                            className="w-full"
                        >
                            Start Over
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Generated Project */}
            {generatedProject && (
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                            {generatedProject.title}
                        </CardTitle>
                        <CardDescription>{generatedProject.explanationForKid}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Steps to Try */}
                        <div>
                            <div className="text-sm font-medium mb-2 flex items-center gap-2">
                                <Lightbulb className="h-4 w-4 text-yellow-600" />
                                Things to try:
                            </div>
                            <ul className="space-y-1">
                                {generatedProject.stepsToTry.map((step: string, index: number) => (
                                    <li key={index} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                                        <span className="text-purple-600 mt-0.5">{index + 1}.</span>
                                        <span>{step}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Installation Instructions for Minecraft */}
                        {generatedProject.payload.minecraftMod?.installationInstructions && (
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                                <div className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
                                    <Box className="h-4 w-4" />
                                    How to install in Minecraft:
                                </div>
                                <p className="text-sm text-blue-700 dark:text-blue-400 whitespace-pre-line leading-relaxed">
                                    {generatedProject.payload.minecraftMod.installationInstructions}
                                </p>
                            </div>
                        )}

                        {/* Create App Button */}
                        <Button
                            onClick={handleCreateApp}
                            className="w-full"
                            size="lg"
                            disabled={!!createdAppPath}
                        >
                            <ArrowRight className="mr-2 h-5 w-5" />
                            {createdAppPath ? 'App Created!' : 'Create App & Open Editor'}
                        </Button>

                        {createdAppPath && (
                            <Button
                                onClick={() => ipcClient.showItemInFolder(createdAppPath)}
                                variant="outline"
                                className="w-full"
                                size="lg"
                            >
                                <ExternalLink className="mr-2 h-5 w-5" />
                                Open Project Folder (Grab your mod here!)
                            </Button>
                        )}

                        {/* Start Over */}
                        <Button
                            onClick={() => {
                                if (type) {
                                    setGeneratedProject(null);
                                    setPrompt('');
                                } else {
                                    setRouting(null);
                                    setGeneratedProject(null);
                                    setPrompt('');
                                }
                            }}
                            variant="ghost"
                            className="w-full"
                        >
                            {type ? 'Clear Prompt' : 'Create Something Else'}
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Example Prompts */}
            {!routing && !isAnalyzing && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Need inspiration?</CardTitle>
                        <CardDescription>Try one of these examples</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {examplePrompts.map((example, index) => (
                                <button
                                    key={index}
                                    onClick={() => setPrompt(example.text)}
                                    className="flex items-center gap-3 p-3 text-left rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                >
                                    <example.icon className={`h-5 w-5 ${example.color}`} />
                                    <span className="text-sm">{example.text}</span>
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Minecraft Specific Inspiration Categories */}
            {routing?.frameworkId === 'minecraft-makecode' && !generatedProject && !isGenerating && (
                <div className="mt-8 space-y-6">
                    <div className="flex items-center gap-2 px-2">
                        <Box className="h-6 w-6 text-green-600" />
                        <h2 className="text-2xl font-bold">Minecraft Mod Collections</h2>
                    </div>

                    <Tabs defaultValue={MINECRAFT_INSPIRATION_CATEGORIES[0].category} className="w-full">
                        <TabsList className="w-full flex flex-wrap h-auto bg-gray-100 dark:bg-gray-800 p-1 mb-4">
                            {MINECRAFT_INSPIRATION_CATEGORIES.map(cat => (
                                <TabsTrigger
                                    key={cat.category}
                                    value={cat.category}
                                    className="flex items-center gap-2 py-2 px-4 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm rounded-md transition-all text-xs sm:text-sm"
                                >
                                    {cat.icon}
                                    {cat.category}
                                </TabsTrigger>
                            ))}
                        </TabsList>

                        {MINECRAFT_INSPIRATION_CATEGORIES.map(cat => (
                            <TabsContent key={cat.category} value={cat.category} className="mt-0">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {cat.prompts.map((p, idx) => (
                                        <Card
                                            key={idx}
                                            className="group hover:border-purple-400 dark:hover:border-purple-600 transition-all cursor-pointer bg-white dark:bg-gray-900 shadow-sm hover:shadow-md"
                                            onClick={() => {
                                                setPrompt(p.prompt);
                                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                            }}
                                        >
                                            <CardHeader className="p-4 pb-2">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <div className="p-1.5 rounded-md bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                                        {p.icon}
                                                    </div>
                                                    <CardTitle className="text-base">{p.title}</CardTitle>
                                                </div>
                                                <CardDescription className="text-xs line-clamp-2">
                                                    {p.description}
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent className="p-4 pt-0">
                                                <div className="text-[10px] text-gray-400 dark:text-gray-500 italic mt-2">
                                                    Click to use this theme →
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </TabsContent>
                        ))}
                    </Tabs>
                </div>
            )}

            {/* Manual Name Dialog */}
            <Dialog open={isNameDialogOpen} onOpenChange={setIsNameDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Name Your Project</DialogTitle>
                        <DialogDescription>
                            We couldn't automatically name your project. Please choose a unique name.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">
                                Name
                            </Label>
                            <Input
                                id="name"
                                value={customName}
                                onChange={(e) => setCustomName(e.target.value)}
                                className="col-span-3"
                                autoFocus
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsNameDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleManualCreate} disabled={!customName.trim()}>Create Project</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    );
}
