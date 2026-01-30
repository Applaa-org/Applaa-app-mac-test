import log from 'electron-log';

// Analytics event types based on the roadmap
export interface ApplaaAnalytics {
  // User Journey Events
  app_creation_started: { app_type: string; template?: string };
  app_creation_completed: { app_type: string; duration: number };
  preview_opened: { app_type: string; preview_type: string };
  
  // Engagement Events
  chat_message_sent: { message_length: number; app_context: boolean };
  code_generated: { lines_of_code: number; language: string };
  error_encountered: { error_type: string; component: string };
  
  // Feature Usage
  expo_preview_used: { success: boolean; load_time: number };
  github_sync_used: { action: 'push' | 'pull' | 'clone' };
  cloud_storage_used: { action: 'upload' | 'download' | 'sync' };
  
  // Authentication Events
  user_signed_in: { method: 'email' | 'oauth' };
  user_signed_up: { method: 'email' | 'oauth' };
  user_signed_out: {};
  
  // Cloud Sync Events
  app_synced: { app_id: number; file_count: number; size_bytes: number };
  app_restored: { app_id: number; file_count: number };
  sync_failed: { error_type: string; app_id: number };
}

export type AnalyticsEventName = keyof ApplaaAnalytics;
export type AnalyticsEventData<T extends AnalyticsEventName> = ApplaaAnalytics[T];

// User consent management
export interface AnalyticsConsent {
  essential: boolean; // Always true (app functionality)
  analytics: boolean; // GA4 tracking
  performance: boolean; // Performance monitoring
  crash_reporting: boolean; // Error tracking
  improvement_data: boolean; // Feature usage for product improvement
}

// Default consent (privacy-first)
export const DEFAULT_CONSENT: AnalyticsConsent = {
  essential: true,
  analytics: false,
  performance: false,
  crash_reporting: false,
  improvement_data: false,
};

// Analytics configuration
export interface AnalyticsConfig {
  ga4MeasurementId?: string;
  sentryDsn?: string;
  environment: 'development' | 'production';
  userId?: string;
  consent: AnalyticsConsent;
}

// Global analytics state
let analyticsConfig: AnalyticsConfig | null = null;
let isInitialized = false;

// Initialize analytics services
export function initializeAnalytics(config: AnalyticsConfig): void {
  analyticsConfig = config;
  
  try {
    // Initialize GA4 if consent given and config available
    if (config.consent.analytics && config.ga4MeasurementId) {
      initializeGA4(config.ga4MeasurementId, config.userId);
    }
    
    // Initialize Sentry if consent given and config available
    if (config.consent.crash_reporting && config.sentryDsn) {
      initializeSentry(config.sentryDsn, config.environment, config.userId);
    }
    
    isInitialized = true;
  } catch (error) {
    log.error('Failed to initialize analytics:', error);
  }
}

// Initialize Google Analytics 4
function initializeGA4(measurementId: string, userId?: string): void {
  try {
    // For Electron, we'll use gtag via a script injection approach
    // This is a simplified implementation - in production you'd want to use the official GA4 SDK
    
    // Create gtag function
    (window as any).dataLayer = (window as any).dataLayer || [];
    function gtag(...args: any[]) {
      (window as any).dataLayer.push(args);
    }
    
    // Configure GA4
    gtag('js', new Date());
    gtag('config', measurementId, {
      user_id: userId,
      app_name: 'Applaa Desktop',
      app_version: process.env.npm_package_version || '1.0.0',
      custom_map: {
        custom_parameter_1: 'app_type',
        custom_parameter_2: 'component',
      },
    });
    
    // Store gtag function globally
    (window as any).gtag = gtag;
    
    log.info('GA4 initialized successfully');
  } catch (error) {
    log.error('Failed to initialize GA4:', error);
  }
}

