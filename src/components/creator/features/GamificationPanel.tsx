/**
 * Gamification Panel
 * 
 * Allows users to configure game-specific features like achievements, leaderboards,
 * progression systems, rewards, and multiplayer.
 * Only shown for game app types (Godot, Arcade).
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Label } from '../../ui/label';
import { Switch } from '../../ui/switch';
import { Badge } from '../../ui/badge';
import { Checkbox } from '../../ui/checkbox';
import {
    AppType,
    AppFeaturesConfig,
    AppTypeCapabilities,
} from '../../../types/app-features';
import {
    Trophy,
    TrendingUp,
    Star,
    Gift,
    Users,
    Cloud,
    Gamepad2,
} from 'lucide-react';

interface GamificationPanelProps {
    appType: AppType;
    capabilities: AppTypeCapabilities;
    features: AppFeaturesConfig;
    onFeaturesChange: (features: AppFeaturesConfig) => void;
}

export function GamificationPanel({
    appType,
    capabilities,
    features,
    onFeaturesChange,
}: GamificationPanelProps) {
    const updateGamificationFeature = (feature: string, updates: any) => {
        onFeaturesChange({
            ...features,
            gamification: {
                ...features.gamification,
                [feature]: {
                    ...(features.gamification as any)?.[feature],
                    ...updates,
                },
            },
        });
    };

    const togglePlatform = (feature: string, platform: string) => {
        const currentPlatforms = ((features.gamification as any)?.[feature]?.platforms || []);
        const newPlatforms = currentPlatforms.includes(platform)
            ? currentPlatforms.filter((p: string) => p !== platform)
            : [...currentPlatforms, platform];
        updateGamificationFeature(feature, { platforms: newPlatforms });
    };

    if (!capabilities.supportsGamification) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Gamification Not Available</CardTitle>
                    <CardDescription>
                        Gamification features are only available for game app types.
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Achievements */}
            {capabilities.supportsAchievements && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Trophy className="h-5 w-5 text-yellow-500" />
                                <CardTitle>Achievements</CardTitle>
                            </div>
                            <Switch
                                checked={features.gamification?.achievements?.enabled || false}
                                onCheckedChange={(enabled) => updateGamificationFeature('achievements', { enabled })}
                            />
                        </div>
                        <CardDescription>
                            Unlock achievements and track player progress
                        </CardDescription>
                    </CardHeader>
                    {features.gamification?.achievements?.enabled && (
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Platforms</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    {appType === 'godot' && (
                                        <>
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id="steam-achievements"
                                                    checked={features.gamification.achievements.platforms?.includes('steam')}
                                                    onCheckedChange={() => togglePlatform('achievements', 'steam')}
                                                />
                                                <label htmlFor="steam-achievements" className="text-sm cursor-pointer">
                                                    Steam
                                                </label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id="google-play-achievements"
                                                    checked={features.gamification.achievements.platforms?.includes('google-play')}
                                                    onCheckedChange={() => togglePlatform('achievements', 'google-play')}
                                                />
                                                <label htmlFor="google-play-achievements" className="text-sm cursor-pointer">
                                                    Google Play Games
                                                </label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id="game-center-achievements"
                                                    checked={features.gamification.achievements.platforms?.includes('game-center')}
                                                    onCheckedChange={() => togglePlatform('achievements', 'game-center')}
                                                />
                                                <label htmlFor="game-center-achievements" className="text-sm cursor-pointer">
                                                    Game Center (iOS)
                                                </label>
                                            </div>
                                        </>
                                    )}
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="custom-achievements"
                                            checked={features.gamification.achievements.platforms?.includes('custom')}
                                            onCheckedChange={() => togglePlatform('achievements', 'custom')}
                                        />
                                        <label htmlFor="custom-achievements" className="text-sm cursor-pointer">
                                            Custom Backend
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    )}
                </Card>
            )}

            {/* Leaderboards */}
            {capabilities.supportsLeaderboards && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-blue-500" />
                                <CardTitle>Leaderboards</CardTitle>
                            </div>
                            <Switch
                                checked={features.gamification?.leaderboards?.enabled || false}
                                onCheckedChange={(enabled) => updateGamificationFeature('leaderboards', { enabled })}
                            />
                        </div>
                        <CardDescription>
                            Competitive leaderboards for player rankings
                        </CardDescription>
                    </CardHeader>
                    {features.gamification?.leaderboards?.enabled && (
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Platforms</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    {appType === 'godot' && (
                                        <>
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id="steam-leaderboards"
                                                    checked={features.gamification.leaderboards.platforms?.includes('steam')}
                                                    onCheckedChange={() => togglePlatform('leaderboards', 'steam')}
                                                />
                                                <label htmlFor="steam-leaderboards" className="text-sm cursor-pointer">
                                                    Steam
                                                </label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id="google-play-leaderboards"
                                                    checked={features.gamification.leaderboards.platforms?.includes('google-play')}
                                                    onCheckedChange={() => togglePlatform('leaderboards', 'google-play')}
                                                />
                                                <label htmlFor="google-play-leaderboards" className="text-sm cursor-pointer">
                                                    Google Play Games
                                                </label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id="game-center-leaderboards"
                                                    checked={features.gamification.leaderboards.platforms?.includes('game-center')}
                                                    onCheckedChange={() => togglePlatform('leaderboards', 'game-center')}
                                                />
                                                <label htmlFor="game-center-leaderboards" className="text-sm cursor-pointer">
                                                    Game Center (iOS)
                                                </label>
                                            </div>
                                        </>
                                    )}
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="firebase-leaderboards"
                                            checked={features.gamification.leaderboards.platforms?.includes('firebase')}
                                            onCheckedChange={() => togglePlatform('leaderboards', 'firebase')}
                                        />
                                        <label htmlFor="firebase-leaderboards" className="text-sm cursor-pointer">
                                            Firebase
                                        </label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="custom-leaderboards"
                                            checked={features.gamification.leaderboards.platforms?.includes('custom')}
                                            onCheckedChange={() => togglePlatform('leaderboards', 'custom')}
                                        />
                                        <label htmlFor="custom-leaderboards" className="text-sm cursor-pointer">
                                            Custom Backend
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Leaderboard Types</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['global', 'friends', 'daily', 'weekly', 'all-time'].map((type) => (
                                        <div key={type} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`leaderboard-${type}`}
                                                checked={features.gamification.leaderboards.types?.includes(type as any)}
                                                onCheckedChange={() => {
                                                    const currentTypes = features.gamification?.leaderboards?.types || [];
                                                    const newTypes = currentTypes.includes(type as any)
                                                        ? currentTypes.filter((t: string) => t !== type)
                                                        : [...currentTypes, type];
                                                    updateGamificationFeature('leaderboards', { types: newTypes });
                                                }}
                                            />
                                            <label htmlFor={`leaderboard-${type}`} className="text-sm cursor-pointer capitalize">
                                                {type.replace('-', ' ')}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    )}
                </Card>
            )}

            {/* Progression System */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Star className="h-5 w-5 text-purple-500" />
                            <CardTitle>Progression System</CardTitle>
                        </div>
                        <Switch
                            checked={features.gamification?.progression?.enabled || false}
                            onCheckedChange={(enabled) => updateGamificationFeature('progression', { enabled })}
                        />
                    </div>
                    <CardDescription>
                        Level progression, XP, and skill trees
                    </CardDescription>
                </CardHeader>
                {features.gamification?.progression?.enabled && (
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Features</Label>
                            <div className="grid grid-cols-2 gap-2">
                                {['levels', 'xp', 'skill-trees', 'unlockables'].map((feature) => (
                                    <div key={feature} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`progression-${feature}`}
                                            checked={features.gamification.progression.features?.includes(feature as any)}
                                            onCheckedChange={() => {
                                                const currentFeatures = features.gamification?.progression?.features || [];
                                                const newFeatures = currentFeatures.includes(feature as any)
                                                    ? currentFeatures.filter((f: string) => f !== feature)
                                                    : [...currentFeatures, feature];
                                                updateGamificationFeature('progression', { features: newFeatures });
                                            }}
                                        />
                                        <label htmlFor={`progression-${feature}`} className="text-sm cursor-pointer capitalize">
                                            {feature.replace('-', ' ')}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                )}
            </Card>

            {/* Rewards System */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Gift className="h-5 w-5 text-green-500" />
                            <CardTitle>Rewards System</CardTitle>
                        </div>
                        <Switch
                            checked={features.gamification?.rewards?.enabled || false}
                            onCheckedChange={(enabled) => updateGamificationFeature('rewards', { enabled })}
                        />
                    </div>
                    <CardDescription>
                        Daily rewards, login bonuses, and loot
                    </CardDescription>
                </CardHeader>
                {features.gamification?.rewards?.enabled && (
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Reward Types</Label>
                            <div className="grid grid-cols-2 gap-2">
                                {['daily', 'login-bonus', 'quest', 'loot-box'].map((type) => (
                                    <div key={type} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`reward-${type}`}
                                            checked={features.gamification.rewards.types?.includes(type as any)}
                                            onCheckedChange={() => {
                                                const currentTypes = features.gamification?.rewards?.types || [];
                                                const newTypes = currentTypes.includes(type as any)
                                                    ? currentTypes.filter((t: string) => t !== type)
                                                    : [...currentTypes, type];
                                                updateGamificationFeature('rewards', { types: newTypes });
                                            }}
                                        />
                                        <label htmlFor={`reward-${type}`} className="text-sm cursor-pointer capitalize">
                                            {type.replace('-', ' ')}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                )}
            </Card>

            {/* Multiplayer */}
            {capabilities.supportsMultiplayer && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Users className="h-5 w-5 text-orange-500" />
                                <CardTitle>Multiplayer</CardTitle>
                            </div>
                            <Switch
                                checked={features.gamification?.multiplayer?.enabled || false}
                                onCheckedChange={(enabled) => updateGamificationFeature('multiplayer', { enabled })}
                            />
                        </div>
                        <CardDescription>
                            Multiplayer features and social systems
                        </CardDescription>
                    </CardHeader>
                    {features.gamification?.multiplayer?.enabled && (
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Features</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['matchmaking', 'friends', 'guilds', 'chat'].map((feature) => (
                                        <div key={feature} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`multiplayer-${feature}`}
                                                checked={features.gamification.multiplayer.features?.includes(feature as any)}
                                                onCheckedChange={() => {
                                                    const currentFeatures = features.gamification?.multiplayer?.features || [];
                                                    const newFeatures = currentFeatures.includes(feature as any)
                                                        ? currentFeatures.filter((f: string) => f !== feature)
                                                        : [...currentFeatures, feature];
                                                    updateGamificationFeature('multiplayer', { features: newFeatures });
                                                }}
                                            />
                                            <label htmlFor={`multiplayer-${feature}`} className="text-sm cursor-pointer capitalize">
                                                {feature}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    )}
                </Card>
            )}

            {/* Cloud Save */}
            {capabilities.supportsCloudSave && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Cloud className="h-5 w-5 text-cyan-500" />
                                <CardTitle>Cloud Save</CardTitle>
                            </div>
                            <Switch
                                checked={features.gamification?.cloudSave?.enabled || false}
                                onCheckedChange={(enabled) => updateGamificationFeature('cloudSave', { enabled })}
                            />
                        </div>
                        <CardDescription>
                            Sync player progress across devices
                        </CardDescription>
                    </CardHeader>
                    {features.gamification?.cloudSave?.enabled && (
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Platforms</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    {appType === 'godot' && (
                                        <>
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id="google-play-cloud"
                                                    checked={features.gamification.cloudSave.platforms?.includes('google-play')}
                                                    onCheckedChange={() => togglePlatform('cloudSave', 'google-play')}
                                                />
                                                <label htmlFor="google-play-cloud" className="text-sm cursor-pointer">
                                                    Google Play Games
                                                </label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id="game-center-cloud"
                                                    checked={features.gamification.cloudSave.platforms?.includes('game-center')}
                                                    onCheckedChange={() => togglePlatform('cloudSave', 'game-center')}
                                                />
                                                <label htmlFor="game-center-cloud" className="text-sm cursor-pointer">
                                                    Game Center (iOS)
                                                </label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id="steam-cloud"
                                                    checked={features.gamification.cloudSave.platforms?.includes('steam')}
                                                    onCheckedChange={() => togglePlatform('cloudSave', 'steam')}
                                                />
                                                <label htmlFor="steam-cloud" className="text-sm cursor-pointer">
                                                    Steam Cloud
                                                </label>
                                            </div>
                                        </>
                                    )}
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="firebase-cloud"
                                            checked={features.gamification.cloudSave.platforms?.includes('firebase')}
                                            onCheckedChange={() => togglePlatform('cloudSave', 'firebase')}
                                        />
                                        <label htmlFor="firebase-cloud" className="text-sm cursor-pointer">
                                            Firebase
                                        </label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="custom-cloud"
                                            checked={features.gamification.cloudSave.platforms?.includes('custom')}
                                            onCheckedChange={() => togglePlatform('cloudSave', 'custom')}
                                        />
                                        <label htmlFor="custom-cloud" className="text-sm cursor-pointer">
                                            Custom Backend
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    )}
                </Card>
            )}
        </div>
    );
}
