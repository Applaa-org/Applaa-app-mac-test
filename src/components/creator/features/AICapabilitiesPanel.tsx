/**
 * AI Capabilities Panel
 * 
 * Allows users to configure AI features like text, image, audio, and video generation.
 * Shows only AI capabilities supported by the selected app type.
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Label } from '../../ui/label';
import { Switch } from '../../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import { Slider } from '../../ui/slider';
import {
    AppType,
    AppFeaturesConfig,
    AppTypeCapabilities,
    TextGenerationModel,
    ImageGenerationModel,
    AudioGenerationModel,
    VideoGenerationModel,
} from '../../../types/app-features';
import { Brain, Image, Music, Video, DollarSign, Zap, TrendingUp } from 'lucide-react';

interface AICapabilitiesPanelProps {
    appType: AppType;
    capabilities: AppTypeCapabilities;
    features: AppFeaturesConfig;
    onFeaturesChange: (features: AppFeaturesConfig) => void;
}

const TEXT_MODELS = {
    'gpt-5.2': { name: 'GPT-5.2', badge: 'Latest', price: '$0.03/1K tokens', speed: 'Fast' },
    'gemini-3-pro': { name: 'Gemini 3 Pro', badge: 'Advanced', price: '$0.025/1K tokens', speed: 'Fast' },
    'gpt-5-nano': { name: 'GPT-5 Nano', badge: 'Fast', price: '$0.001/1K tokens', speed: 'Ultra Fast' },
    'grok-4-fast': { name: 'Grok 4 Fast', badge: 'Cheap', price: '$0.0005/1K tokens', speed: 'Very Fast' },
};

const IMAGE_MODELS = {
    'nano-banana-pro': { name: 'Nano Banana Pro', badge: 'New', price: '$0.02/image' },
    'gpt-image-1.5': { name: 'GPT Image 1.5', badge: 'New', price: '$0.04/image' },
    'ideogram-3.0': { name: 'Ideogram 3.0', badge: '', price: '$0.03/image' },
};

const AUDIO_MODELS = {
    'elevenlabs-flash-2.5': { name: 'ElevenLabs Flash 2.5 TTS', price: '$0.15/1K chars' },
    'elevenlabs-sound-effects': { name: 'ElevenLabs Sound Effects', price: '$0.10/generation' },
    'elevenlabs-music': { name: 'ElevenLabs Music', price: '$0.25/minute' },
};

const VIDEO_MODELS = {
    'sora-2': { name: 'Sora 2', badge: 'Fast', price: '$0.50/5 seconds' },
    'sora-2-pro': { name: 'Sora 2 Pro', badge: 'Expensive', price: '$2.00/5 seconds' },
};

export function AICapabilitiesPanel({
    appType,
    capabilities,
    features,
    onFeaturesChange,
}: AICapabilitiesPanelProps) {
    const updateAIFeature = (
        feature: 'textGeneration' | 'imageGeneration' | 'audioGeneration' | 'videoGeneration',
        updates: any
    ) => {
        onFeaturesChange({
            ...features,
            ai: {
                ...features.ai,
                [feature]: {
                    ...features.ai?.[feature],
                    ...updates,
                },
            },
        });
    };

    if (!capabilities.supportsTextGeneration &&
        !capabilities.supportsImageGeneration &&
        !capabilities.supportsAudioGeneration &&
        !capabilities.supportsVideoGeneration) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>AI Capabilities Not Available</CardTitle>
                    <CardDescription>
                        AI features are not supported for {appType} apps.
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Text Generation */}
            {capabilities.supportsTextGeneration && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Brain className="h-5 w-5 text-blue-500" />
                                <CardTitle>Text Generation</CardTitle>
                            </div>
                            <Switch
                                checked={features.ai?.textGeneration?.enabled || false}
                                onCheckedChange={(enabled) => updateAIFeature('textGeneration', { enabled })}
                            />
                        </div>
                        <CardDescription>
                            Generate text content using advanced AI models
                        </CardDescription>
                    </CardHeader>
                    {features.ai?.textGeneration?.enabled && (
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Model</Label>
                                <Select
                                    value={features.ai.textGeneration.model || 'gpt-5-nano'}
                                    onValueChange={(model) => updateAIFeature('textGeneration', { model: model as TextGenerationModel })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(TEXT_MODELS).map(([key, model]) => (
                                            <SelectItem key={key} value={key}>
                                                <div className="flex items-center gap-2">
                                                    <span>{model.name}</span>
                                                    {model.badge && <Badge variant="outline" className="text-xs">{model.badge}</Badge>}
                                                    <span className="text-xs text-muted-foreground ml-auto">{model.price}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>API Key</Label>
                                <Input
                                    type="password"
                                    placeholder="sk-..."
                                    value={features.ai.textGeneration.apiKey || ''}
                                    onChange={(e) => updateAIFeature('textGeneration', { apiKey: e.target.value })}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Your API key will be encrypted and stored securely
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label>Max Tokens: {features.ai.textGeneration.maxTokens || 1000}</Label>
                                <Slider
                                    value={[features.ai.textGeneration.maxTokens || 1000]}
                                    onValueChange={([maxTokens]) => updateAIFeature('textGeneration', { maxTokens })}
                                    min={100}
                                    max={4000}
                                    step={100}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Temperature: {features.ai.textGeneration.temperature || 0.7}</Label>
                                <Slider
                                    value={[features.ai.textGeneration.temperature || 0.7]}
                                    onValueChange={([temperature]) => updateAIFeature('textGeneration', { temperature })}
                                    min={0}
                                    max={1}
                                    step={0.1}
                                />
                            </div>
                        </CardContent>
                    )}
                </Card>
            )}

            {/* Image Generation */}
            {capabilities.supportsImageGeneration && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Image className="h-5 w-5 text-purple-500" />
                                <CardTitle>Image Generation</CardTitle>
                            </div>
                            <Switch
                                checked={features.ai?.imageGeneration?.enabled || false}
                                onCheckedChange={(enabled) => updateAIFeature('imageGeneration', { enabled })}
                            />
                        </div>
                        <CardDescription>
                            Create images from text descriptions
                        </CardDescription>
                    </CardHeader>
                    {features.ai?.imageGeneration?.enabled && (
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Model</Label>
                                <Select
                                    value={features.ai.imageGeneration.model || 'nano-banana-pro'}
                                    onValueChange={(model) => updateAIFeature('imageGeneration', { model: model as ImageGenerationModel })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(IMAGE_MODELS).map(([key, model]) => (
                                            <SelectItem key={key} value={key}>
                                                <div className="flex items-center gap-2">
                                                    <span>{model.name}</span>
                                                    {model.badge && <Badge variant="outline" className="text-xs">{model.badge}</Badge>}
                                                    <span className="text-xs text-muted-foreground ml-auto">{model.price}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>API Key</Label>
                                <Input
                                    type="password"
                                    placeholder="sk-..."
                                    value={features.ai.imageGeneration.apiKey || ''}
                                    onChange={(e) => updateAIFeature('imageGeneration', { apiKey: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Image Size</Label>
                                <Select
                                    value={features.ai.imageGeneration.imageSize || '1024x1024'}
                                    onValueChange={(imageSize) => updateAIFeature('imageGeneration', { imageSize })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="256x256">256x256 (Small)</SelectItem>
                                        <SelectItem value="512x512">512x512 (Medium)</SelectItem>
                                        <SelectItem value="1024x1024">1024x1024 (Large)</SelectItem>
                                        <SelectItem value="1792x1024">1792x1024 (Wide)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Quality</Label>
                                <Select
                                    value={features.ai.imageGeneration.quality || 'standard'}
                                    onValueChange={(quality) => updateAIFeature('imageGeneration', { quality })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="standard">Standard</SelectItem>
                                        <SelectItem value="hd">HD (2x cost)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    )}
                </Card>
            )}

            {/* Audio Generation */}
            {capabilities.supportsAudioGeneration && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Music className="h-5 w-5 text-green-500" />
                                <CardTitle>Audio Generation</CardTitle>
                            </div>
                            <Switch
                                checked={features.ai?.audioGeneration?.enabled || false}
                                onCheckedChange={(enabled) => updateAIFeature('audioGeneration', { enabled })}
                            />
                        </div>
                        <CardDescription>
                            Generate speech, sound effects, and music
                        </CardDescription>
                    </CardHeader>
                    {features.ai?.audioGeneration?.enabled && (
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Model</Label>
                                <Select
                                    value={features.ai.audioGeneration.model || 'elevenlabs-flash-2.5'}
                                    onValueChange={(model) => updateAIFeature('audioGeneration', { model: model as AudioGenerationModel })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(AUDIO_MODELS).map(([key, model]) => (
                                            <SelectItem key={key} value={key}>
                                                <div className="flex items-center gap-2">
                                                    <span>{model.name}</span>
                                                    <span className="text-xs text-muted-foreground ml-auto">{model.price}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>API Key</Label>
                                <Input
                                    type="password"
                                    placeholder="API key..."
                                    value={features.ai.audioGeneration.apiKey || ''}
                                    onChange={(e) => updateAIFeature('audioGeneration', { apiKey: e.target.value })}
                                />
                            </div>
                        </CardContent>
                    )}
                </Card>
            )}

            {/* Video Generation */}
            {capabilities.supportsVideoGeneration && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Video className="h-5 w-5 text-red-500" />
                                <CardTitle>Video Generation</CardTitle>
                            </div>
                            <Switch
                                checked={features.ai?.videoGeneration?.enabled || false}
                                onCheckedChange={(enabled) => updateAIFeature('videoGeneration', { enabled })}
                            />
                        </div>
                        <CardDescription>
                            Create videos from text descriptions
                        </CardDescription>
                    </CardHeader>
                    {features.ai?.videoGeneration?.enabled && (
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Model</Label>
                                <Select
                                    value={features.ai.videoGeneration.model || 'sora-2'}
                                    onValueChange={(model) => updateAIFeature('videoGeneration', { model: model as VideoGenerationModel })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(VIDEO_MODELS).map(([key, model]) => (
                                            <SelectItem key={key} value={key}>
                                                <div className="flex items-center gap-2">
                                                    <span>{model.name}</span>
                                                    {model.badge && <Badge variant="outline" className="text-xs">{model.badge}</Badge>}
                                                    <span className="text-xs text-muted-foreground ml-auto">{model.price}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>API Key</Label>
                                <Input
                                    type="password"
                                    placeholder="sk-..."
                                    value={features.ai.videoGeneration.apiKey || ''}
                                    onChange={(e) => updateAIFeature('videoGeneration', { apiKey: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Resolution</Label>
                                <Select
                                    value={features.ai.videoGeneration.resolution || '1080p'}
                                    onValueChange={(resolution) => updateAIFeature('videoGeneration', { resolution })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="480p">480p</SelectItem>
                                        <SelectItem value="720p">720p</SelectItem>
                                        <SelectItem value="1080p">1080p (Recommended)</SelectItem>
                                        <SelectItem value="4k">4K (Premium)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    )}
                </Card>
            )}
        </div>
    );
}