// Initialize Sentry
function initializeSentry(dsn: string, environment: string, userId?: string): void {
  try {
    // Dynamic import to avoid bundling Sentry if not needed
    import('@sentry/electron').then((Sentry) => {
      Sentry.init({
        dsn,
        environment,
        tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
        beforeSend: (event) => {
          // Privacy filter - remove sensitive data
          return sanitizeSentryEvent(event);
        },
      });
      
      if (userId) {
        Sentry.setUser({ id: userId });
      }
      
      log.info('Sentry initialized successfully');
    }).catch((error) => {
      log.error('Failed to load Sentry:', error);
    });
  } catch (error) {
    log.error('Failed to initialize Sentry:', error);
  }
}

// Sanitize Sentry events to remove sensitive data
function sanitizeSentryEvent(event: any): any {
  if (!event) return event;
  
  // Remove sensitive data from breadcrumbs
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((breadcrumb: any) => {
      if (breadcrumb.data) {
        // Remove potential API keys, tokens, passwords
        const sensitiveKeys = ['password', 'token', 'key', 'secret', 'auth'];
        for (const key of sensitiveKeys) {
          if (breadcrumb.data[key]) {
            breadcrumb.data[key] = '[REDACTED]';
          }
        }
      }
      return breadcrumb;
    });
  }
  
  // Remove sensitive data from extra context
  if (event.extra) {
    const sensitiveKeys = ['password', 'token', 'key', 'secret', 'auth'];
    for (const key of sensitiveKeys) {
      if (event.extra[key]) {
        event.extra[key] = '[REDACTED]';
      }
    }
  }
  
  return event;
}

// Track analytics event
export function trackEvent<T extends AnalyticsEventName>(
  eventName: T,
  eventData: AnalyticsEventData<T>,
  options?: {
    skipConsent?: boolean; // For essential events only
  }
): void {
  if (!isInitialized || !analyticsConfig) {
    log.warn('Analytics not initialized');
    return;
  }
  
  // Check consent (unless explicitly skipped for essential events)
  if (!options?.skipConsent) {
    const needsAnalyticsConsent = !analyticsConfig.consent.analytics;
    const needsPerformanceConsent = !analyticsConfig.consent.performance;
    const needsImprovementConsent = !analyticsConfig.consent.improvement_data;
    
    // Determine if this event requires consent
    const performanceEvents = ['expo_preview_used', 'app_creation_completed'];
    const analyticsEvents = ['chat_message_sent', 'code_generated', 'preview_opened'];
    
    if (performanceEvents.includes(eventName) && needsPerformanceConsent) {
      return;
    }
    
    if (analyticsEvents.includes(eventName) && needsAnalyticsConsent) {
      return;
    }
    
    if (needsImprovementConsent && !performanceEvents.includes(eventName) && !analyticsEvents.includes(eventName)) {
      return;
    }
  }
  
  try {
    // Track with GA4 if available
    if (analyticsConfig.consent.analytics && (window as any).gtag) {
      (window as any).gtag('event', eventName, {
        ...eventData,
        event_category: getEventCategory(eventName),
        custom_parameter_1: (eventData as any).app_type || '',
        custom_parameter_2: (eventData as any).component || '',
      });
    }
    
    // Log for development
    if (analyticsConfig.environment === 'development') {
      log.info(`Analytics Event: ${eventName}`, eventData);
    }
  } catch (error) {
    log.error('Failed to track event:', error);
  }
}

// Get event category for GA4
function getEventCategory(eventName: AnalyticsEventName): string {
  if (eventName.includes('app_creation')) return 'App Creation';
  if (eventName.includes('preview')) return 'Preview';
  if (eventName.includes('chat') || eventName.includes('code')) return 'AI Interaction';
  if (eventName.includes('github')) return 'GitHub Integration';
  if (eventName.includes('cloud') || eventName.includes('sync')) return 'Cloud Storage';
  if (eventName.includes('user_')) return 'Authentication';
  if (eventName.includes('error')) return 'Errors';
  return 'General';
}

