/**
 * 🔄 MIGRATION ADAPTER (RENDERER VERSION)
 * 
 * Renderer-compatible version of MigrationAdapter for browser/renderer processes.
 * Uses IPC communication instead of direct Node.js modules.
 */

import { EventEmitter } from 'events';
import { UnifiedPreviewManagerRenderer } from './UnifiedPreviewManager.renderer';
import { PreviewState, PreviewManagerConfig } from './types';
import { AppType } from './types-simple';

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
 * MigrationAdapterRenderer - Renderer-compatible version for browser/renderer processes
 * 
 * This adapter provides the same API as MigrationAdapter but uses IPC communication
 * instead of direct Node.js modules for browser compatibility.
 */
export class MigrationAdapterRenderer extends EventEmitter {
  private unifiedManager: UnifiedPreviewManagerRenderer;
  private legacyAppMappings = new Map<string, number>(); // Legacy ID -> Unified ID
  private nextLegacyId = 1;
  private isInitialized = false;

  constructor(config?: Partial<PreviewManagerConfig>) {
    super();
    this.unifiedManager = UnifiedPreviewManagerRenderer.getInstance(config);
    
    // Forward events from unified manager
    this.setupEventForwarding();
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
    } catch (error) {
      console.error('Failed to initialize MigrationAdapterRenderer:', error);
      throw error;
    }
  }

  /**
   * Get the unified manager instance
   */
  public getUnifiedManager(): UnifiedPreviewManagerRenderer {
    return this.unifiedManager;
  }

  /**
   * Start an app (alias for startExpoPreview)
   */
  public async startApp(appId: number, options?: any): Promise<LegacyPreviewStatus> {
    // This is a simplified version that assumes we're starting an Expo app
    // In a real implementation, you'd need to determine the app type and call the appropriate method
    return this.startExpoPreview(`apps/${appId}`, options);
  }

  /**
   * Legacy: Start Expo preview (unified_expo_preview.ts compatibility)
   */
  public async startExpoPreview(projectPath: string, options?: {
    tunnel?: boolean;
    lan?: boolean;
    port?: number;
  }): Promise<LegacyPreviewStatus> {
    try {
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
      console.error('Failed to start Expo preview:', error);
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
      console.error('Failed to get Expo preview status:', error);
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
      console.error('Failed to stop Expo preview:', error);
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
      console.error('Failed to get active Expo previews:', error);
      return [];
    }
  }

  // ===========================================
  // HELPER METHODS
  // ===========================================

  private setupEventForwarding(): void {
    // Forward events from unified manager to legacy listeners
    this.unifiedManager.on('app-started', (data) => {
      this.emit('preview-started', data);
      this.emit('expo-started', data);
    });

    this.unifiedManager.on('app-stopped', (data) => {
      this.emit('preview-stopped', data);
      this.emit('expo-stopped', data);
    });

    this.unifiedManager.on('app-error', (data) => {
      this.emit('preview-error', data);
      this.emit('expo-error', data);
    });

    this.unifiedManager.on('app-ready', (data) => {
      this.emit('preview-ready', data);
      this.emit('expo-ready', data);
    });
  }

  private async waitForAppReady(appId: number, timeout: number): Promise<PreviewState> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Timeout waiting for app to be ready'));
      }, timeout);

      const checkState = () => {
        const state = this.unifiedManager.getAppState(appId);
        if (state?.status === 'running') {
          clearTimeout(timeoutId);
          resolve(state);
        } else if (state?.status === 'error') {
          clearTimeout(timeoutId);
          reject(new Error(state.error || 'App failed to start'));
        } else {
          setTimeout(checkState, 500);
        }
      };

      checkState();
    });
  }

  private convertToLegacyStatus(state: PreviewState | null): LegacyPreviewStatus {
    if (!state) {
      return { isRunning: false };
    }

    return {
      isRunning: state.status === 'running',
      port: state.port,
      url: state.url,
      qrCode: state.qrCode,
      error: state.error,
      logs: state.logs,
    };
  }

  private findLegacyId(appId: number): string | undefined {
    for (const [legacyId, id] of this.legacyAppMappings.entries()) {
      if (id === appId) {
        return legacyId;
      }
    }
    return undefined;
  }

  /**
   * Cleanup resources
   */
  public async cleanup(): Promise<void> {
    try {
      await this.unifiedManager.cleanup();
      this.legacyAppMappings.clear();
      this.removeAllListeners();
    } catch (error) {
      console.error('Failed to cleanup MigrationAdapterRenderer:', error);
    }
  }
}

// Singleton instance
let migrationAdapterInstance: MigrationAdapterRenderer | null = null;

/**
 * Get the singleton MigrationAdapter instance (renderer version)
 */
export function getMigrationAdapter(config?: Partial<PreviewManagerConfig>): MigrationAdapterRenderer {
  if (!migrationAdapterInstance) {
    migrationAdapterInstance = new MigrationAdapterRenderer(config);
  }
  return migrationAdapterInstance;
}

/**
 * Factory function to create a new MigrationAdapter instance (renderer version)
 */
export function createMigrationAdapter(config?: Partial<PreviewManagerConfig>): MigrationAdapterRenderer {
  return new MigrationAdapterRenderer(config);
}