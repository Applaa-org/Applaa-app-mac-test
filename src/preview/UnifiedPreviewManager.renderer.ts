/**
 * 🚀 UNIFIED PREVIEW MANAGER (RENDERER VERSION)
 *
 * Browser-compatible version of UnifiedPreviewManager for renderer processes.
 * Uses IPC communication instead of direct Node.js modules.
 */

import { EventEmitter } from 'events';
import { IpcClient } from '../ipc/ipc_client';
import {
  PreviewState,
  PreviewManagerConfig,
  PreviewEvent,
  PreviewEventCallback,
  PreviewStateCallback,
  PreviewErrorCallback,
  PreviewPhase,
  PreviewConnection,
  PreviewError,
  ResourceExhaustionError,
  PortAllocationError,
  DEFAULT_PREVIEW_CONFIG,
  APP_TYPE_CONFIGS,
  StartPreviewRequest,
  StartPreviewResponse,
  StopPreviewRequest,
  StopPreviewResponse,
  GetPreviewStateResponse,
  ListActivePreviewsResponse,
} from './types';
import { AppType, AppState, AppPriority } from './types-simple';

/**
 * UnifiedPreviewManagerRenderer - Browser-compatible version
 * 
 * Provides the same API as UnifiedPreviewManager but uses IPC communication
 * for browser/renderer process compatibility.
 */
export class UnifiedPreviewManagerRenderer extends EventEmitter {
  private static instance: UnifiedPreviewManagerRenderer | null = null;

  private config: PreviewManagerConfig;
  private ipcClient: IpcClient;
  private activeStates = new Map<number, PreviewState>();
  private suspendedStates = new Map<number, PreviewState>();
  private isInitialized = false;

  private constructor(config: Partial<PreviewManagerConfig> = {}) {
    super();
    this.config = { ...DEFAULT_PREVIEW_CONFIG, ...config };
    this.ipcClient = IpcClient.getInstance();
    
    console.log('🚀 UnifiedPreviewManagerRenderer initialized');
  }

  /**
   * Get singleton instance
   */
  public static getInstance(config?: Partial<PreviewManagerConfig>): UnifiedPreviewManagerRenderer {
    if (!UnifiedPreviewManagerRenderer.instance) {
      UnifiedPreviewManagerRenderer.instance = new UnifiedPreviewManagerRenderer(config);
    }
    return UnifiedPreviewManagerRenderer.instance;
  }

