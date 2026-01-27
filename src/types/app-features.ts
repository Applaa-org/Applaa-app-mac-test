/**
 * App Features Configuration Types
 * 
 * Defines all available features for each app type with platform-specific capabilities.
 * This ensures users only see relevant, compatible features based on their chosen app type.
 */

// ============================================================================
// AI Capabilities
// ============================================================================

export type TextGenerationModel =
    | 'gpt-5.2'
    | 'gemini-3-pro'
    | 'gpt-5.1'
    | 'gpt-5'
    | 'gpt-5-mini'
    | 'gpt-5-nano'
    | 'grok-4-fast'
    | 'grok-4-reasoning'
    | 'gpt-5.1-streaming'
    | 'gpt-4.1'
    | 'gpt-4o';

export type ImageGenerationModel =
    | 'nano-banana-pro'
    | 'gpt-image-1'
    | 'gpt-image-1.5'
    | 'ideogram-3.0';

export type AudioGenerationModel =
    | 'gpt-4o-transcription'
    | 'elevenlabs-flash-2.5'
    | 'elevenlabs-sound-effects'
    | 'elevenlabs-music'
    | 'elevenlabs-voice-changer';

export type VideoGenerationModel =
    | 'sora-2'
    | 'sora-2-pro';

export interface AICapabilities {
    textGeneration?: {
        enabled: boolean;
        model: TextGenerationModel;
        apiKey?: string; // Encrypted
        maxTokens?: number;
        temperature?: number;
    };

    imageGeneration?: {
        enabled: boolean;
        model: ImageGenerationModel;
        apiKey?: string; // Encrypted
        imageSize?: '256x256' | '512x512' | '1024x1024' | '1792x1024';
        quality?: 'standard' | 'hd';
    };

    audioGeneration?: {
        enabled: boolean;
        model: AudioGenerationModel;
        apiKey?: string; // Encrypted
        voice?: string;
        stability?: number;
    };

    videoGeneration?: {
        enabled: boolean;
        model: VideoGenerationModel;
        apiKey?: string; // Encrypted
        resolution?: '480p' | '720p' | '1080p' | '4k';
        duration?: number; // seconds
    };
}

// ============================================================================
// Monetization
// ============================================================================

export type PaymentProvider =
    | 'revenuecat'
    | 'stripe'
    | 'paypal'
    | 'paddle'
    | 'lemonsqueezy'
    | 'steam';

export type AdProvider =
    // Web-specific
    | 'adsense'
    | 'carbon-ads'
    | 'ezoic'
    | 'media-net'
    // Mobile-specific
    | 'admob'
    | 'facebook-ads'
    | 'unity-ads'
    | 'applovin'
    | 'ironsource'
    // Game-specific
    | 'admob-godot'
    | 'unity-ads-godot'
    | 'ironsource-godot';

export type MonetizationModel =
    | 'freemium'
    | 'premium'
    | 'ad-supported'
    | 'family';

export interface SubscriptionTier {
    id: string;
    name: string;
    description: string;
    monthlyPrice: number;
    yearlyPrice: number;
    features: string[];
    revenueCatProductId?: string;
}

export interface MonetizationConfig {
    payment?: {
        enabled: boolean;
        providers: PaymentProvider[];
        apiKey?: string; // Encrypted
        monetizationModel?: MonetizationModel;
        subscriptionTiers?: SubscriptionTier[];
    };

    ads?: {
        enabled: boolean;
        providers: AdProvider[];
        adUnitIds?: {
            banner?: string;
            interstitial?: string;
            rewarded?: string;
            native?: string;
        };
    };
}

// ============================================================================
// Platform Features
// ============================================================================

export type HapticPattern =
    | 'light'
    | 'medium'
    | 'heavy'
    | 'success'
    | 'warning'
    | 'error';

export type DatabaseProvider =
    | 'supabase'
    | 'firebase'
    | 'mongodb'
    | 'planetscale'
    | 'expo-sqlite'
    | 'realm'
    | 'watermelondb';