// Track error
export function trackError(error: Error, context?: Record<string, any>): void {
  if (!isInitialized || !analyticsConfig) {
    return;
  }
  
  try {
    // Track with Sentry if available and consent given
    if (analyticsConfig.consent.crash_reporting) {
      import('@sentry/electron').then((Sentry) => {
        Sentry.captureException(error, {
          extra: context,
          tags: {
            component: 'applaa-desktop',
          },
        });
      }).catch(() => {
        // Sentry not available, continue
      });
    }
    
    // Track as analytics event
    trackEvent('error_encountered', {
      error_type: error.name || 'Unknown',
      component: context?.component || 'Unknown',
    });
  } catch (trackingError) {
    log.error('Failed to track error:', trackingError);
  }
}

// Track performance metric
export function trackPerformance(metric: string, value: number, context?: Record<string, any>): void {
  if (!isInitialized || !analyticsConfig || !analyticsConfig.consent.performance) {
    return;
  }
  
  try {
    if ((window as any).gtag) {
      (window as any).gtag('event', 'timing_complete', {
        name: metric,
        value: Math.round(value),
        event_category: 'Performance',
        ...context,
      });
    }
  } catch (error) {
    log.error('Failed to track performance:', error);
  }
}

// Update consent
export function updateConsent(consent: Partial<AnalyticsConsent>): void {
  if (!analyticsConfig) {
    log.warn('Analytics not initialized');
    return;
  }
  
  const newConsent = { ...analyticsConfig.consent, ...consent };
  analyticsConfig.consent = newConsent;
  
  // Re-initialize services based on new consent
  if (newConsent.analytics && analyticsConfig.ga4MeasurementId && !(window as any).gtag) {
    initializeGA4(analyticsConfig.ga4MeasurementId, analyticsConfig.userId);
  }
  
  if (newConsent.crash_reporting && analyticsConfig.sentryDsn) {
    initializeSentry(analyticsConfig.sentryDsn, analyticsConfig.environment, analyticsConfig.userId);
  }
  
  log.info('Analytics consent updated:', newConsent);
}

// Get current consent
export function getConsent(): AnalyticsConsent | null {
  return analyticsConfig?.consent || null;
}

// Check if analytics is initialized
export function isAnalyticsInitialized(): boolean {
  return isInitialized;
}

// Utility functions for common tracking patterns
export const Analytics = {
  // App lifecycle
  appCreationStarted: (appType: string, template?: string) => 
    trackEvent('app_creation_started', { app_type: appType, template }),
  
  appCreationCompleted: (appType: string, duration: number) => 
    trackEvent('app_creation_completed', { app_type: appType, duration }),
  
  previewOpened: (appType: string, previewType: string) => 
    trackEvent('preview_opened', { app_type: appType, preview_type: previewType }),
  
  // AI interaction
  chatMessageSent: (messageLength: number, hasAppContext: boolean) => 
    trackEvent('chat_message_sent', { message_length: messageLength, app_context: hasAppContext }),
  
  codeGenerated: (linesOfCode: number, language: string) => 
    trackEvent('code_generated', { lines_of_code: linesOfCode, language }),
  
  // Feature usage
  expoPreviewUsed: (success: boolean, loadTime: number) => 
    trackEvent('expo_preview_used', { success, load_time: loadTime }),
  
  githubSyncUsed: (action: 'push' | 'pull' | 'clone') => 
    trackEvent('github_sync_used', { action }),
  
  cloudStorageUsed: (action: 'upload' | 'download' | 'sync') => 
    trackEvent('cloud_storage_used', { action }),
  
  // Authentication
  userSignedIn: (method: 'email' | 'oauth' = 'email') => 
    trackEvent('user_signed_in', { method }),
  
  userSignedUp: (method: 'email' | 'oauth' = 'email') => 
    trackEvent('user_signed_up', { method }),
  
  userSignedOut: () => 
    trackEvent('user_signed_out', {}),
  
  // Cloud sync
  appSynced: (appId: number, fileCount: number, sizeBytes: number) => 
    trackEvent('app_synced', { app_id: appId, file_count: fileCount, size_bytes: sizeBytes }),
  
  appRestored: (appId: number, fileCount: number) => 
    trackEvent('app_restored', { app_id: appId, file_count: fileCount }),
  
  syncFailed: (errorType: string, appId: number) => 
    trackEvent('sync_failed', { error_type: errorType, app_id: appId }),
};

