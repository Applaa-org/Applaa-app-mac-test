import { ipcMain } from 'electron';
import log from 'electron-log';
import { 
  initializeAnalytics, 
  trackEvent, 
  trackError, 
  trackPerformance,
  updateConsent,
  getConsent,
  isAnalyticsInitialized,
  AnalyticsConfig,
  AnalyticsConsent,
  AnalyticsEventName,
  AnalyticsEventData,
  DEFAULT_CONSENT
} from '../../lib/analytics';
import { readSettings, writeSettings } from '../../main/settings';

export function registerAnalyticsHandlers() {
  // Initialize analytics
  ipcMain.handle('analytics:initialize', async (_, config: AnalyticsConfig) => {
    try {
      initializeAnalytics(config);
      log.info('Analytics initialized via IPC');
      return { success: true, message: 'Analytics initialized successfully' };
    } catch (error) {
      log.error('Failed to initialize analytics via IPC:', error);
      return { success: false, error: error.message };
    }
  });

  // Initialize analytics from settings
  ipcMain.handle('analytics:initialize-from-settings', async () => {
    try {
      const settings = readSettings();
      
      // Get analytics configuration from environment and settings
      const config: AnalyticsConfig = {
        ga4MeasurementId: process.env.GA4_MEASUREMENT_ID,
        sentryDsn: process.env.SENTRY_DSN,
        environment: (process.env.NODE_ENV as 'development' | 'production') || 'development',
        userId: settings.userId, // Assuming we have a userId in settings
        consent: settings.analyticsConsent || DEFAULT_CONSENT,
      };

      // Only initialize if we have at least one service configured
      if (config.ga4MeasurementId || config.sentryDsn) {
        initializeAnalytics(config);
        log.info('Analytics initialized from settings');
        return { success: true, message: 'Analytics initialized from settings' };
      } else {
        log.info('Analytics not configured - skipping initialization');
        return { success: false, error: 'Analytics not configured' };
      }
    } catch (error) {
      log.error('Failed to initialize analytics from settings:', error);
      return { success: false, error: error.message };
    }
  });

  // Track event
  ipcMain.handle('analytics:track-event', async (_, params: {
    eventName: AnalyticsEventName;
    eventData: any;
    skipConsent?: boolean;
  }) => {
    try {
      trackEvent(params.eventName, params.eventData, { skipConsent: params.skipConsent });
      return { success: true };
    } catch (error) {
      log.error('Failed to track event:', error);
      return { success: false, error: error.message };
    }
  });

  // Track error
  ipcMain.handle('analytics:track-error', async (_, params: {
    error: { name: string; message: string; stack?: string };
    context?: Record<string, any>;
  }) => {
    try {
      const error = new Error(params.error.message);
      error.name = params.error.name;
      if (params.error.stack) {
        error.stack = params.error.stack;
      }
      
      trackError(error, params.context);
      return { success: true };
    } catch (trackingError) {
      log.error('Failed to track error:', trackingError);
      return { success: false, error: trackingError.message };
    }
  });

  // Track performance
  ipcMain.handle('analytics:track-performance', async (_, params: {
    metric: string;
    value: number;
    context?: Record<string, any>;
  }) => {
    try {
      trackPerformance(params.metric, params.value, params.context);
      return { success: true };
    } catch (error) {
      log.error('Failed to track performance:', error);
      return { success: false, error: error.message };
    }
  });

  // Update consent
  ipcMain.handle('analytics:update-consent', async (_, consent: Partial<AnalyticsConsent>) => {
    try {
      updateConsent(consent);
      
      // Save consent to settings
      const settings = readSettings();
      settings.analyticsConsent = { ...settings.analyticsConsent, ...consent };
      writeSettings(settings);
      
      log.info('Analytics consent updated and saved');
      return { success: true, message: 'Consent updated successfully' };
    } catch (error) {
      log.error('Failed to update consent:', error);
      return { success: false, error: error.message };
    }
  });

  // Get consent
  ipcMain.handle('analytics:get-consent', async () => {
    try {
      const consent = getConsent();
      return { success: true, consent };
    } catch (error) {
      log.error('Failed to get consent:', error);
      return { success: false, error: error.message };
    }
  });

  // Check if analytics is initialized
  ipcMain.handle('analytics:is-initialized', async () => {
    try {
      const initialized = isAnalyticsInitialized();
      return { success: true, initialized };
    } catch (error) {
      log.error('Failed to check analytics initialization:', error);
      return { success: false, error: error.message };
    }
  });

  // Get analytics configuration status
  ipcMain.handle('analytics:get-config-status', async () => {
    try {
      const hasGA4 = !!process.env.GA4_MEASUREMENT_ID;
      const hasSentry = !!process.env.SENTRY_DSN;
      const isInitialized = isAnalyticsInitialized();
      
      return {
        success: true,
        status: {
          hasGA4,
          hasSentry,
          isInitialized,
          environment: process.env.NODE_ENV || 'development',
        },
      };
    } catch (error) {
      log.error('Failed to get analytics config status:', error);
      return { success: false, error: error.message };
    }
  });

  // Save analytics configuration
  ipcMain.handle('analytics:save-config', async (_, config: {
    ga4MeasurementId?: string;
    sentryDsn?: string;
    enableAnalytics?: boolean;
  }) => {
    try {
      const settings = readSettings();
      
      // Save to settings (for persistence across restarts)
      settings.analyticsConfig = {
        ...settings.analyticsConfig,
        ga4MeasurementId: config.ga4MeasurementId,
        sentryDsn: config.sentryDsn,
        enableAnalytics: config.enableAnalytics,
      };
      
      writeSettings(settings);
      
      log.info('Analytics configuration saved');
      return { success: true, message: 'Configuration saved successfully' };
    } catch (error) {
      log.error('Failed to save analytics config:', error);
      return { success: false, error: error.message };
    }
  });

  // Convenience methods for common events
  ipcMain.handle('analytics:app-creation-started', async (_, params: {
    appType: string;
    template?: string;
  }) => {
    try {
      trackEvent('app_creation_started', { 
        app_type: params.appType, 
        template: params.template 
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('analytics:app-creation-completed', async (_, params: {
    appType: string;
    duration: number;
  }) => {
    try {
      trackEvent('app_creation_completed', { 
        app_type: params.appType, 
        duration: params.duration 
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('analytics:preview-opened', async (_, params: {
    appType: string;
    previewType: string;
  }) => {
    try {
      trackEvent('preview_opened', { 
        app_type: params.appType, 
        preview_type: params.previewType 
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('analytics:chat-message-sent', async (_, params: {
    messageLength: number;
    appContext: boolean;
  }) => {
    try {
      trackEvent('chat_message_sent', { 
        message_length: params.messageLength, 
        app_context: params.appContext 
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('analytics:code-generated', async (_, params: {
    linesOfCode: number;
    language: string;
  }) => {
    try {
      trackEvent('code_generated', { 
        lines_of_code: params.linesOfCode, 
        language: params.language 
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('analytics:expo-preview-used', async (_, params: {
    success: boolean;
    loadTime: number;
  }) => {
    try {
      trackEvent('expo_preview_used', { 
        success: params.success, 
        load_time: params.loadTime 
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('analytics:github-sync-used', async (_, params: {
    action: 'push' | 'pull' | 'clone';
  }) => {
    try {
      trackEvent('github_sync_used', { action: params.action });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('analytics:cloud-storage-used', async (_, params: {
    action: 'upload' | 'download' | 'sync';
  }) => {
    try {
      trackEvent('cloud_storage_used', { action: params.action });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('analytics:user-signed-in', async (_, params: {
    method?: 'email' | 'oauth';
  }) => {
    try {
      trackEvent('user_signed_in', { method: params.method || 'email' });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('analytics:user-signed-up', async (_, params: {
    method?: 'email' | 'oauth';
  }) => {
    try {
      trackEvent('user_signed_up', { method: params.method || 'email' });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('analytics:user-signed-out', async () => {
    try {
      trackEvent('user_signed_out', {});
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('analytics:app-synced', async (_, params: {
    appId: number;
    fileCount: number;
    sizeBytes: number;
  }) => {
    try {
      trackEvent('app_synced', { 
        app_id: params.appId, 
        file_count: params.fileCount, 
        size_bytes: params.sizeBytes 
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('analytics:app-restored', async (_, params: {
    appId: number;
    fileCount: number;
  }) => {
    try {
      trackEvent('app_restored', { 
        app_id: params.appId, 
        file_count: params.fileCount 
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('analytics:sync-failed', async (_, params: {
    errorType: string;
    appId: number;
  }) => {
    try {
      trackEvent('sync_failed', { 
        error_type: params.errorType, 
        app_id: params.appId 
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

