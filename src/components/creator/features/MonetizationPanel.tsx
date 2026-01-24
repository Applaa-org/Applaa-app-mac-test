/**
 * Monetization Panel
 * 
 * Allows users to configure payment providers and advertising networks.
 * Shows only monetization options supported by the selected app type.
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Label } from '../../ui/label';
import { Switch } from '../../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import {
    AppType,
    AppFeaturesConfig,
    AppTypeCapabilities,
    PaymentProvider,
    AdProvider,
    MonetizationModel,
} from '../../../types/app-features';
import { CreditCard, DollarSign, TrendingUp, Megaphone, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '../../ui/alert';

interface MonetizationPanelProps {
    appType: AppType;
    capabilities: AppTypeCapabilities;
    features: AppFeaturesConfig;
    onFeaturesChange: (features: AppFeaturesConfig) => void;
}

const PAYMENT_PROVIDERS = {
    revenuecat: { name: 'RevenueCat', description: 'Cross-platform subscriptions', platforms: ['web', 'expo', 'flutter', 'godot'] },
    stripe: { name: 'Stripe', description: 'Payment processing', platforms: ['web'] },
    paypal: { name: 'PayPal', description: 'PayPal payments', platforms: ['web'] },
    paddle: { name: 'Paddle', description: 'SaaS billing', platforms: ['web'] },
    lemonsqueezy: { name: 'LemonSqueezy', description: 'Digital products', platforms: ['web'] },
    steam: { name: 'Steam', description: 'Steam payments', platforms: ['godot'] },
};

const AD_PROVIDERS = {
    // Web-specific
    adsense: { name: 'Google AdSense', description: 'Web advertising', badge: 'Web Only', platforms: ['web'] },
    'carbon-ads': { name: 'Carbon Ads', description: 'Developer-focused ads', badge: 'Web Only', platforms: ['web'] },
    ezoic: { name: 'Ezoic', description: 'AI-optimized ads', badge: 'Web Only', platforms: ['web'] },
    'media-net': { name: 'Media.net', description: 'Contextual ads', badge: 'Web Only', platforms: ['web'] },

    // Mobile-specific
    admob: { name: 'Google AdMob', description: 'Mobile advertising', badge: 'Mobile', platforms: ['expo', 'flutter'] },
    'facebook-ads': { name: 'Facebook Audience Network', description: 'Facebook ads', badge: 'Mobile', platforms: ['expo', 'flutter'] },
    'unity-ads': { name: 'Unity Ads', description: 'Gaming ads', badge: 'Mobile', platforms: ['expo', 'flutter'] },
    applovin: { name: 'AppLovin', description: 'Mobile monetization', badge: 'Mobile', platforms: ['expo', 'flutter'] },
    ironsource: { name: 'IronSource', description: 'Ad mediation', badge: 'Mobile', platforms: ['expo', 'flutter'] },

    // Game-specific
    'admob-godot': { name: 'AdMob (Godot)', description: 'AdMob for Godot', badge: 'Game', platforms: ['godot'] },
    'unity-ads-godot': { name: 'Unity Ads (Godot)', description: 'Unity Ads for Godot', badge: 'Game', platforms: ['godot'] },
    'ironsource-godot': { name: 'IronSource (Godot)', description: 'IronSource for Godot', badge: 'Game', platforms: ['godot'] },
};

const MONETIZATION_MODELS = {
    freemium: { name: 'Freemium', description: 'Free with premium features', recommended: true },
    premium: { name: 'Premium', description: 'Paid app or subscription' },
    'ad-supported': { name: 'Ad-Supported', description: 'Free with ads' },
    family: { name: 'Family Plan', description: 'Family subscription' },
};

export function MonetizationPanel({
    appType,
    capabilities,
    features,
    onFeaturesChange,
}: MonetizationPanelProps) {
    const updateMonetization = (updates: any) => {
        onFeaturesChange({
            ...features,
            monetization: {
                ...features.monetization,
                ...updates,
            },
        });
    };

    const updatePayment = (updates: any) => {
        onFeaturesChange({
            ...features,
            monetization: {
                ...features.monetization,
                payment: {
                    ...features.monetization?.payment,
                    ...updates,
                },
            },
        });
    };

    const updateAds = (updates: any) => {
        onFeaturesChange({
            ...features,
            monetization: {
                ...features.monetization,
                ads: {
                    ...features.monetization?.ads,
                    ...updates,
                },
            },
        });
    };

    const toggleAdProvider = (provider: AdProvider) => {
        const currentProviders = features.monetization?.ads?.providers || [];
        const newProviders = currentProviders.includes(provider)
            ? currentProviders.filter(p => p !== provider)
            : [...currentProviders, provider];
        updateAds({ providers: newProviders });
    };

    if (!capabilities.supportsPayments && !capabilities.supportsAds) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Monetization Not Available</CardTitle>
                    <CardDescription>
                        Monetization features are not supported for {appType} apps (educational platform).
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Payment Providers */}
            {capabilities.supportsPayments && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <CreditCard className="h-5 w-5 text-blue-500" />
                                <CardTitle>Payment Integration</CardTitle>
                            </div>
                            <Switch
                                checked={features.monetization?.payment?.enabled || false}
                                onCheckedChange={(enabled) => updatePayment({ enabled })}
                            />
                        </div>
                        <CardDescription>
                            Accept payments and manage subscriptions
                        </CardDescription>
                    </CardHeader>
                    {features.monetization?.payment?.enabled && (
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Monetization Model</Label>
                                <Select
                                    value={features.monetization.payment.monetizationModel || 'freemium'}
                                    onValueChange={(model) => updatePayment({ monetizationModel: model as MonetizationModel })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(MONETIZATION_MODELS).map(([key, model]) => (
                                            <SelectItem key={key} value={key}>
                                                <div className="flex items-center gap-2">
                                                    <span>{model.name}</span>
                                                    {model.recommended && <Badge variant="outline" className="text-xs">Recommended</Badge>}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    {MONETIZATION_MODELS[features.monetization.payment.monetizationModel || 'freemium'].description}
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label>Payment Provider</Label>
                                <div className="grid grid-cols-1 gap-2">
                                    {capabilities.supportedPaymentProviders.map((provider) => {
                                        const providerInfo = PAYMENT_PROVIDERS[provider as keyof typeof PAYMENT_PROVIDERS];
                                        const isSelected = features.monetization?.payment?.providers?.includes(provider);

                                        return (
                                            <Card
                                                key={provider}
                                                className={`cursor-pointer transition-colors ${isSelected ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                                                    }`}
                                                onClick={() => {
                                                    const currentProviders = features.monetization?.payment?.providers || [];
                                                    const newProviders = isSelected
                                                        ? currentProviders.filter(p => p !== provider)
                                                        : [...currentProviders, provider];
                                                    updatePayment({ providers: newProviders });
                                                }}
                                            >
                                                <CardHeader className="p-4">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <CardTitle className="text-sm">{providerInfo.name}</CardTitle>
                                                            <CardDescription className="text-xs">{providerInfo.description}</CardDescription>
                                                        </div>
                                                        {isSelected && <Badge>Selected</Badge>}
                                                    </div>
                                                </CardHeader>
                                            </Card>
                                        );
                                    })}
                                </div>
                            </div>

                            {features.monetization.payment.providers && features.monetization.payment.providers.length > 0 && (
                                <div className="space-y-2">
                                    <Label>API Key</Label>
                                    <Input
                                        type="password"
                                        placeholder="Enter your API key..."
                                        value={features.monetization.payment.apiKey || ''}
                                        onChange={(e) => updatePayment({ apiKey: e.target.value })}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Your API key will be encrypted and stored securely
                                    </p>
                                </div>
                            )}

                            <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    <strong>Kid-Friendly Pricing:</strong> For apps targeting children, we recommend pricing between $1.99-$4.99/month
                                    with parental consent flows.
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    )}
                </Card>
            )}

            {/* Advertising */}
            {capabilities.supportsAds && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Megaphone className="h-5 w-5 text-green-500" />
                                <CardTitle>Advertising</CardTitle>
                            </div>
                            <Switch
                                checked={features.monetization?.ads?.enabled || false}
                                onCheckedChange={(enabled) => updateAds({ enabled })}
                            />
                        </div>
                        <CardDescription>
                            Display ads to monetize your app
                        </CardDescription>
                    </CardHeader>
                    {features.monetization?.ads?.enabled && (
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Ad Networks</Label>
                                <div className="grid grid-cols-1 gap-2">
                                    {capabilities.supportedAdProviders.map((provider) => {
                                        const providerInfo = AD_PROVIDERS[provider as keyof typeof AD_PROVIDERS];
                                        const isSelected = features.monetization?.ads?.providers?.includes(provider);

                                        return (
                                            <Card
                                                key={provider}
                                                className={`cursor-pointer transition-colors ${isSelected ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                                                    }`}
                                                onClick={() => toggleAdProvider(provider)}
                                            >
                                                <CardHeader className="p-4">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <CardTitle className="text-sm">{providerInfo.name}</CardTitle>
                                                                {providerInfo.badge && (
                                                                    <Badge variant="outline" className="text-xs">{providerInfo.badge}</Badge>
                                                                )}
                                                            </div>
                                                            <CardDescription className="text-xs">{providerInfo.description}</CardDescription>
                                                        </div>
                                                        {isSelected && <Badge>Selected</Badge>}
                                                    </div>
                                                </CardHeader>
                                            </Card>
                                        );
                                    })}
                                </div>
                            </div>

                            {features.monetization.ads.providers && features.monetization.ads.providers.length > 0 && (
                                <>
                                    <div className="space-y-2">
                                        <Label>Ad Unit IDs</Label>
                                        <div className="space-y-2">
                                            <Input
                                                placeholder="Banner Ad Unit ID"
                                                value={features.monetization.ads.adUnitIds?.banner || ''}
                                                onChange={(e) => updateAds({
                                                    adUnitIds: {
                                                        ...features.monetization?.ads?.adUnitIds,
                                                        banner: e.target.value,
                                                    },
                                                })}
                                            />
                                            <Input
                                                placeholder="Interstitial Ad Unit ID"
                                                value={features.monetization.ads.adUnitIds?.interstitial || ''}
                                                onChange={(e) => updateAds({
                                                    adUnitIds: {
                                                        ...features.monetization?.ads?.adUnitIds,
                                                        interstitial: e.target.value,
                                                    },
                                                })}
                                            />
                                            <Input
                                                placeholder="Rewarded Ad Unit ID"
                                                value={features.monetization.ads.adUnitIds?.rewarded || ''}
                                                onChange={(e) => updateAds({
                                                    adUnitIds: {
                                                        ...features.monetization?.ads?.adUnitIds,
                                                        rewarded: e.target.value,
                                                    },
                                                })}
                                            />
                                        </div>
                                    </div>

                                    <Alert>
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertDescription>
                                            <strong>COPPA Compliance:</strong> If your app targets children under 13, ensure your ad network
                                            settings comply with COPPA regulations.
                                        </AlertDescription>
                                    </Alert>
                                </>
                            )}
                        </CardContent>
                    )}
                </Card>
            )}

            {/* Revenue Projection */}
            {(features.monetization?.payment?.enabled || features.monetization?.ads?.enabled) && (
                <Card className="bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950 dark:to-blue-950">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-green-600" />
                            <CardTitle>Revenue Potential</CardTitle>
                        </div>
                        <CardDescription>
                            Estimated monthly revenue based on your configuration
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {features.monetization?.payment?.enabled && (
                                <div className="flex justify-between items-center">
                                    <span className="text-sm">Subscriptions (100 users @ $2.99)</span>
                                    <span className="font-bold text-green-600">$299/month</span>
                                </div>
                            )}
                            {features.monetization?.ads?.enabled && (
                                <div className="flex justify-between items-center">
                                    <span className="text-sm">Ad Revenue (1000 DAU)</span>
                                    <span className="font-bold text-green-600">$50-150/month</span>
                                </div>
                            )}
                            <div className="border-t pt-2 mt-2">
                                <div className="flex justify-between items-center">
                                    <span className="font-semibold">Total Potential</span>
                                    <span className="font-bold text-lg text-green-600">
                                        ${features.monetization?.payment?.enabled && features.monetization?.ads?.enabled
                                            ? '349-449'
                                            : features.monetization?.payment?.enabled
                                                ? '299'
                                                : '50-150'}/month
                                    </span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
