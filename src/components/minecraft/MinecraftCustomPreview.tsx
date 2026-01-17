/**
 * Custom Minecraft Mod Preview Component
 * Shows a visual preview of the mod without relying on MakeCode iframe
 * 
 * Features:
 * - Displays code with syntax highlighting
 * - Shows command list extracted from code
 * - Minecraft-themed visual design
 * - No external dependencies or Microsoft branding
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
    Play,
    Code2,
    Terminal,
    Gamepad2,
    Pickaxe,
    Swords,
    Heart,
    Zap,
    Home,
    RefreshCw,
    Copy,
    Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MinecraftPreviewProps {
    /** App data containing files */
    app?: {
        path?: string;
        files?: string[];
        name?: string;
    };
    /** Direct code to display (if no app provided) */
    code?: string;
}

// Command icons mapping
const COMMAND_ICONS: Record<string, React.ReactNode> = {
    'fly': <Zap className="w-4 h-4" />,
    'heal': <Heart className="w-4 h-4" />,
    'house': <Home className="w-4 h-4" />,
    'speed': <Zap className="w-4 h-4" />,
    'tnt': <Swords className="w-4 h-4" />,
    'agent': <Gamepad2 className="w-4 h-4" />,
    'help': <Terminal className="w-4 h-4" />,
    'default': <Pickaxe className="w-4 h-4" />
};

