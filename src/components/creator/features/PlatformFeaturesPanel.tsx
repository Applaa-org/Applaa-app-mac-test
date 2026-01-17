/**
 * Platform Features Panel
 * 
 * Allows users to configure platform-specific features like haptics, notifications,
 * camera, location, sensors, biometrics, etc.
 * Shows only features supported by the selected app type.
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Label } from '../../ui/label';
import { Switch } from '../../ui/switch';
import { Badge } from '../../ui/badge';
import {
    AppType,
    AppFeaturesConfig,
    AppTypeCapabilities,
} from '../../../types/app-features';
import {
    Smartphone,
    Bell,
    Camera,
    MapPin,
    Gauge,
    Fingerprint,
    FolderOpen,
    Lock,
    Share2,
    Users,
    Calendar,
    Database,
    Cloud,
    BarChart3,
    AlertTriangle,
} from 'lucide-react';

interface PlatformFeaturesPanelProps {
    appType: AppType;
    capabilities: AppTypeCapabilities;
    features: AppFeaturesConfig;
    onFeaturesChange: (features: AppFeaturesConfig) => void;
}

interface FeatureCardProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    enabled: boolean;
    onToggle: (enabled: boolean) => void;
    badge?: string;
    badgeVariant?: 'default' | 'secondary' | 'outline';
}

function FeatureCard({ icon, title, description, enabled, onToggle, badge, badgeVariant = 'outline' }: FeatureCardProps) {
    return (
        <Card className={`transition-colors ${enabled ? 'border-primary bg-primary/5' : ''}`}>
            <CardHeader className="p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                        <div className={`p-2 rounded-lg ${enabled ? 'bg-primary/10' : 'bg-muted'}`}>
                            {icon}
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <CardTitle className="text-sm">{title}</CardTitle>
                                {badge && <Badge variant={badgeVariant} className="text-xs">{badge}</Badge>}
                            </div>
                            <CardDescription className="text-xs mt-1">{description}</CardDescription>
                        </div>
                    </div>
                    <Switch checked={enabled} onCheckedChange={onToggle} />
                </div>
            </CardHeader>
        </Card>
    );
}

export function PlatformFeaturesPanel({
    appType,
    capabilities,
    features,
    onFeaturesChange,
}: PlatformFeaturesPanelProps) {
    const updatePlatformFeature = (feature: string, updates: any) => {
        onFeaturesChange({
            ...features,
            platform: {
                ...features.platform,
                [feature]: {
                    ...((features.platform as any)?.[feature] || {}),
                    ...updates,
                },
            },
        });
    };

    const hasAnyFeatures =
        capabilities.supportsHaptics ||
        capabilities.supportsPushNotifications ||
        capabilities.supportsLocalNotifications ||
        capabilities.supportsCamera ||
        capabilities.supportsLocation ||
        capabilities.supportsSensors ||
        capabilities.supportsBiometrics ||
        capabilities.supportsFileSystem ||
        capabilities.supportsSecureStorage ||
        capabilities.supportsSharing ||
        capabilities.supportsContacts ||
        capabilities.supportsCalendar;

    if (!hasAnyFeatures) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Platform Features Not Available</CardTitle>
                    <CardDescription>
                        Platform-specific features are limited for {appType} apps.
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Native Features Section */}
            {(capabilities.supportsHaptics ||
                capabilities.supportsPushNotifications ||
                capabilities.supportsLocalNotifications ||
                capabilities.supportsCamera ||
                capabilities.supportsLocation ||
                capabilities.supportsSensors ||
                capabilities.supportsBiometrics) && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-4">
                            <Smartphone className="h-5 w-5 text-blue-500" />
                            <h3 className="text-lg font-semibold">Native Features</h3>
                            <Badge variant="outline">Mobile</Badge>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            {capabilities.supportsHaptics && (
                                <FeatureCard
                                    icon={<Smartphone className="h-4 w-4 text-purple-500" />}
                                    title="Haptics"
                                    description="Vibration feedback for user interactions"
                                    enabled={features.platform?.haptics?.enabled || false}
                                    onToggle={(enabled) => updatePlatformFeature('haptics', { enabled })}
                                    badge="Native"
                                />
                            )}

                            {capabilities.supportsPushNotifications && (
                                <FeatureCard
                                    icon={<Bell className="h-4 w-4 text-blue-500" />}
                                    title="Push Notifications"
                                    description="Send notifications to users (FCM, APNs)"
                                    enabled={features.platform?.pushNotifications?.enabled || false}
                                    onToggle={(enabled) => updatePlatformFeature('pushNotifications', { enabled })}
                                    badge="Native"
                                />
                            )}

                            {capabilities.supportsLocalNotifications && (
                                <FeatureCard
                                    icon={<Bell className="h-4 w-4 text-green-500" />}
                                    title="Local Notifications"
                                    description="Schedule notifications on device"
                                    enabled={features.platform?.localNotifications?.enabled || false}
                                    onToggle={(enabled) => updatePlatformFeature('localNotifications', { enabled })}
                                    badge="Native"
                                />
                            )}

                            {capabilities.supportsCamera && (
                                <FeatureCard
                                    icon={<Camera className="h-4 w-4 text-red-500" />}
                                    title="Camera"
                                    description="Photo/video capture and QR scanning"
                                    enabled={features.platform?.camera?.enabled || false}
                                    onToggle={(enabled) => updatePlatformFeature('camera', { enabled })}
                                    badge="Native"
                                />
                            )}

                            {capabilities.supportsLocation && (
                                <FeatureCard
                                    icon={<MapPin className="h-4 w-4 text-orange-500" />}
                                    title="Location Services"
                                    description="GPS tracking and geofencing"
                                    enabled={features.platform?.location?.enabled || false}
                                    onToggle={(enabled) => updatePlatformFeature('location', { enabled })}
                                    badge="Native"
                                />
                            )}

                            {capabilities.supportsSensors && (
                                <FeatureCard
                                    icon={<Gauge className="h-4 w-4 text-cyan-500" />}
                                    title="Sensors"
                                    description="Accelerometer, gyroscope, magnetometer"
                                    enabled={features.platform?.sensors?.enabled || false}
                                    onToggle={(enabled) => updatePlatformFeature('sensors', { enabled })}
                                    badge="Native"
                                />
                            )}

                            {capabilities.supportsBiometrics && (
                                <FeatureCard
                                    icon={<Fingerprint className="h-4 w-4 text-indigo-500" />}
                                    title="Biometric Authentication"
                                    description="Face ID, Touch ID, Fingerprint"
                                    enabled={features.platform?.biometrics?.enabled || false}
                                    onToggle={(enabled) => updatePlatformFeature('biometrics', { enabled })}
                                    badge="Native"
                                />
                            )}
                        </div>
                    </div>
                )}

            {/* Data & Storage Section */}
            {(capabilities.supportsFileSystem ||
                capabilities.supportsSecureStorage ||
                capabilities.supportedDatabases.length > 0 ||
                capabilities.supportedCloudStorage.length > 0) && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-4">
                            <Database className="h-5 w-5 text-green-500" />
                            <h3 className="text-lg font-semibold">Data & Storage</h3>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            {capabilities.supportsFileSystem && (
                                <FeatureCard
                                    icon={<FolderOpen className="h-4 w-4 text-yellow-500" />}
                                    title="File System"
                                    description="File upload, download, and management"
                                    enabled={features.platform?.fileSystem?.enabled || false}
                                    onToggle={(enabled) => updatePlatformFeature('fileSystem', { enabled })}
                                />
                            )}

                            {capabilities.supportsSecureStorage && (
                                <FeatureCard
                                    icon={<Lock className="h-4 w-4 text-red-500" />}
                                    title="Secure Storage"
                                    description="Encrypted local storage (Keychain/KeyStore)"
                                    enabled={features.platform?.secureStorage?.enabled || false}
                                    onToggle={(enabled) => updatePlatformFeature('secureStorage', { enabled })}
                                />
                            )}

                            {capabilities.supportedDatabases.length > 0 && (
                                <FeatureCard
                                    icon={<Database className="h-4 w-4 text-blue-500" />}
                                    title="Database"
                                    description={`Available: ${capabilities.supportedDatabases.slice(0, 2).join(', ')}`}
                                    enabled={features.platform?.database?.enabled || false}
                                    onToggle={(enabled) => updatePlatformFeature('database', { enabled })}
                                />
                            )}

                            {capabilities.supportedCloudStorage.length > 0 && (
                                <FeatureCard
                                    icon={<Cloud className="h-4 w-4 text-purple-500" />}
                                    title="Cloud Storage"
                                    description={`Available: ${capabilities.supportedCloudStorage.slice(0, 2).join(', ')}`}
                                    enabled={features.platform?.cloudStorage?.enabled || false}
                                    onToggle={(enabled) => updatePlatformFeature('cloudStorage', { enabled })}
                                />
                            )}
                        </div>
                    </div>
                )}

            {/* Social & Communication Section */}
            {(capabilities.supportsSharing ||
                capabilities.supportsContacts ||
                capabilities.supportsCalendar) && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-4">
                            <Share2 className="h-5 w-5 text-orange-500" />
                            <h3 className="text-lg font-semibold">Social & Communication</h3>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            {capabilities.supportsSharing && (
                                <FeatureCard
                                    icon={<Share2 className="h-4 w-4 text-blue-500" />}
                                    title="Sharing"
                                    description="Native share sheet for social media"
                                    enabled={features.platform?.sharing?.enabled || false}
                                    onToggle={(enabled) => updatePlatformFeature('sharing', { enabled })}
                                    badge="Native"
                                />
                            )}

                            {capabilities.supportsContacts && (
                                <FeatureCard
                                    icon={<Users className="h-4 w-4 text-green-500" />}
                                    title="Contacts"
                                    description="Access and manage device contacts"
                                    enabled={features.platform?.contacts?.enabled || false}
                                    onToggle={(enabled) => updatePlatformFeature('contacts', { enabled })}
                                    badge="Native"
                                />
                            )}

                            {capabilities.supportsCalendar && (
                                <FeatureCard
                                    icon={<Calendar className="h-4 w-4 text-purple-500" />}
                                    title="Calendar"
                                    description="Read and create calendar events"
                                    enabled={features.platform?.calendar?.enabled || false}
                                    onToggle={(enabled) => updatePlatformFeature('calendar', { enabled })}
                                    badge="Native"
                                />
                            )}
                        </div>
                    </div>
                )}

            {/* Analytics & Monitoring Section */}
            {(capabilities.supportedAnalytics.length > 0 ||
                capabilities.supportedErrorTracking.length > 0) && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-4">
                            <BarChart3 className="h-5 w-5 text-cyan-500" />
                            <h3 className="text-lg font-semibold">Analytics & Monitoring</h3>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            {capabilities.supportedAnalytics.length > 0 && (
                                <FeatureCard
                                    icon={<BarChart3 className="h-4 w-4 text-blue-500" />}
                                    title="Analytics"
                                    description={`Available: ${capabilities.supportedAnalytics.slice(0, 2).join(', ')}`}
                                    enabled={features.platform?.analytics?.enabled || false}
                                    onToggle={(enabled) => updatePlatformFeature('analytics', { enabled })}
                                />
                            )}

                            {capabilities.supportedErrorTracking.length > 0 && (
                                <FeatureCard
                                    icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
                                    title="Error Tracking"
                                    description={`Available: ${capabilities.supportedErrorTracking.slice(0, 2).join(', ')}`}
                                    enabled={features.platform?.errorTracking?.enabled || false}
                                    onToggle={(enabled) => updatePlatformFeature('errorTracking', { enabled })}
                                />
                            )}
                        </div>
                    </div>
                )}

            {/* Summary Card */}
            {Object.values(features.platform || {}).some((f: any) => f?.enabled) && (
                <Card className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
                    <CardHeader>
                        <CardTitle className="text-sm">Enabled Platform Features</CardTitle>
                        <CardDescription className="text-xs">
                            {Object.values(features.platform || {}).filter((f: any) => f?.enabled).length} feature(s) will be integrated into your app
                        </CardDescription>
                    </CardHeader>
                </Card>
            )}
        </div>
    );
}
