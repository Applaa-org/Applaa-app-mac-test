/**
 * Feature Configuration Dialog
 * 
 * Allows users to configure app-type-specific features during app creation.
 * Intelligently filters and displays only compatible features based on the selected app type.
 */

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
    AppType,
    AppFeaturesConfig,
    getAppTypeCapabilities,
    validateFeatureConfig,
} from '../../types/app-features';
import { AICapabilitiesPanel } from './features/AICapabilitiesPanel';
import { MonetizationPanel } from './features/MonetizationPanel';
import { PlatformFeaturesPanel } from './features/PlatformFeaturesPanel';
import { GamificationPanel } from './features/GamificationPanel';
import { IntegrationsPanel } from './features/IntegrationsPanel';
import { Alert, AlertDescription } from '../ui/alert';
import { AlertCircle, Check } from 'lucide-react';

interface FeatureConfigDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    appType: AppType;
    onFeaturesSelected: (features: AppFeaturesConfig) => void;
    initialFeatures?: AppFeaturesConfig;
}

export function FeatureConfigDialog({
    open,
    onOpenChange,
    appType,
    onFeaturesSelected,
    initialFeatures,
}: FeatureConfigDialogProps) {
    const [features, setFeatures] = useState<AppFeaturesConfig>(initialFeatures || {});
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState('ai');

    const capabilities = getAppTypeCapabilities(appType);

    // Validate features whenever they change
    useEffect(() => {
        const validation = validateFeatureConfig(appType, features);
        setValidationErrors(validation.errors);
    }, [features, appType]);

    const handleSave = () => {
        const validation = validateFeatureConfig(appType, features);
        if (validation.valid) {
            onFeaturesSelected(features);
            onOpenChange(false);
        }
    };

    const handleSkip = () => {
        onFeaturesSelected({});
        onOpenChange(false);
    };

    // Count enabled features
    const enabledFeaturesCount = [
        features.ai?.textGeneration?.enabled,
        features.ai?.imageGeneration?.enabled,
        features.ai?.audioGeneration?.enabled,
        features.ai?.videoGeneration?.enabled,
        features.monetization?.payment?.enabled,
        features.monetization?.ads?.enabled,
        features.platform?.haptics?.enabled,
        features.platform?.pushNotifications?.enabled,
        features.platform?.camera?.enabled,
        features.gamification?.achievements?.enabled,
        features.gamification?.leaderboards?.enabled,
    ].filter(Boolean).length;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        Configure App Features
                        <Badge variant="outline" className="ml-2">
                            {appType.toUpperCase()}
                        </Badge>
                        {enabledFeaturesCount > 0 && (
                            <Badge variant="default" className="ml-auto">
                                {enabledFeaturesCount} feature{enabledFeaturesCount !== 1 ? 's' : ''} enabled
                            </Badge>
                        )}
                    </DialogTitle>
                    <DialogDescription>
                        Add powerful AI and platform capabilities to your {appType} app.
                        Only compatible features for this app type are shown.
                    </DialogDescription>
                </DialogHeader>

                {validationErrors.length > 0 && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            <ul className="list-disc list-inside">
                                {validationErrors.map((error, index) => (
                                    <li key={index}>{error}</li>
                                ))}
                            </ul>
                        </AlertDescription>
                    </Alert>
                )}

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-5">
                        <TabsTrigger value="ai" className="relative">
                            🤖 AI
                            {(features.ai?.textGeneration?.enabled ||
                                features.ai?.imageGeneration?.enabled ||
                                features.ai?.audioGeneration?.enabled ||
                                features.ai?.videoGeneration?.enabled) && (
                                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                    </span>
                                )}
                        </TabsTrigger>
                        <TabsTrigger value="monetization" className="relative">
                            💳 Monetization
                            {(features.monetization?.payment?.enabled || features.monetization?.ads?.enabled) && (
                                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                </span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="platform" className="relative">
                            📱 Platform
                            {(features.platform?.haptics?.enabled ||
                                features.platform?.pushNotifications?.enabled ||
                                features.platform?.camera?.enabled) && (
                                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                    </span>
                                )}
                        </TabsTrigger>
                        {capabilities.supportsGamification && (
                            <TabsTrigger value="gamification" className="relative">
                                🎮 Gamification
                                {(features.gamification?.achievements?.enabled ||
                                    features.gamification?.leaderboards?.enabled) && (
                                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                        </span>
                                    )}
                            </TabsTrigger>
                        )}
                        <TabsTrigger value="integrations" className="relative">
                            🔌 Integrations
                            {(features.integrations?.maps?.enabled ||
                                features.integrations?.charts?.enabled) && (
                                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                    </span>
                                )}
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="ai" className="mt-6">
                        <AICapabilitiesPanel
                            appType={appType}
                            capabilities={capabilities}
                            features={features}
                            onFeaturesChange={setFeatures}
                        />
                    </TabsContent>

                    <TabsContent value="monetization" className="mt-6">
                        <MonetizationPanel
                            appType={appType}
                            capabilities={capabilities}
                            features={features}
                            onFeaturesChange={setFeatures}
                        />
                    </TabsContent>

                    <TabsContent value="platform" className="mt-6">
                        <PlatformFeaturesPanel
                            appType={appType}
                            capabilities={capabilities}
                            features={features}
                            onFeaturesChange={setFeatures}
                        />
                    </TabsContent>

                    {capabilities.supportsGamification && (
                        <TabsContent value="gamification" className="mt-6">
                            <GamificationPanel
                                appType={appType}
                                capabilities={capabilities}
                                features={features}
                                onFeaturesChange={setFeatures}
                            />
                        </TabsContent>
                    )}

                    <TabsContent value="integrations" className="mt-6">
                        <IntegrationsPanel
                            appType={appType}
                            capabilities={capabilities}
                            features={features}
                            onFeaturesChange={setFeatures}
                        />
                    </TabsContent>
                </Tabs>

                <div className="flex justify-between items-center mt-6 pt-6 border-t">
                    <Button variant="ghost" onClick={handleSkip}>
                        Skip for now
                    </Button>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={validationErrors.length > 0}
                            className="gap-2"
                        >
                            <Check className="h-4 w-4" />
                            Save Configuration
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