export type CloudStorageProvider =
    | 'aws-s3'
    | 'cloudinary'
    | 'firebase-storage'
    | 'uploadcare'
    | 'supabase-storage';

export type AnalyticsProvider =
    | 'google-analytics'
    | 'plausible'
    | 'posthog'
    | 'mixpanel'
    | 'amplitude'
    | 'firebase-analytics'
    | 'segment'
    | 'gameanalytics'
    | 'unity-analytics';

export type ErrorTrackingProvider =
    | 'sentry'
    | 'logrocket'
    | 'rollbar'
    | 'bugsnag'
    | 'firebase-crashlytics';

export interface PlatformFeatures {
    haptics?: {
        enabled: boolean;
        patterns?: HapticPattern[];
    };

    pushNotifications?: {
        enabled: boolean;
        providers?: ('fcm' | 'apns' | 'onesignal' | 'firebase')[];
    };

    localNotifications?: {
        enabled: boolean;
    };

    camera?: {
        enabled: boolean;
        features?: ('photo' | 'video' | 'qr-scanner' | 'face-detection')[];
    };

    location?: {
        enabled: boolean;
        features?: ('gps' | 'geofencing' | 'background' | 'geocoding')[];
    };

    sensors?: {
        enabled: boolean;
        types?: ('accelerometer' | 'gyroscope' | 'magnetometer' | 'barometer' | 'pedometer')[];
    };

    biometrics?: {
        enabled: boolean;
        types?: ('face-id' | 'touch-id' | 'fingerprint')[];
    };

    fileSystem?: {
        enabled: boolean;
        allowedTypes?: string[]; // ['image/*', 'video/*', 'application/pdf']
        maxFileSize?: number; // in MB
    };

    secureStorage?: {
        enabled: boolean;
    };

    sharing?: {
        enabled: boolean;
    };

    contacts?: {
        enabled: boolean;
    };

    calendar?: {
        enabled: boolean;
    };

    database?: {
        enabled: boolean;
        providers: DatabaseProvider[];
    };

    cloudStorage?: {
        enabled: boolean;
        providers: CloudStorageProvider[];
    };

    analytics?: {
        enabled: boolean;
        providers: AnalyticsProvider[];
    };

    errorTracking?: {
        enabled: boolean;
        providers: ErrorTrackingProvider[];
    };
}

// ============================================================================
// Gamification (Game-specific)
// ============================================================================

export interface GamificationFeatures {
    achievements?: {
        enabled: boolean;
        platforms?: ('steam' | 'google-play' | 'game-center' | 'custom')[];
    };

    leaderboards?: {
        enabled: boolean;
        platforms?: ('steam' | 'google-play' | 'game-center' | 'firebase' | 'custom')[];
        types?: ('global' | 'friends' | 'daily' | 'weekly' | 'all-time')[];
    };

    progression?: {
        enabled: boolean;
        features?: ('levels' | 'xp' | 'skill-trees' | 'unlockables')[];
    };

    rewards?: {
        enabled: boolean;
        types?: ('daily' | 'login-bonus' | 'quest' | 'loot-box')[];
    };

    multiplayer?: {
        enabled: boolean;
        features?: ('matchmaking' | 'friends' | 'guilds' | 'chat')[];
    };

    cloudSave?: {
        enabled: boolean;
        platforms?: ('google-play' | 'game-center' | 'steam' | 'firebase' | 'custom')[];
    };
}

// ============================================================================
// Integrations
// ============================================================================

export interface IntegrationFeatures {
    maps?: {
        enabled: boolean;
        provider?: 'google-maps' | 'mapbox' | 'leaflet';
    };

    charts?: {
        enabled: boolean;
        library?: 'chart-js' | 'recharts' | 'd3' | 'echarts';
    };

    cms?: {
        enabled: boolean;
        provider?: 'sanity' | 'contentful' | 'strapi' | 'ghost';
    };

