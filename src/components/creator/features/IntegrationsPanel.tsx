/**
 * Integrations Panel
 * 
 * Allows users to configure third-party integrations like maps, charts,
 * CMS, e-commerce, social media, and search.
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Label } from '../../ui/label';
import { Switch } from '../../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Badge } from '../../ui/badge';
import {
    AppType,
    AppFeaturesConfig,
    AppTypeCapabilities,
} from '../../../types/app-features';
import {
    Map,
    BarChart3,
    FileText,
    ShoppingCart,
    Share2,
    Search,
} from 'lucide-react';

interface IntegrationsPanelProps {
    appType: AppType;
    capabilities: AppTypeCapabilities;
    features: AppFeaturesConfig;
    onFeaturesChange: (features: AppFeaturesConfig) => void;
}

export function IntegrationsPanel({
    appType,
    capabilities,
    features,
    onFeaturesChange,
}: IntegrationsPanelProps) {
    const updateIntegration = (integration: string, updates: any) => {
        onFeaturesChange({
            ...features,
            integrations: {
                ...features.integrations,
                [integration]: {
                    ...(features.integrations as any)?.[integration],
                    ...updates,
                },
            },
        });
    };

    const hasAnyIntegrations =
        capabilities.supportsMaps ||
        capabilities.supportsCharts ||
        capabilities.supportsCMS ||
        capabilities.supportsEcommerce ||
        capabilities.supportsSocialMedia ||
        capabilities.supportsSearch;

    if (!hasAnyIntegrations) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Integrations Not Available</CardTitle>
                    <CardDescription>
                        Third-party integrations are limited for {appType} apps.
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Maps */}
            {capabilities.supportsMaps && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Map className="h-5 w-5 text-blue-500" />
                                <CardTitle>Maps</CardTitle>
                            </div>
                            <Switch
                                checked={features.integrations?.maps?.enabled || false}
                                onCheckedChange={(enabled) => updateIntegration('maps', { enabled })}
                            />
                        </div>
                        <CardDescription>
                            Integrate interactive maps into your app
                        </CardDescription>
                    </CardHeader>
                    {features.integrations?.maps?.enabled && (
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Map Provider</Label>
                                <Select
                                    value={features.integrations.maps.provider || 'google-maps'}
                                    onValueChange={(provider) => updateIntegration('maps', { provider })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="google-maps">
                                            <div className="flex items-center gap-2">
                                                <span>Google Maps</span>
                                                <Badge variant="outline" className="text-xs">Popular</Badge>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="mapbox">
                                            <div className="flex items-center gap-2">
                                                <span>Mapbox</span>
                                                <Badge variant="outline" className="text-xs">Customizable</Badge>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="leaflet">
                                            <div className="flex items-center gap-2">
                                                <span>Leaflet</span>
                                                <Badge variant="outline" className="text-xs">Open Source</Badge>
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    )}
                </Card>
            )}

            {/* Charts */}
            {capabilities.supportsCharts && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <BarChart3 className="h-5 w-5 text-purple-500" />
                                <CardTitle>Charts & Visualization</CardTitle>
                            </div>
                            <Switch
                                checked={features.integrations?.charts?.enabled || false}
                                onCheckedChange={(enabled) => updateIntegration('charts', { enabled })}
                            />
                        </div>
                        <CardDescription>
                            Add data visualization and charts
                        </CardDescription>
                    </CardHeader>
                    {features.integrations?.charts?.enabled && (
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Chart Library</Label>
                                <Select
                                    value={features.integrations.charts.library || 'chart-js'}
                                    onValueChange={(library) => updateIntegration('charts', { library })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="chart-js">
                                            <div className="flex items-center gap-2">
                                                <span>Chart.js</span>
                                                <Badge variant="outline" className="text-xs">Simple</Badge>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="recharts">
                                            <div className="flex items-center gap-2">
                                                <span>Recharts</span>
                                                <Badge variant="outline" className="text-xs">React</Badge>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="d3">
                                            <div className="flex items-center gap-2">
                                                <span>D3.js</span>
                                                <Badge variant="outline" className="text-xs">Advanced</Badge>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="echarts">
                                            <div className="flex items-center gap-2">
                                                <span>Apache ECharts</span>
                                                <Badge variant="outline" className="text-xs">Enterprise</Badge>
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    )}
                </Card>
            )}

            {/* CMS */}
            {capabilities.supportsCMS && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-green-500" />
                                <CardTitle>Content Management System</CardTitle>
                            </div>
                            <Switch
                                checked={features.integrations?.cms?.enabled || false}
                                onCheckedChange={(enabled) => updateIntegration('cms', { enabled })}
                            />
                        </div>
                        <CardDescription>
                            Manage content with a headless CMS
                        </CardDescription>
                    </CardHeader>
                    {features.integrations?.cms?.enabled && (
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>CMS Provider</Label>
                                <Select
                                    value={features.integrations.cms.provider || 'sanity'}
                                    onValueChange={(provider) => updateIntegration('cms', { provider })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="sanity">
                                            <div className="flex items-center gap-2">
                                                <span>Sanity</span>
                                                <Badge variant="outline" className="text-xs">Recommended</Badge>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="contentful">Contentful</SelectItem>
                                        <SelectItem value="strapi">
                                            <div className="flex items-center gap-2">
                                                <span>Strapi</span>
                                                <Badge variant="outline" className="text-xs">Open Source</Badge>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="ghost">Ghost</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    )}
                </Card>
            )}

            {/* E-commerce */}
            {capabilities.supportsEcommerce && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ShoppingCart className="h-5 w-5 text-orange-500" />
                                <CardTitle>E-commerce</CardTitle>
                            </div>
                            <Switch
                                checked={features.integrations?.ecommerce?.enabled || false}
                                onCheckedChange={(enabled) => updateIntegration('ecommerce', { enabled })}
                            />
                        </div>
                        <CardDescription>
                            Sell products and manage orders
                        </CardDescription>
                    </CardHeader>
                    {features.integrations?.ecommerce?.enabled && (
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>E-commerce Platform</Label>
                                <Select
                                    value={features.integrations.ecommerce.provider || 'shopify'}
                                    onValueChange={(provider) => updateIntegration('ecommerce', { provider })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="shopify">
                                            <div className="flex items-center gap-2">
                                                <span>Shopify</span>
                                                <Badge variant="outline" className="text-xs">Popular</Badge>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="woocommerce">WooCommerce</SelectItem>
                                        <SelectItem value="stripe-products">Stripe Products</SelectItem>
                                        <SelectItem value="snipcart">Snipcart</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    )}
                </Card>
            )}

            {/* Social Media */}
            {capabilities.supportsSocialMedia && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Share2 className="h-5 w-5 text-blue-500" />
                                <CardTitle>Social Media Integration</CardTitle>
                            </div>
                            <Switch
                                checked={features.integrations?.socialMedia?.enabled || false}
                                onCheckedChange={(enabled) => updateIntegration('socialMedia', { enabled })}
                            />
                        </div>
                        <CardDescription>
                            Connect with social media platforms
                        </CardDescription>
                    </CardHeader>
                    {features.integrations?.socialMedia?.enabled && (
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Platforms</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['twitter', 'instagram', 'facebook', 'linkedin'].map((platform) => (
                                        <Card
                                            key={platform}
                                            className={`cursor-pointer transition-colors ${features.integrations?.socialMedia?.platforms?.includes(platform as any)
                                                    ? 'border-primary bg-primary/5'
                                                    : 'hover:border-primary/50'
                                                }`}
                                            onClick={() => {
                                                const currentPlatforms = features.integrations?.socialMedia?.platforms || [];
                                                const newPlatforms = currentPlatforms.includes(platform as any)
                                                    ? currentPlatforms.filter((p: string) => p !== platform)
                                                    : [...currentPlatforms, platform];
                                                updateIntegration('socialMedia', { platforms: newPlatforms });
                                            }}
                                        >
                                            <CardHeader className="p-3">
                                                <CardTitle className="text-sm capitalize">{platform}</CardTitle>
                                            </CardHeader>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    )}
                </Card>
            )}

            {/* Search */}
            {capabilities.supportsSearch && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Search className="h-5 w-5 text-cyan-500" />
                                <CardTitle>Search</CardTitle>
                            </div>
                            <Switch
                                checked={features.integrations?.search?.enabled || false}
                                onCheckedChange={(enabled) => updateIntegration('search', { enabled })}
                            />
                        </div>
                        <CardDescription>
                            Add powerful search functionality
                        </CardDescription>
                    </CardHeader>
                    {features.integrations?.search?.enabled && (
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Search Provider</Label>
                                <Select
                                    value={features.integrations.search.provider || 'algolia'}
                                    onValueChange={(provider) => updateIntegration('search', { provider })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="algolia">
                                            <div className="flex items-center gap-2">
                                                <span>Algolia</span>
                                                <Badge variant="outline" className="text-xs">Fast</Badge>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="meilisearch">
                                            <div className="flex items-center gap-2">
                                                <span>Meilisearch</span>
                                                <Badge variant="outline" className="text-xs">Open Source</Badge>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="typesense">Typesense</SelectItem>
                                        <SelectItem value="elasticsearch">
                                            <div className="flex items-center gap-2">
                                                <span>Elasticsearch</span>
                                                <Badge variant="outline" className="text-xs">Enterprise</Badge>
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    )}
                </Card>
            )}

            {/* Summary */}
            {Object.values(features.integrations || {}).some((i: any) => i?.enabled) && (
                <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950">
                    <CardHeader>
                        <CardTitle className="text-sm">Enabled Integrations</CardTitle>
                        <CardDescription className="text-xs">
                            {Object.values(features.integrations || {}).filter((i: any) => i?.enabled).length} integration(s) will be added to your app
                        </CardDescription>
                    </CardHeader>
                </Card>
            )}
        </div>
    );
}
