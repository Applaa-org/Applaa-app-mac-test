/**
 * 🔗 PREVIEW INTEGRATION UTILITIES
 * 
 * Integrates the intelligent preview system with the LLM chat stream
 * Automatically triggers preview preparation at optimal times
 */

import log from 'electron-log';
import { IpcClient } from '../ipc_client';

const logger = log.scope('preview-integration');

interface PreviewTriggerOptions {
  appId: number;
  appName: string;
  isExpoApp: boolean;
  chatPhase: 'starting' | 'generating' | 'completing' | 'completed';
}

/**
 * 🎯 SMART PREVIEW TRIGGER
 * 
 * Intelligently determines when to start preview preparation based on:
 * 1. LLM generation phase
 * 2. App type (Expo vs Web)
 * 3. User interaction patterns
 */
export class PreviewIntegration {
  private static instance: PreviewIntegration;
  private activePreparations = new Set<number>();
  
  static getInstance(): PreviewIntegration {
    if (!PreviewIntegration.instance) {
      PreviewIntegration.instance = new PreviewIntegration();
    }
    return PreviewIntegration.instance;
  }

  /**
   * 🚀 TRIGGER PREVIEW PREPARATION
   * Called when LLM starts generating code for an Expo app
   */
  async triggerPreviewPreparation(options: PreviewTriggerOptions): Promise<void> {
    const { appId, appName, isExpoApp, chatPhase } = options;
    
    try {
      // Only prepare for Expo apps
      if (!isExpoApp) {
        logger.info(`Skipping preview preparation for non-Expo app ${appId}`);
        return;
      }

      // Avoid duplicate preparations
      if (this.activePreparations.has(appId)) {
        logger.info(`Preview preparation already active for app ${appId}`);
        return;
      }

      logger.info(`🚀 Triggering preview preparation for ${appName} (${appId}) - phase: ${chatPhase}`);
      
      // Mark as active
      this.activePreparations.add(appId);
      
      // Determine if LLM is currently generating
      const isLLMGenerating = chatPhase === 'generating';
      
      // Start intelligent preparation
      const ipcClient = IpcClient.getInstance();
      const result = await ipcClient.ipcRenderer.invoke('intelligent-preview:start-preparation', {
        appId,
        isLLMGenerating
      });
      
      if (result.success) {
        logger.info(`✅ Preview preparation started for app ${appId}`);
      } else {
        logger.error(`❌ Failed to start preview preparation for app ${appId}:`, result.error);
        this.activePreparations.delete(appId);
      }
      
    } catch (error) {
      logger.error(`❌ Preview preparation trigger failed for app ${appId}:`, error);
      this.activePreparations.delete(appId);
    }
  }

  /**
   * 🎯 NOTIFY LLM COMPLETION
   * Called when LLM finishes generating code
   */
  async notifyLLMCompletion(appId: number): Promise<void> {
    try {
      if (!this.activePreparations.has(appId)) {
        logger.info(`No active preparation for app ${appId}, skipping completion notification`);
        return;
      }

      logger.info(`🎯 Notifying LLM completion for app ${appId}`);
      
      const ipcClient = IpcClient.getInstance();
      const result = await ipcClient.ipcRenderer.invoke('intelligent-preview:llm-completed', {
        appId
      });
      
      if (result.success) {
        logger.info(`✅ LLM completion notified for app ${appId}`);
      } else {
        logger.error(`❌ Failed to notify LLM completion for app ${appId}:`, result.error);
      }
      
    } catch (error) {
      logger.error(`❌ LLM completion notification failed for app ${appId}:`, error);
    }
  }

  /**
   * 🛑 CLEANUP PREPARATION
   * Called when preparation is no longer needed
   */
  async cleanupPreparation(appId: number): Promise<void> {
    try {
      logger.info(`🛑 Cleaning up preparation for app ${appId}`);
      
      this.activePreparations.delete(appId);
      
      const ipcClient = IpcClient.getInstance();
      await ipcClient.ipcRenderer.invoke('intelligent-preview:stop', { appId });
      
      logger.info(`✅ Preparation cleaned up for app ${appId}`);
      
    } catch (error) {
      logger.error(`❌ Preparation cleanup failed for app ${appId}:`, error);
    }
  }