  /**
   * Initialize the preview manager
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      console.log('🔧 Initializing UnifiedPreviewManagerRenderer...');

      // Initialize via IPC
      await this.ipcClient.unifiedPreviewInitialize();

      this.isInitialized = true;
      console.log('✅ UnifiedPreviewManagerRenderer initialized successfully');

      this.emit('manager:initialized');
    } catch (error) {
      console.error('❌ Failed to initialize UnifiedPreviewManagerRenderer:', error);
      throw error;
    }
  }

  /**
   * Start preview for an app
   */
  public async startPreview(request: StartPreviewRequest): Promise<StartPreviewResponse> {
    try {
      console.log(`🚀 Starting preview for app ${request.appId} (type: ${request.appType})`);

      // Delegate to main process via IPC
      const response = await this.ipcClient.unifiedPreviewStart(request);
      
      if (response.success && response.state) {
        this.activeStates.set(request.appId, response.state);
        this.emitPreviewEvent('preview:start', request.appId, { appType: request.appType });
      }

      return response;
    } catch (error) {
      console.error(`❌ Failed to start preview for app ${request.appId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Stop preview for an app
   */
  public async stopPreview(request: StopPreviewRequest): Promise<StopPreviewResponse> {
    try {
      console.log(`🛑 Stopping preview for app ${request.appId}`);

      // Delegate to main process via IPC
      const response = await this.ipcClient.unifiedPreviewStop(request);
      
      if (response.success) {
        this.activeStates.delete(request.appId);
        this.suspendedStates.delete(request.appId);
        this.emitPreviewEvent('preview:stop', request.appId);
      }

      return response;
    } catch (error) {
      console.error(`❌ Failed to stop preview for app ${request.appId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Suspend preview for an app
   */
  public async suspendPreview(appId: number): Promise<StopPreviewResponse> {
    try {
      console.log(`😴 Suspending preview for app ${appId}`);

      // Delegate to main process via IPC
      const response = await this.ipcClient.unifiedPreviewSuspend(appId);
      
      if (response.success) {
        const state = this.activeStates.get(appId);
        if (state) {
          state.phase = 'suspended';
          this.suspendedStates.set(appId, state);
          this.activeStates.delete(appId);
        }
        this.emitPreviewEvent('preview:suspend', appId);
      }

      return response;
    } catch (error) {
      console.error(`❌ Failed to suspend preview for app ${appId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Resume preview for an app
   */
  public async resumePreview(appId: number): Promise<StartPreviewResponse> {
    try {
      console.log(`🔄 Resuming preview for app ${appId}`);

      // Delegate to main process via IPC
      const response = await this.ipcClient.unifiedPreviewResume(appId);
      
      if (response.success && response.state) {
        this.activeStates.set(appId, response.state);
        this.suspendedStates.delete(appId);
        this.emitPreviewEvent('preview:resume', appId);
      }

      return response;
    } catch (error) {
      console.error(`❌ Failed to resume preview for app ${appId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get current preview state
   */
  public getPreviewState(appId: number): GetPreviewStateResponse {
    const state = this.activeStates.get(appId) || this.suspendedStates.get(appId);

    if (!state) {
      return { success: false, error: 'Preview not found' };
    }

    return { success: true, state };
  }

  /**
   * List all active previews
   */
  public async listActivePreviews(): Promise<ListActivePreviewsResponse> {
    try {
      // Get from main process via IPC
      const response = await this.ipcClient.unifiedPreviewListActive();
      
      if (response.success) {
        // Update local state
        this.activeStates.clear();
        this.suspendedStates.clear();
        
        for (const preview of response.previews) {
          if (preview.phase === 'suspended') {
            this.suspendedStates.set(preview.appId, preview);
          } else {
            this.activeStates.set(preview.appId, preview);
          }
        }
      }

      return response;
    } catch (error) {
      console.error('❌ Failed to list active previews:', error);
      return { success: false, error: error.message, previews: [], systemMetrics: null };
    }
  }

  /**
   * Get system metrics
   */
  public async getSystemMetrics(): Promise<any> {
    try {
      return await this.ipcClient.unifiedPreviewGetMetrics();
    } catch (error) {
      console.error('❌ Failed to get system metrics:', error);
      return null;
    }
  }

  /**
   * Get system status
   */
  public async getSystemStatus(): Promise<any> {
    try {
      return await this.ipcClient.unifiedPreviewGetStatus();
    } catch (error) {
      console.error('❌ Failed to get system status:', error);
      return null;
    }
  }

  /**
   * Update preview state (called by IPC events)
   */
  public updatePreviewState(appId: number, updates: Partial<PreviewState>): void {
    const state = this.activeStates.get(appId) || this.suspendedStates.get(appId);
    if (!state) {
      console.warn(`⚠️ Attempted to update non-existent preview state for app ${appId}`);
      return;
    }

    // Apply updates
    Object.assign(state, updates);

    // Emit state change event
    this.emit('state:changed', appId, state);

    // Emit specific phase events
    if (updates.phase) {
      this.emitPreviewEvent(`preview:${updates.phase}` as any, appId, { phase: updates.phase });
    }
  }

  /**
   * Emit a preview event
   */
  private emitPreviewEvent(type: PreviewEvent['type'], appId: number, data?: any): void {
    const event: PreviewEvent = {
      type,
      appId,
      timestamp: Date.now(),
      data,
    };

    this.emit('preview:event', event);
    this.emit(type, appId, data);
  }

  /**
   * Register event callbacks
   */
  public onPreviewEvent(callback: PreviewEventCallback): void {
    this.on('preview:event', callback);
  }

  public onStateChange(callback: PreviewStateCallback): void {
    this.on('state:changed', callback);
  }

  public onError(callback: PreviewErrorCallback): void {
    this.on('preview:error', callback);
  }

  /**
   * Cleanup and shutdown
   */
  public async cleanup(): Promise<void> {
    console.log('🔄 Cleaning up UnifiedPreviewManagerRenderer...');

    try {
      // Shutdown via IPC
      await this.ipcClient.unifiedPreviewShutdown();
      
      // Clear local state
      this.activeStates.clear();
      this.suspendedStates.clear();
      this.removeAllListeners();
      
      this.isInitialized = false;
      console.log('✅ UnifiedPreviewManagerRenderer cleanup complete');
    } catch (error) {
      console.error('❌ Failed to cleanup UnifiedPreviewManagerRenderer:', error);
    }
  }

  /**
   * Get active apps (for compatibility)
   */
  public getActiveApps(): Array<{ id: number; type: AppType; projectPath: string }> {
    return Array.from(this.activeStates.values()).map(state => ({
      id: state.appId,
      type: state.appType,
      projectPath: `apps/${state.appId}`
    }));
  }

  /**
   * Get app state (for compatibility)
   */
  public getAppState(appId: number): PreviewState | null {
    return this.activeStates.get(appId) || this.suspendedStates.get(appId) || null;
  }
}

// Export singleton instance
export const unifiedPreviewManagerRenderer = UnifiedPreviewManagerRenderer.getInstance();

/**
 * Factory function to create a new UnifiedPreviewManagerRenderer instance
 */
export function createUnifiedPreviewManagerRenderer(config?: Partial<PreviewManagerConfig>): UnifiedPreviewManagerRenderer {
  return UnifiedPreviewManagerRenderer.getInstance(config);
}

// Alias for compatibility
export const createUnifiedPreviewManager = createUnifiedPreviewManagerRenderer;

export default UnifiedPreviewManagerRenderer;