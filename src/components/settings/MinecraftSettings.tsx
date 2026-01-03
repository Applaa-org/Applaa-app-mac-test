import { useState } from 'react';
import { useSettings } from '@/hooks/useSettings';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Sparkles, Box, Volume2, Eye, EyeOff, Check, X } from 'lucide-react';
import { showSuccess, showError } from '@/lib/toast';
import { IpcClient } from '@/ipc/ipc_client';

export function MinecraftSettings() {
    const { settings, updateSettings } = useSettings();
    const [showMeshyKey, setShowMeshyKey] = useState(false);
    const [showElevenLabsKey, setShowElevenLabsKey] = useState(false);
    const [meshyKey, setMeshyKey] = useState('');
    const [elevenLabsKey, setElevenLabsKey] = useState('');
    const [isTesting, setIsTesting] = useState(false);
    const [testResults, setTestResults] = useState<{
        meshy?: boolean;
        elevenlabs?: boolean;
    }>({});

    const handleSaveMeshyKey = async () => {
        try {
            await updateSettings({
                meshyApiKey: meshyKey ? { value: meshyKey, encryptionType: 'electron-safe-storage' as const } : undefined
            });
            showSuccess('Meshy API key saved successfully');
            setMeshyKey('');
        } catch (error) {
            showError('Failed to save Meshy API key');
        }
    };

    const handleSaveElevenLabsKey = async () => {
        try {
            await updateSettings({
                elevenLabsApiKey: elevenLabsKey ? { value: elevenLabsKey, encryptionType: 'electron-safe-storage' as const } : undefined
            });
            showSuccess('ElevenLabs API key saved successfully');
            setElevenLabsKey('');
        } catch (error) {
            showError('Failed to save ElevenLabs API key');
        }
    };

    const testAssetGeneration = async () => {
        setIsTesting(true);
        setTestResults({});

        try {
            const ipcClient = IpcClient.getInstance();
            const isEnabled = await ipcClient.invoke('asset:is-enabled');
            const providers = await ipcClient.invoke('asset:get-providers');

            setTestResults({
                meshy: providers.includes('meshy-model'),
                elevenlabs: providers.includes('elevenlabs-sound')
            });

            if (isEnabled) {
                showSuccess('Asset generation is configured correctly!');
            } else {
                showError('No asset providers configured');
            }
        } catch (error) {
            showError('Failed to test asset generation');
        } finally {
            setIsTesting(false);
        }
    };

    const hasMeshyKey = !!settings?.meshyApiKey?.value;
    const hasElevenLabsKey = !!settings?.elevenLabsApiKey?.value;

    return (
        <div
            id="minecraft-settings"
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6"
        >
            <div className="flex items-center gap-2 mb-4">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                    ⛏️ Minecraft Settings
                </h2>
            </div>

            <div className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Configure AI-powered asset generation for Minecraft mods. Generate textures, 3D models, and sounds automatically.
            </div>

            {/* Asset Generation Section */}
            <div className="space-y-6">
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-orange-500" />
                        AI Asset Generation
                    </h3>

                    {/* DALL-E Info (uses existing OpenAI key) */}
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 mb-4">
                        <div className="flex items-start gap-3">
                            <Check className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <div className="text-sm font-medium text-green-800 dark:text-green-200">
                                    DALL-E Textures Ready
                                </div>
                                <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                                    Using your existing OpenAI API key for texture generation ($0.04 per texture)
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Meshy API Key */}
                    <div className="space-y-3 mb-4">
                        <div className="flex items-center gap-2">
                            <Box className="h-4 w-4 text-blue-500" />
                            <Label htmlFor="meshy-api-key" className="text-sm font-medium">
                                Meshy.ai API Key (3D Models)
                            </Label>
                            {hasMeshyKey && (
                                <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded">
                                    Configured
                                </span>
                            )}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                            Generate low-poly 3D models for Minecraft items and blocks ($0.10 per model)
                        </div>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Input
                                    id="meshy-api-key"
                                    type={showMeshyKey ? 'text' : 'password'}
                                    placeholder={hasMeshyKey ? '••••••••••••••••' : 'Enter Meshy API key'}
                                    value={meshyKey}
                                    onChange={(e) => setMeshyKey(e.target.value)}
                                    className="pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowMeshyKey(!showMeshyKey)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                >
                                    {showMeshyKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            <Button
                                onClick={handleSaveMeshyKey}
                                disabled={!meshyKey}
                                size="sm"
                            >
                                Save
                            </Button>
                        </div>
                        <a
                            href="https://meshy.ai"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                        >
                            Get Meshy API key →
                        </a>
                    </div>

                    {/* ElevenLabs API Key */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Volume2 className="h-4 w-4 text-purple-500" />
                            <Label htmlFor="elevenlabs-api-key" className="text-sm font-medium">
                                ElevenLabs API Key (Sounds)
                            </Label>
                            {hasElevenLabsKey && (
                                <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded">
                                    Configured
                                </span>
                            )}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                            Generate retro sound effects for Minecraft actions ($0.05 per sound)
                        </div>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Input
                                    id="elevenlabs-api-key"
                                    type={showElevenLabsKey ? 'text' : 'password'}
                                    placeholder={hasElevenLabsKey ? '••••••••••••••••' : 'Enter ElevenLabs API key'}
                                    value={elevenLabsKey}
                                    onChange={(e) => setElevenLabsKey(e.target.value)}
                                    className="pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowElevenLabsKey(!showElevenLabsKey)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                >
                                    {showElevenLabsKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            <Button
                                onClick={handleSaveElevenLabsKey}
                                disabled={!elevenLabsKey}
                                size="sm"
                            >
                                Save
                            </Button>
                        </div>
                        <a
                            href="https://elevenlabs.io"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                        >
                            Get ElevenLabs API key →
                        </a>
                    </div>

                    {/* Test Button */}
                    <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <Button
                            onClick={testAssetGeneration}
                            disabled={isTesting}
                            variant="outline"
                            size="sm"
                            className="w-full"
                        >
                            {isTesting ? 'Testing...' : 'Test Asset Generation'}
                        </Button>

                        {Object.keys(testResults).length > 0 && (
                            <div className="mt-3 space-y-2">
                                {testResults.meshy !== undefined && (
                                    <div className="flex items-center gap-2 text-xs">
                                        {testResults.meshy ? (
                                            <Check className="h-3 w-3 text-green-600" />
                                        ) : (
                                            <X className="h-3 w-3 text-red-600" />
                                        )}
                                        <span className={testResults.meshy ? 'text-green-600' : 'text-red-600'}>
                                            Meshy 3D Models: {testResults.meshy ? 'Ready' : 'Not configured'}
                                        </span>
                                    </div>
                                )}
                                {testResults.elevenlabs !== undefined && (
                                    <div className="flex items-center gap-2 text-xs">
                                        {testResults.elevenlabs ? (
                                            <Check className="h-3 w-3 text-green-600" />
                                        ) : (
                                            <X className="h-3 w-3 text-red-600" />
                                        )}
                                        <span className={testResults.elevenlabs ? 'text-green-600' : 'text-red-600'}>
                                            ElevenLabs Sounds: {testResults.elevenlabs ? 'Ready' : 'Not configured'}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Cost Summary */}
                    <div className="mt-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                        <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                            💰 Cost per Mod
                        </div>
                        <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                            <div className="flex justify-between">
                                <span>Texture (DALL-E)</span>
                                <span className="font-mono">$0.04</span>
                            </div>
                            <div className="flex justify-between">
                                <span>3D Model (Meshy)</span>
                                <span className="font-mono">$0.10</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Sound (ElevenLabs)</span>
                                <span className="font-mono">$0.05</span>
                            </div>
                            <div className="flex justify-between font-semibold text-gray-900 dark:text-white pt-1 border-t border-gray-200 dark:border-gray-600">
                                <span>Total</span>
                                <span className="font-mono">$0.19</span>
                            </div>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            vs. $50-200 for hiring a designer ✨
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