  /**
   * 📊 GET PREPARATION STATUS
   */
  isPreparationActive(appId: number): boolean {
    return this.activePreparations.has(appId);
  }

  /**
   * 📋 GET ACTIVE PREPARATIONS
   */
  getActivePreparations(): number[] {
    return Array.from(this.activePreparations);
  }
}

/**
 * 🔍 DETECT APP TYPE
 * Determines if an app is an Expo app based on various indicators
 */
export function detectAppType(appPath: string): { isExpo: boolean; isWeb: boolean } {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fs = require('fs');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const path = require('path');
  
  try {
    // Check for Expo-specific files
    const appJsonPath = path.join(appPath, 'app.json');
    const expoJsonPath = path.join(appPath, 'expo.json');
    const packageJsonPath = path.join(appPath, 'package.json');
    
    // Check app.json/expo.json
    if (fs.existsSync(appJsonPath) || fs.existsSync(expoJsonPath)) {
      return { isExpo: true, isWeb: false };
    }
    
    // Check package.json for Expo dependencies
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      if (deps.expo || deps['expo-router'] || deps['@expo/vector-icons']) {
        return { isExpo: true, isWeb: false };
      }
      
      if (deps.react && deps['react-dom'] && (deps.vite || deps.next)) {
        return { isExpo: false, isWeb: true };
      }
    }
    
    return { isExpo: false, isWeb: false };
    
  } catch (error) {
    logger.error('Failed to detect app type:', error);
    return { isExpo: false, isWeb: false };
  }
}

/**
 * 🎯 CHAT STREAM INTEGRATION HOOKS
 * These functions should be called from the chat stream handlers
 */

/**
 * Hook: Called when chat stream starts for an app
 */
export async function onChatStreamStart(appId: number, appPath: string, appName: string): Promise<void> {
  const { isExpo } = detectAppType(appPath);
  
  if (isExpo) {
    const integration = PreviewIntegration.getInstance();
    await integration.triggerPreviewPreparation({
      appId,
      appName,
      isExpoApp: isExpo,
      chatPhase: 'starting'
    });
  }
}

/**
 * Hook: Called when LLM starts generating code
 */
export async function onLLMGenerationStart(appId: number, appPath: string, appName: string): Promise<void> {
  const { isExpo } = detectAppType(appPath);
  
  if (isExpo) {
    const integration = PreviewIntegration.getInstance();
    await integration.triggerPreviewPreparation({
      appId,
      appName,
      isExpoApp: isExpo,
      chatPhase: 'generating'
    });
  }
}

/**
 * Hook: Called when LLM completes code generation
 */
export async function onLLMGenerationComplete(appId: number): Promise<void> {
  const integration = PreviewIntegration.getInstance();
  
  if (integration.isPreparationActive(appId)) {
    await integration.notifyLLMCompletion(appId);
  }
}

/**
 * Hook: Called when chat session ends
 */
export async function onChatStreamEnd(appId: number): Promise<void> {
  const integration = PreviewIntegration.getInstance();
  
  // Don't cleanup immediately - user might want to preview
  // Cleanup will happen when user navigates away or after timeout
  setTimeout(async () => {
    if (integration.isPreparationActive(appId)) {
      await integration.cleanupPreparation(appId);
    }
  }, 300000); // 5 minute cleanup delay
}

/**
 * 🔧 UTILITY: Check if preview is ready
 */
export async function isPreviewReady(appId: number): Promise<boolean> {
  try {
    const ipcClient = IpcClient.getInstance();
    const result = await ipcClient.ipcRenderer.invoke('intelligent-preview:get-state', { appId });
    
    return result.success && result.state?.phase === 'ready';
  } catch (error) {
    logger.error('Failed to check preview readiness:', error);
    return false;
  }
}