// Extract commands from Java code
function extractCommands(code: string): { name: string; description: string }[] {
    const commands: { name: string; description: string }[] = [];

    // Match patterns like: command.equals("fly") or equalsIgnoreCase("/fly")
    const patterns = [
        /equalsIgnoreCase\s*\(\s*["']\/?([\w]+)["']\s*\)/gi,
        /\.equals\s*\(\s*["']\/?([\w]+)["']\s*\)/gi,
        /onChat\s*\(\s*["']([\w]+)["']/gi,
        /message\.equalsIgnoreCase\s*\(\s*["']\/?([\w]+)["']\s*\)/gi
    ];

    const foundCommands = new Set<string>();

    for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(code)) !== null) {
            const cmd = match[1].toLowerCase();
            if (!foundCommands.has(cmd)) {
                foundCommands.add(cmd);
                commands.push({
                    name: `/${cmd}`,
                    description: getCommandDescription(cmd, code)
                });
            }
        }
    }

    return commands;
}

// Try to infer command description from surrounding code
function getCommandDescription(cmdName: string, code: string): string {
    const descriptions: Record<string, string> = {
        'fly': 'Toggle flying mode on/off',
        'heal': 'Restore your health to full',
        'house': 'Build an instant house',
        'speed': 'Get super speed effect',
        'tnt': 'Spawn TNT explosions',
        'agent': 'Spawn or control the agent',
        'help': 'Show available commands',
        'stop': 'Stop the current action',
        'lightning': 'Strike lightning',
        'teleport': 'Teleport to location',
        'give': 'Give items to player',
        'spawn': 'Spawn entities'
    };

    return descriptions[cmdName] || `Execute the ${cmdName} command`;
}

export function MinecraftCustomPreview({ app, code: directCode }: MinecraftPreviewProps) {
    const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
    const [copied, setCopied] = useState(false);
    const [javaCode, setJavaCode] = useState<string>('');

    // Load Java code from app files
    useEffect(() => {
        if (directCode) {
            setJavaCode(directCode);
            return;
        }

        // Try to load from app path
        if (app?.path) {
            loadJavaFile(app.path);
        }
    }, [app, directCode]);

    const loadJavaFile = async (appPath: string) => {
        try {
            // Read the Java file from the app directory
            const { IpcClient } = await import('@/ipc/ipc_client');
            const files = await IpcClient.getInstance().listAppFiles({ appPath });
            const javaFile = files.find((f: string) => f.endsWith('.java'));

            if (javaFile) {
                const content = await IpcClient.getInstance().readFile({
                    filePath: `${appPath}/${javaFile}`
                });
                setJavaCode(content);
            }
        } catch (error) {
            console.error('Failed to load Java file:', error);
        }
    };

    // Extract commands from code
    const commands = useMemo(() => extractCommands(javaCode), [javaCode]);

    // Get mod name from code
    const modName = useMemo(() => {
        const match = javaCode.match(/public class (\w+)/);
        return match ? match[1] : app?.name || 'My Minecraft Mod';
    }, [javaCode, app]);

    const handleCopy = () => {
        navigator.clipboard.writeText(javaCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="h-full flex flex-col bg-gradient-to-b from-slate-900 to-slate-950">
            {/* Header */}
            <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-green-600 flex items-center justify-center">
                        <Pickaxe className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-white text-sm">{modName}</h3>
                        <p className="text-xs text-slate-400">{commands.length} commands available</p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <Button
                        size="sm"
                        variant={activeTab === 'preview' ? 'default' : 'ghost'}
                        className="h-7 text-xs"
                        onClick={() => setActiveTab('preview')}
                    >
                        <Gamepad2 className="w-3 h-3 mr-1" />
                        Preview
                    </Button>
                    <Button
                        size="sm"
                        variant={activeTab === 'code' ? 'default' : 'ghost'}
                        className="h-7 text-xs"
                        onClick={() => setActiveTab('code')}
                    >
                        <Code2 className="w-3 h-3 mr-1" />
                        Code
                    </Button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto">
                {activeTab === 'preview' ? (
                    <div className="p-6 space-y-6">
                        {/* Command Cards */}
                        <div>
                            <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                                <Terminal className="w-4 h-4" />
                                Commands in Your Mod
                            </h4>

                            {commands.length > 0 ? (
                                <div className="grid gap-3">
                                    {commands.map((cmd, i) => (
                                        <div
                                            key={i}
                                            className="bg-slate-800/50 rounded-lg p-4 border border-slate-700 hover:border-green-600/50 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-green-600/20 flex items-center justify-center text-green-400">
                                                    {COMMAND_ICONS[cmd.name.replace('/', '')] || COMMAND_ICONS.default}
                                                </div>
                                                <div>
                                                    <code className="text-green-400 font-mono text-lg">{cmd.name}</code>
                                                    <p className="text-slate-400 text-sm">{cmd.description}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-slate-800/30 rounded-lg p-6 text-center border border-slate-700">
                                    <Pickaxe className="w-10 h-10 mx-auto mb-3 text-slate-500" />
                                    <p className="text-slate-400">No commands detected yet.</p>
                                    <p className="text-slate-500 text-sm mt-1">
                                        Add commands like <code className="text-green-400">/fly</code> or <code className="text-green-400">/heal</code> to your mod!
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* How to Test */}
                        <div className="bg-gradient-to-r from-green-900/20 to-emerald-900/20 rounded-lg p-4 border border-green-800/30">
                            <h4 className="text-sm font-medium text-green-400 mb-2 flex items-center gap-2">
                                <Play className="w-4 h-4" />
                                How to Test Your Mod
                            </h4>
                            <ol className="text-sm text-slate-300 space-y-1 list-decimal list-inside">
                                <li>Install Minecraft Forge 1.20.1</li>
                                <li>Click "Build Mod" to create the .jar file</li>
                                <li>Copy to your .minecraft/mods folder</li>
                                <li>Launch Minecraft and type your commands!</li>
                            </ol>
                        </div>
                    </div>
                ) : (
                    <div className="relative h-full">
                        {/* Code View */}
                        <div className="absolute top-2 right-2 z-10">
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs"
                                onClick={handleCopy}
                            >
                                {copied ? (
                                    <><Check className="w-3 h-3 mr-1" /> Copied!</>
                                ) : (
                                    <><Copy className="w-3 h-3 mr-1" /> Copy</>
                                )}
                            </Button>
                        </div>

                        <pre className="p-4 text-sm text-slate-300 font-mono whitespace-pre-wrap overflow-auto h-full bg-slate-950">
                            {javaCode || '// Loading code...'}
                        </pre>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-2 border-t border-slate-800 bg-slate-900/50">
                <p className="text-xs text-slate-500 text-center">
                    💡 Type commands like <code className="text-green-400">/fly</code> or <code className="text-green-400">/heal</code> in Minecraft chat!
                </p>
            </div>
        </div>
    );
}

export default MinecraftCustomPreview;