    ecommerce?: {
        enabled: boolean;
        provider?: 'shopify' | 'woocommerce' | 'stripe-products' | 'snipcart';
    };

    socialMedia?: {
        enabled: boolean;
        platforms?: ('twitter' | 'instagram' | 'facebook' | 'linkedin')[];
    };

    search?: {
        enabled: boolean;
        provider?: 'algolia' | 'meilisearch' | 'typesense' | 'elasticsearch';
    };
}

// ============================================================================
// Complete App Features Configuration
// ============================================================================

export interface AppFeaturesConfig {
    ai?: AICapabilities;
    monetization?: MonetizationConfig;
    platform?: PlatformFeatures;
    gamification?: GamificationFeatures;
    integrations?: IntegrationFeatures;
}

// ============================================================================
// App Type Capabilities
// ============================================================================

export type AppType =
    | 'web'
    | 'expo'
    | 'flutter'
    | 'godot'
    | 'arcade'
    | 'microbit'
    | 'minecraft'
    | 'blockly'
    | 'roblox';

export interface AppTypeCapabilities {
    appType: AppType;

    // AI Capabilities
    supportsTextGeneration: boolean;
    supportsImageGeneration: boolean;
    supportsAudioGeneration: boolean;
    supportsVideoGeneration: boolean;

    // Monetization
    supportsPayments: boolean;
    supportedPaymentProviders: PaymentProvider[];
    supportsAds: boolean;
    supportedAdProviders: AdProvider[];

    // Platform Features
    supportsHaptics: boolean;
    supportsPushNotifications: boolean;
    supportsLocalNotifications: boolean;
    supportsCamera: boolean;
    supportsLocation: boolean;
    supportsSensors: boolean;
    supportsBiometrics: boolean;
    supportsFileSystem: boolean;
    supportsSecureStorage: boolean;
    supportsSharing: boolean;
    supportsContacts: boolean;
    supportsCalendar: boolean;

    // Gamification
    supportsGamification: boolean;
    supportsAchievements: boolean;
    supportsLeaderboards: boolean;
    supportsMultiplayer: boolean;
    supportsCloudSave: boolean;

    // Integrations
    supportsMaps: boolean;
    supportsCharts: boolean;
    supportsCMS: boolean;
    supportsEcommerce: boolean;
    supportsSocialMedia: boolean;
    supportsSearch: boolean;

    // Database & Storage
    supportedDatabases: DatabaseProvider[];
    supportedCloudStorage: CloudStorageProvider[];
    supportedAnalytics: AnalyticsProvider[];
    supportedErrorTracking: ErrorTrackingProvider[];
}

// ============================================================================
// Feature Availability Matrix
// ============================================================================

