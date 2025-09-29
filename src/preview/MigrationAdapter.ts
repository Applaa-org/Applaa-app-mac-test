/**
 * 🔄 MIGRATION ADAPTER
 * 
 * Backward compatibility layer for existing preview components:
 * - Maintains existing API contracts
 * - Gradual migration to unified system
 * - Legacy component support
 * - Seamless transition
 */

import { EventEmitter } from 'events';
import log from 'electron-log';
import { UnifiedPreviewManager } from './UnifiedPreviewManager';
import { PreviewState, PreviewManagerConfig } from './types';
import { AppType } from './types-simple';

const logger = log.scope('migration-adapter');

// Legacy interfaces for backward compatibility
interface LegacyPreviewStatus {
  isRunning: boolean;
  port?: number;
  url?: string;
  qrCode?: string;
  error?: string;
  logs?: string[];
}

interface LegacyIntelligentPreviewState {
  phase: 'idle' | 'preparing' | 'generating' | 'building' | 'ready' | 'error';
  progress: number;
  message: string;
  appId?: number;
  error?: string;
}

/**
 * MigrationAdapter - Provides backward compatibility for existing preview components
 * 
 * This adapter allows existing components to work with the new unified system
 * without requiring immediate refactoring. It translates between old and new APIs.
 */
export class MigrationAdapter extends EventEmitter {
  private unifiedManager: UnifiedPreviewManager;
  private legacyAppMappings = new Map<string, number>(); // Legacy ID -> Unified ID
  private nextLegacyId = 1;
  private isInitialized = false;

  constructor(config?: Partial<PreviewManagerConfig>) {
    super();
    this.unifiedManager = new UnifiedPreviewManager(config);
    
    // Forward events from unified manager
    this.setupEventForwarding();
    
    logger.info('🔄 MigrationAdapter initialized');
  }

