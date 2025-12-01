// Renderer-side analytics initialization
// This runs in the renderer process where window is available

import { AnalyticsConfig, AnalyticsConsent, DEFAULT_CONSENT } from './analytics';

// Global analytics state for renderer
let analyticsConfig: AnalyticsConfig | null = null;
let isInitialized = false;

// Initialize Google Analytics 4 in renderer process
function initializeGA4(measurementId: string, userId?: string): void {
  try {
    if (typeof window === 'undefined') {
      console.warn('GA4: window is not available');
      return;
    }

    // Load GA4 script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script);

    // Initialize dataLayer and gtag
    (window as any).dataLayer = (window as any).dataLayer || [];
    function gtag(...args: any[]) {
      (window as any).dataLayer.push(args);
    }

    // Configure GA4
    gtag('js', new Date());
    gtag('config', measurementId, {
      user_id: userId,
      app_name: 'Applaa Desktop',
      app_version: (window as any).__APP_VERSION__ || '1.0.0',
      custom_map: {
        custom_parameter_1: 'app_type',
        custom_parameter_2: 'component',
      },
    });

    // Store gtag function globally
    (window as any).gtag = gtag;

    console.log('✅ GA4 initialized successfully in renderer');
  } catch (error) {
    console.error('❌ Failed to initialize GA4:', error);
  }
}

// Initialize analytics in renderer process
export function initializeAnalyticsRenderer(config: AnalyticsConfig): void {
  analyticsConfig = config;
  
  try {
    // Initialize GA4 if consent given and config available
    if (config.consent.analytics && config.ga4MeasurementId) {
      initializeGA4(config.ga4MeasurementId, config.userId);
    }
    
    isInitialized = true;
    console.log('✅ Analytics initialized successfully in renderer');
  } catch (error) {
    console.error('❌ Failed to initialize analytics:', error);
  }
}

// Track event in renderer process
export function trackEventRenderer(
  eventName: string,
  eventData: Record<string, any>,
  options?: { skipConsent?: boolean }
): void {
  if (!isInitialized || !analyticsConfig) {
    console.warn('Analytics not initialized in renderer');
    return;
  }

  // Check consent (unless explicitly skipped for essential events)
  if (!options?.skipConsent) {
    const needsAnalyticsConsent = !analyticsConfig.consent.analytics;
    const analyticsEvents = ['chat_message_sent', 'code_generated', 'preview_opened'];
    
    if (analyticsEvents.includes(eventName) && needsAnalyticsConsent) {
      return;
    }
  }

  try {
    // Track with GA4 if available
    if (analyticsConfig.consent.analytics && (window as any).gtag) {
      (window as any).gtag('event', eventName, {
        ...eventData,
        event_category: getEventCategory(eventName),
        custom_parameter_1: eventData.app_type || '',
        custom_parameter_2: eventData.component || '',
      });
      console.log(`📊 GA4 Event: ${eventName}`, eventData);
    }
  } catch (error) {
    console.error('Failed to track event:', error);
  }
}

// Get event category for GA4
function getEventCategory(eventName: string): string {
  if (eventName.includes('app_creation')) return 'App Creation';
  if (eventName.includes('preview')) return 'Preview';
  if (eventName.includes('chat') || eventName.includes('code')) return 'AI Interaction';
  if (eventName.includes('github')) return 'GitHub Integration';
  if (eventName.includes('cloud') || eventName.includes('sync')) return 'Cloud Storage';
  if (eventName.includes('user_')) return 'Authentication';
  if (eventName.includes('error')) return 'Errors';
  return 'General';
}

// Check if analytics is initialized
export function isAnalyticsInitializedRenderer(): boolean {
  return isInitialized;
}

// Get current config
export function getAnalyticsConfigRenderer(): AnalyticsConfig | null {
  return analyticsConfig;
}