export const APP_TYPE_CAPABILITIES: Record<AppType, AppTypeCapabilities> = {
    web: {
        appType: 'web',

        // AI
        supportsTextGeneration: true,
        supportsImageGeneration: true,
        supportsAudioGeneration: true,
        supportsVideoGeneration: true,

        // Monetization
        supportsPayments: true,
        supportedPaymentProviders: ['revenuecat', 'stripe', 'paypal', 'paddle', 'lemonsqueezy'],
        supportsAds: true,
        supportedAdProviders: ['adsense', 'carbon-ads', 'ezoic', 'media-net'],

        // Platform
        supportsHaptics: false,
        supportsPushNotifications: false, // Use web push instead
        supportsLocalNotifications: false,
        supportsCamera: false, // Use WebRTC instead
        supportsLocation: false, // Use Geolocation API instead
        supportsSensors: false,
        supportsBiometrics: false, // Use WebAuthn instead
        supportsFileSystem: true,
        supportsSecureStorage: true,
        supportsSharing: true,
        supportsContacts: false,
        supportsCalendar: false,

        // Gamification
        supportsGamification: false,
        supportsAchievements: false,
        supportsLeaderboards: false,
        supportsMultiplayer: true,
        supportsCloudSave: true,

        // Integrations
        supportsMaps: true,
        supportsCharts: true,
        supportsCMS: true,
        supportsEcommerce: true,
        supportsSocialMedia: true,
        supportsSearch: true,

        // Database & Storage
        supportedDatabases: ['supabase', 'firebase', 'mongodb', 'planetscale'],
        supportedCloudStorage: ['aws-s3', 'cloudinary', 'firebase-storage', 'uploadcare'],
        supportedAnalytics: ['google-analytics', 'plausible', 'posthog', 'mixpanel', 'amplitude'],
        supportedErrorTracking: ['sentry', 'logrocket', 'rollbar', 'bugsnag'],
    },

    expo: {
        appType: 'expo',

        // AI
        supportsTextGeneration: true,
        supportsImageGeneration: true,
        supportsAudioGeneration: true,
        supportsVideoGeneration: false, // Server-side only

        // Monetization
        supportsPayments: true,
        supportedPaymentProviders: ['revenuecat'],
        supportsAds: true,
        supportedAdProviders: ['admob', 'facebook-ads', 'unity-ads', 'applovin', 'ironsource'],

        // Platform (Native-rich)
        supportsHaptics: true,
        supportsPushNotifications: true,
        supportsLocalNotifications: true,
        supportsCamera: true,
        supportsLocation: true,
        supportsSensors: true,
        supportsBiometrics: true,
        supportsFileSystem: true,
        supportsSecureStorage: true,
        supportsSharing: true,
        supportsContacts: true,
        supportsCalendar: true,

        // Gamification
        supportsGamification: false,
        supportsAchievements: false,
        supportsLeaderboards: false,
        supportsMultiplayer: true,
        supportsCloudSave: true,

        // Integrations
        supportsMaps: true,
        supportsCharts: true,
        supportsCMS: false,
        supportsEcommerce: false,
        supportsSocialMedia: true,
        supportsSearch: false,

        // Database & Storage
        supportedDatabases: ['expo-sqlite', 'firebase', 'supabase', 'realm', 'watermelondb'],
        supportedCloudStorage: ['firebase-storage', 'aws-s3', 'cloudinary', 'supabase-storage'],
        supportedAnalytics: ['firebase-analytics', 'amplitude', 'mixpanel', 'segment'],
        supportedErrorTracking: ['sentry', 'bugsnag', 'firebase-crashlytics'],
    },

    flutter: {
        appType: 'flutter',

        // AI
        supportsTextGeneration: true,
        supportsImageGeneration: true,
        supportsAudioGeneration: true,
        supportsVideoGeneration: false,

        // Monetization
        supportsPayments: true,
        supportedPaymentProviders: ['revenuecat'],
        supportsAds: true,
        supportedAdProviders: ['admob', 'facebook-ads', 'unity-ads'],

        // Platform
        supportsHaptics: true,
        supportsPushNotifications: true,
        supportsLocalNotifications: true,
        supportsCamera: true,
        supportsLocation: true,
        supportsSensors: true,
        supportsBiometrics: true,
        supportsFileSystem: true,
        supportsSecureStorage: true,
        supportsSharing: true,
        supportsContacts: true,
        supportsCalendar: true,

        // Gamification
        supportsGamification: false,
        supportsAchievements: false,
        supportsLeaderboards: false,
        supportsMultiplayer: true,
        supportsCloudSave: true,

        // Integrations
        supportsMaps: true,
        supportsCharts: true,
        supportsCMS: false,
        supportsEcommerce: false,
        supportsSocialMedia: true,
        supportsSearch: false,

        // Database & Storage
        supportedDatabases: ['firebase', 'supabase'],
        supportedCloudStorage: ['firebase-storage', 'aws-s3'],
        supportedAnalytics: ['firebase-analytics', 'amplitude', 'mixpanel'],
        supportedErrorTracking: ['sentry', 'firebase-crashlytics'],
    },

    godot: {
        appType: 'godot',

        // AI
        supportsTextGeneration: true,
        supportsImageGeneration: true,
        supportsAudioGeneration: true,
        supportsVideoGeneration: false,

        // Monetization
        supportsPayments: true,
        supportedPaymentProviders: ['revenuecat', 'steam'],
        supportsAds: true,
        supportedAdProviders: ['admob-godot', 'unity-ads-godot', 'ironsource-godot'],

        // Platform
        supportsHaptics: true,
        supportsPushNotifications: true,
        supportsLocalNotifications: true,
        supportsCamera: false,
        supportsLocation: false,
        supportsSensors: false,
        supportsBiometrics: false,
        supportsFileSystem: true,
        supportsSecureStorage: true,
        supportsSharing: false,
        supportsContacts: false,
        supportsCalendar: false,

        // Gamification (Game-specific)
        supportsGamification: true,
        supportsAchievements: true,
        supportsLeaderboards: true,
        supportsMultiplayer: true,
        supportsCloudSave: true,

        // Integrations
        supportsMaps: false,
        supportsCharts: false,
        supportsCMS: false,
        supportsEcommerce: false,
        supportsSocialMedia: false,
        supportsSearch: false,

        // Database & Storage
        supportedDatabases: ['firebase', 'supabase'],
        supportedCloudStorage: ['firebase-storage', 'aws-s3'],
        supportedAnalytics: ['gameanalytics', 'unity-analytics', 'firebase-analytics'],
        supportedErrorTracking: ['sentry'],
    },

    arcade: {
        appType: 'arcade',

        // AI (Educational - limited)
        supportsTextGeneration: false,
        supportsImageGeneration: false,
        supportsAudioGeneration: false,
        supportsVideoGeneration: false,

        // Monetization (Educational - no monetization)
        supportsPayments: false,
        supportedPaymentProviders: [],
        supportsAds: false,
        supportedAdProviders: [],

        // Platform (Limited)
        supportsHaptics: false,
        supportsPushNotifications: false,
        supportsLocalNotifications: false,
        supportsCamera: false,
        supportsLocation: false,
        supportsSensors: false,
        supportsBiometrics: false,
        supportsFileSystem: false,
        supportsSecureStorage: false,
        supportsSharing: false,
        supportsContacts: false,
        supportsCalendar: false,

        // Gamification (Basic)
        supportsGamification: true,
        supportsAchievements: true,
        supportsLeaderboards: true,
        supportsMultiplayer: false,
        supportsCloudSave: false,

        // Integrations
        supportsMaps: false,
        supportsCharts: false,
        supportsCMS: false,
        supportsEcommerce: false,
        supportsSocialMedia: false,
        supportsSearch: false,

        // Database & Storage
        supportedDatabases: [],
        supportedCloudStorage: [],
        supportedAnalytics: [],
        supportedErrorTracking: [],
    },

    microbit: {
        appType: 'microbit',

        // AI (No AI)
        supportsTextGeneration: false,
        supportsImageGeneration: false,
        supportsAudioGeneration: false,
        supportsVideoGeneration: false,

        // Monetization (Educational - no monetization)
        supportsPayments: false,
        supportedPaymentProviders: [],
        supportsAds: false,
        supportedAdProviders: [],

        // Platform (Hardware-focused)
        supportsHaptics: false,
        supportsPushNotifications: false,
        supportsLocalNotifications: false,
        supportsCamera: false,
        supportsLocation: false,
        supportsSensors: true, // Hardware sensors
        supportsBiometrics: false,
        supportsFileSystem: false,
        supportsSecureStorage: false,
        supportsSharing: false,
        supportsContacts: false,
        supportsCalendar: false,

        // Gamification
        supportsGamification: false,
        supportsAchievements: false,
        supportsLeaderboards: false,
        supportsMultiplayer: false,
        supportsCloudSave: false,

        // Integrations
        supportsMaps: false,
        supportsCharts: false,
        supportsCMS: false,
        supportsEcommerce: false,
        supportsSocialMedia: false,
        supportsSearch: false,

        // Database & Storage
        supportedDatabases: [],
        supportedCloudStorage: [],
        supportedAnalytics: [],
        supportedErrorTracking: [],
    },

    minecraft: {
        appType: 'minecraft',

        // AI (Limited - asset generation)
        supportsTextGeneration: false,
        supportsImageGeneration: false, // External API for textures
        supportsAudioGeneration: false, // External API for sounds
        supportsVideoGeneration: false,

        // Monetization (Minecraft EULA restrictions)
        supportsPayments: false,
        supportedPaymentProviders: [],
        supportsAds: false,
        supportedAdProviders: [],

        // Platform
        supportsHaptics: false,
        supportsPushNotifications: false,
        supportsLocalNotifications: false,
        supportsCamera: false,
        supportsLocation: false,
        supportsSensors: false,
        supportsBiometrics: false,
        supportsFileSystem: true,
        supportsSecureStorage: false,
        supportsSharing: false,
        supportsContacts: false,
        supportsCalendar: false,

        // Gamification
        supportsGamification: false,
        supportsAchievements: false,
        supportsLeaderboards: false,
        supportsMultiplayer: false,
        supportsCloudSave: false,

        // Integrations
        supportsMaps: false,
        supportsCharts: false,
        supportsCMS: false,
        supportsEcommerce: false,
        supportsSocialMedia: false,
        supportsSearch: false,

        // Database & Storage
        supportedDatabases: [],
        supportedCloudStorage: [],
        supportedAnalytics: [],
        supportedErrorTracking: [],
    },

    blockly: {
        appType: 'blockly',

        // AI (No AI)
        supportsTextGeneration: false,
        supportsImageGeneration: false,
        supportsAudioGeneration: false,
        supportsVideoGeneration: false,

        // Monetization (Educational)
        supportsPayments: false,
        supportedPaymentProviders: [],
        supportsAds: false,
        supportedAdProviders: [],

        // Platform
        supportsHaptics: false,
        supportsPushNotifications: false,
        supportsLocalNotifications: false,
        supportsCamera: false,
        supportsLocation: false,
        supportsSensors: false,
        supportsBiometrics: false,
        supportsFileSystem: false,
        supportsSecureStorage: false,
        supportsSharing: false,
        supportsContacts: false,
        supportsCalendar: false,

        // Gamification
        supportsGamification: false,
        supportsAchievements: false,
        supportsLeaderboards: false,
        supportsMultiplayer: false,
        supportsCloudSave: false,

        // Integrations
        supportsMaps: false,
        supportsCharts: false,
        supportsCMS: false,
        supportsEcommerce: false,
        supportsSocialMedia: false,
        supportsSearch: false,

        // Database & Storage
        supportedDatabases: [],
        supportedCloudStorage: [],
        supportedAnalytics: [],
        supportedErrorTracking: [],
    },

    roblox: {
        appType: 'roblox',

        // AI (Full asset generation)
        supportsTextGeneration: true,  // Lua script generation
        supportsImageGeneration: true, // Textures via DALL-E
        supportsAudioGeneration: true, // Sounds via ElevenLabs
        supportsVideoGeneration: false,

        // Monetization (Roblox has own economy)
        supportsPayments: false,
        supportedPaymentProviders: [],
        supportsAds: false,
        supportedAdProviders: [],

        // Platform
        supportsHaptics: false,
        supportsPushNotifications: false,
        supportsLocalNotifications: false,
        supportsCamera: false,
        supportsLocation: false,
        supportsSensors: false,
        supportsBiometrics: false,
        supportsFileSystem: true,
        supportsSecureStorage: false,
        supportsSharing: false,
        supportsContacts: false,
        supportsCalendar: false,

        // Gamification (Roblox-native)
        supportsGamification: true,
        supportsAchievements: true,
        supportsLeaderboards: true,
        supportsMultiplayer: true,
        supportsCloudSave: true,

        // Integrations
        supportsMaps: false,
        supportsCharts: false,
        supportsCMS: false,
        supportsEcommerce: false,
        supportsSocialMedia: false,
        supportsSearch: false,

        // Database & Storage
        supportedDatabases: [],
        supportedCloudStorage: [],
        supportedAnalytics: ['gameanalytics'],
        supportedErrorTracking: [],
    },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get available features for a specific app type
 */
export function getAppTypeCapabilities(appType: AppType): AppTypeCapabilities {
    return APP_TYPE_CAPABILITIES[appType];
}

/**
 * Check if a specific feature is available for an app type
 */
export function isFeatureAvailable(
    appType: AppType,
    feature: keyof AppTypeCapabilities
): boolean {
    const capabilities = getAppTypeCapabilities(appType);
    return capabilities[feature] as boolean;
}

/**
 * Get supported providers for a feature
 */
export function getSupportedProviders(
    appType: AppType,
    providerType: 'payment' | 'ad' | 'database' | 'cloudStorage' | 'analytics' | 'errorTracking'
): string[] {
    const capabilities = getAppTypeCapabilities(appType);

    switch (providerType) {
        case 'payment':
            return capabilities.supportedPaymentProviders;
        case 'ad':
            return capabilities.supportedAdProviders;
        case 'database':
            return capabilities.supportedDatabases;
        case 'cloudStorage':
            return capabilities.supportedCloudStorage;
        case 'analytics':
            return capabilities.supportedAnalytics;
        case 'errorTracking':
            return capabilities.supportedErrorTracking;
        default:
            return [];
    }
}

/**
 * Validate feature configuration against app type capabilities
 */
export function validateFeatureConfig(
    appType: AppType,
    config: AppFeaturesConfig
): { valid: boolean; errors: string[] } {
    const capabilities = getAppTypeCapabilities(appType);
    const errors: string[] = [];

    // Validate AI features
    if (config.ai?.textGeneration?.enabled && !capabilities.supportsTextGeneration) {
        errors.push('Text generation is not supported for this app type');
    }
    if (config.ai?.imageGeneration?.enabled && !capabilities.supportsImageGeneration) {
        errors.push('Image generation is not supported for this app type');
    }
    if (config.ai?.audioGeneration?.enabled && !capabilities.supportsAudioGeneration) {
        errors.push('Audio generation is not supported for this app type');
    }
    if (config.ai?.videoGeneration?.enabled && !capabilities.supportsVideoGeneration) {
        errors.push('Video generation is not supported for this app type');
    }

    // Validate monetization
    if (config.monetization?.payment?.enabled && !capabilities.supportsPayments) {
        errors.push('Payments are not supported for this app type');
    }
    if (config.monetization?.ads?.enabled && !capabilities.supportsAds) {
        errors.push('Ads are not supported for this app type');
    }

    // Validate platform features
    if (config.platform?.haptics?.enabled && !capabilities.supportsHaptics) {
        errors.push('Haptics are not supported for this app type');
    }
    if (config.platform?.pushNotifications?.enabled && !capabilities.supportsPushNotifications) {
        errors.push('Push notifications are not supported for this app type');
    }
    if (config.platform?.camera?.enabled && !capabilities.supportsCamera) {
        errors.push('Camera is not supported for this app type');
    }
    if (config.platform?.location?.enabled && !capabilities.supportsLocation) {
        errors.push('Location services are not supported for this app type');
    }
    if (config.platform?.biometrics?.enabled && !capabilities.supportsBiometrics) {
        errors.push('Biometrics are not supported for this app type');
    }

    // Validate gamification
    if (config.gamification?.achievements?.enabled && !capabilities.supportsAchievements) {
        errors.push('Achievements are not supported for this app type');
    }
    if (config.gamification?.leaderboards?.enabled && !capabilities.supportsLeaderboards) {
        errors.push('Leaderboards are not supported for this app type');
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}