  /**
   * Initialize the migration adapter
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      await this.unifiedManager.initialize();
      this.isInitialized = true;
      logger.info('✅ MigrationAdapter initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize MigrationAdapter:', error);
      throw error;
    }
  }

  // ===========================================
  // LEGACY UNIFIED EXPO PREVIEW API
  // ===========================================

  /**
   * Legacy: Start Expo preview (unified_expo_preview.ts compatibility)
   */
  public async startExpoPreview(projectPath: string, options?: {
    tunnel?: boolean;
    lan?: boolean;
    port?: number;
  }): Promise<LegacyPreviewStatus> {
    try {
      logger.info(`🚀 Starting Expo preview (legacy API): ${projectPath}`);
      
      const appId = await this.unifiedManager.startApp({
        type: 'expo',
        projectPath,
        config: {
          tunnel: options?.tunnel || false,
          lan: options?.lan || false,
          port: options?.port,
        },
      });
      
      // Create legacy mapping
      const legacyId = `expo_${this.nextLegacyId++}`;
      this.legacyAppMappings.set(legacyId, appId);
      
      // Wait for app to be ready
      const state = await this.waitForAppReady(appId, 30000);
      
      return this.convertToLegacyStatus(state);
      
    } catch (error) {
      logger.error('❌ Failed to start Expo preview:', error);
      return {
        isRunning: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Legacy: Get Expo preview status
   */
  public async getExpoPreviewStatus(legacyId?: string): Promise<LegacyPreviewStatus> {
    try {
      if (legacyId) {
        const appId = this.legacyAppMappings.get(legacyId);
        if (appId) {
          const state = this.unifiedManager.getAppState(appId);
          return this.convertToLegacyStatus(state);
        }
      }
      
      // Return status of first Expo app if no specific ID
      const apps = this.unifiedManager.getActiveApps();
      const expoApp = apps.find(app => app.type === 'expo');
      
      if (expoApp) {
        const state = this.unifiedManager.getAppState(expoApp.id);
        return this.convertToLegacyStatus(state);
      }
      
      return { isRunning: false };
      
    } catch (error) {
      logger.error('❌ Failed to get Expo preview status:', error);
      return {
        isRunning: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Legacy: Stop Expo preview
   */
  public async stopExpoPreview(legacyId?: string): Promise<void> {
    try {
      if (legacyId) {
        const appId = this.legacyAppMappings.get(legacyId);
        if (appId) {
          await this.unifiedManager.stopApp(appId);
          this.legacyAppMappings.delete(legacyId);
          return;
        }
      }
      
      // Stop all Expo apps if no specific ID
      const apps = this.unifiedManager.getActiveApps();
      const expoApps = apps.filter(app => app.type === 'expo');
      
      for (const app of expoApps) {
        await this.unifiedManager.stopApp(app.id);
      }
      
      // Clear legacy mappings for Expo apps
      for (const [legacyId, appId] of this.legacyAppMappings.entries()) {
        if (legacyId.startsWith('expo_')) {
          this.legacyAppMappings.delete(legacyId);
        }
      }
      
    } catch (error) {
      logger.error('❌ Failed to stop Expo preview:', error);
    }
  }

  /**
   * Legacy: List active Expo previews
   */
  public getActiveExpoPreviews(): Array<{
    id: string;
    projectPath: string;
    status: LegacyPreviewStatus;
  }> {
    try {
      const apps = this.unifiedManager.getActiveApps();
      const expoApps = apps.filter(app => app.type === 'expo');
      
      return expoApps.map(app => {
        const legacyId = this.findLegacyId(app.id) || `expo_${app.id}`;
        const state = this.unifiedManager.getAppState(app.id);
        
        return {
          id: legacyId,
          projectPath: app.projectPath,
          status: this.convertToLegacyStatus(state),
        };
      });
      
    } catch (error) {
      logger.error('❌ Failed to get active Expo previews:', error);
      return [];
    }
  }

  // ===========================================
  // LEGACY INTELLIGENT PREVIEW API
  // ===========================================

  /**
   * Legacy: Start intelligent preview preparation
   */
  public async startIntelligentPreviewPreparation(appType: AppType, projectPath: string): Promise<void> {
    try {
      logger.info(`🧠 Starting intelligent preview preparation: ${appType} at ${projectPath}`);
      
      // Pre-warm the app in the unified system
      await this.unifiedManager.preWarmApp({
        type: appType,
        projectPath,
      });
      
      // Emit legacy events
      this.emit('intelligent-preview:start-preparation', {
        appType,
        projectPath,
        phase: 'preparing',
        progress: 0,
        message: 'Preparing preview environment...',
      });
      
    } catch (error) {
      logger.error('❌ Failed to start intelligent preview preparation:', error);
      this.emit('intelligent-preview:error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Legacy: Complete intelligent preview (after LLM generation)
   */
  public async completeIntelligentPreview(appType: AppType, projectPath: string): Promise<void> {
    try {
      logger.info(`🧠 Completing intelligent preview: ${appType} at ${projectPath}`);
      
      // Start the app in the unified system
      const appId = await this.unifiedManager.startApp({
        type: appType,
        projectPath,
      });
      
      // Create legacy mapping
      const legacyId = `intelligent_${this.nextLegacyId++}`;
      this.legacyAppMappings.set(legacyId, appId);
      
      // Emit legacy events
      this.emit('intelligent-preview:llm-completed', {
        appType,
        projectPath,
        appId: legacyId,
        phase: 'building',
        progress: 50,
        message: 'Building application...',
      });
      
      // Wait for app to be ready
      const state = await this.waitForAppReady(appId, 60000);
      
      if (state?.phase === 'running') {
        this.emit('intelligent-preview:ready', {
          appType,
          projectPath,
          appId: legacyId,
          phase: 'ready',
          progress: 100,
          message: 'Preview ready!',
          url: state.connection?.webUrl,
        });
      }
      
    } catch (error) {
      logger.error('❌ Failed to complete intelligent preview:', error);
      this.emit('intelligent-preview:error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Legacy: Get intelligent preview state
   */
  public getIntelligentPreviewState(legacyId?: string): LegacyIntelligentPreviewState {
    try {
      if (legacyId) {
        const appId = this.legacyAppMappings.get(legacyId);
        if (appId) {
          const state = this.unifiedManager.getAppState(appId);
          return this.convertToLegacyIntelligentState(state);
        }
      }
      
      // Return state of first app if no specific ID
      const apps = this.unifiedManager.getActiveApps();
      if (apps.length > 0) {
        const state = this.unifiedManager.getAppState(apps[0].id);
        return this.convertToLegacyIntelligentState(state);
      }
      
      return {
        phase: 'idle',
        progress: 0,
        message: 'No active previews',
      };
      
    } catch (error) {
      logger.error('❌ Failed to get intelligent preview state:', error);
      return {
        phase: 'error',
        progress: 0,
        message: 'Error getting preview state',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Legacy: Stop intelligent preview
   */
  public async stopIntelligentPreview(legacyId?: string): Promise<void> {
    try {
      if (legacyId) {
        const appId = this.legacyAppMappings.get(legacyId);
        if (appId) {
          await this.unifiedManager.stopApp(appId);
          this.legacyAppMappings.delete(legacyId);
        }
      } else {
        // Stop all apps
        const apps = this.unifiedManager.getActiveApps();
        for (const app of apps) {
          await this.unifiedManager.stopApp(app.id);
        }
        this.legacyAppMappings.clear();
      }
      
      this.emit('intelligent-preview:stop', { legacyId });
      
    } catch (error) {
      logger.error('❌ Failed to stop intelligent preview:', error);
    }
  }

  // ===========================================
  // UTILITY METHODS
  // ===========================================

  /**
   * Get the unified manager instance (for direct access)
   */
  public getUnifiedManager(): UnifiedPreviewManager {
    return this.unifiedManager;
  }

  /**
   * Get legacy ID for a unified app ID
   */
  private findLegacyId(appId: number): string | undefined {
    for (const [legacyId, unifiedId] of this.legacyAppMappings.entries()) {
      if (unifiedId === appId) {
        return legacyId;
      }
    }
    return undefined;
  }

  /**
   * Convert unified preview state to legacy status
   */
  private convertToLegacyStatus(state: PreviewState | null): LegacyPreviewStatus {
    if (!state) {
      return { isRunning: false };
    }
    
    return {
      isRunning: state.phase === 'running',
      port: state.connection?.port,
      url: state.connection?.webUrl,
      qrCode: state.connection?.qrCode,
      error: state.error?.message,
      logs: state.logs?.slice(-10), // Last 10 log entries
    };
  }

  /**
   * Convert unified preview state to legacy intelligent state
   */
  private convertToLegacyIntelligentState(state: PreviewState | null): LegacyIntelligentPreviewState {
    if (!state) {
      return {
        phase: 'idle',
        progress: 0,
        message: 'No active preview',
      };
    }
    
    // Map unified phases to legacy phases
    const phaseMapping: Record<string, LegacyIntelligentPreviewState['phase']> = {
      'initializing': 'preparing',
      'starting': 'building',
      'running': 'ready',
      'error': 'error',
      'stopped': 'idle',
    };
    
    const progress = state.phase === 'running' ? 100 : 
                    state.phase === 'starting' ? 50 : 
                    state.phase === 'initializing' ? 25 : 0;
    
    return {
      phase: phaseMapping[state.phase] || 'idle',
      progress,
      message: state.error?.message || `Preview ${state.phase}`,
      appId: this.findLegacyId(state.appId),
      error: state.error?.message,
    };
  }

  /**
   * Wait for app to reach ready state
   */
  private async waitForAppReady(appId: number, timeoutMs: number): Promise<PreviewState | null> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve(null);
      }, timeoutMs);
      
      const checkState = () => {
        const state = this.unifiedManager.getAppState(appId);
        if (state?.phase === 'running') {
          clearTimeout(timeout);
          resolve(state);
        } else if (state?.phase === 'error') {
          clearTimeout(timeout);
          resolve(state);
        } else {
          setTimeout(checkState, 1000);
        }
      };
      
      checkState();
    });
  }

  /**
   * Setup event forwarding from unified manager to legacy events
   */
  private setupEventForwarding(): void {
    // Forward app events
    this.unifiedManager.on('app:started', (appId, appType) => {
      const legacyId = this.findLegacyId(appId);
      this.emit('preview:started', { appId: legacyId || appId, appType });
    });
    
    this.unifiedManager.on('app:ready', (appId, connection) => {
      const legacyId = this.findLegacyId(appId);
      this.emit('preview:ready', { appId: legacyId || appId, connection });
    });
    
    this.unifiedManager.on('app:stopped', (appId) => {
      const legacyId = this.findLegacyId(appId);
      this.emit('preview:stopped', { appId: legacyId || appId });
    });
    
    this.unifiedManager.on('app:error', (appId, error) => {
      const legacyId = this.findLegacyId(appId);
      this.emit('preview:error', { appId: legacyId || appId, error });
    });
    
    // Forward system events
    this.unifiedManager.on('system:resource-warning', (type, usage) => {
      this.emit('system:warning', { type, usage });
    });
    
    this.unifiedManager.on('system:performance-alert', (alert) => {
      this.emit('system:alert', alert);
    });
  }

  /**
   * Shutdown the migration adapter
   */
  public async shutdown(): Promise<void> {
    logger.info('🔄 Shutting down MigrationAdapter...');
    
    await this.unifiedManager.shutdown();
    this.legacyAppMappings.clear();
    
    logger.info('✅ MigrationAdapter shutdown complete');
  }
}

// Global singleton instance for backward compatibility
let globalMigrationAdapter: MigrationAdapter | null = null;

/**
 * Get or create the global migration adapter instance
 */
export function getMigrationAdapter(config?: Partial<PreviewManagerConfig>): MigrationAdapter {
  if (!globalMigrationAdapter) {
    globalMigrationAdapter = new MigrationAdapter(config);
  }
  return globalMigrationAdapter;
}

/**
 * Legacy API exports for backward compatibility
 */
export const LegacyPreviewAPI = {
  // Unified Expo Preview API
  startExpoPreview: (projectPath: string, options?: any) => 
    getMigrationAdapter().startExpoPreview(projectPath, options),
  
  getExpoPreviewStatus: (legacyId?: string) => 
    getMigrationAdapter().getExpoPreviewStatus(legacyId),
  
  stopExpoPreview: (legacyId?: string) => 
    getMigrationAdapter().stopExpoPreview(legacyId),
  
  getActiveExpoPreviews: () => 
    getMigrationAdapter().getActiveExpoPreviews(),
  
  // Intelligent Preview API
  startIntelligentPreviewPreparation: (appType: AppType, projectPath: string) => 
    getMigrationAdapter().startIntelligentPreviewPreparation(appType, projectPath),
  
  completeIntelligentPreview: (appType: AppType, projectPath: string) => 
    getMigrationAdapter().completeIntelligentPreview(appType, projectPath),
  
  getIntelligentPreviewState: (legacyId?: string) => 
    getMigrationAdapter().getIntelligentPreviewState(legacyId),
  
  stopIntelligentPreview: (legacyId?: string) => 
    getMigrationAdapter().stopIntelligentPreview(legacyId),
};