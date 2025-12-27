/**
 * 🧪 PREVIEW INTEGRATION - UNIT TESTS
 * 
 * Tests the integration between preview system and chat streams
 * Ensures proper triggering, timing, and coordination
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

// Mock dependencies
jest.mock('fs');
jest.mock('../ipc_client');

const mockFs = jest.mocked(fs);

describe('Preview Integration', () => {
  let PreviewIntegration: any;
  let detectAppType: any;
  let onChatStreamStart: any;
  let onLLMGenerationStart: any;
  let onLLMGenerationComplete: any;
  let mockIpcClient: any;

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock IpcClient
    mockIpcClient = {
      getInstance: jest.fn().mockReturnValue({
        ipcRenderer: {
          invoke: jest.fn().mockResolvedValue({ success: true })
        }
      })
    };

    jest.doMock('../ipc_client', () => ({
      IpcClient: mockIpcClient
    }));

    // Import after mocks are set up
    const module = await import('../utils/preview_integration');
    PreviewIntegration = module.PreviewIntegration;
    detectAppType = module.detectAppType;
    onChatStreamStart = module.onChatStreamStart;
    onLLMGenerationStart = module.onLLMGenerationStart;
    onLLMGenerationComplete = module.onLLMGenerationComplete;
  });

  describe('🔍 App Type Detection', () => {
    it('should detect Expo apps from app.json', () => {
      mockFs.existsSync.mockImplementation((filePath: string) => {
        return filePath.includes('app.json');
      });

      const result = detectAppType('/test/expo/app');

      expect(result.isExpo).toBe(true);
      expect(result.isWeb).toBe(false);
    });

    it('should detect Expo apps from expo.json', () => {
      mockFs.existsSync.mockImplementation((filePath: string) => {
        return filePath.includes('expo.json');
      });

      const result = detectAppType('/test/expo/app');

      expect(result.isExpo).toBe(true);
      expect(result.isWeb).toBe(false);
    });

    it('should detect Expo apps from package.json dependencies', () => {
      mockFs.existsSync.mockImplementation((filePath: string) => {
        return filePath.includes('package.json');
      });

      mockFs.readFileSync.mockReturnValue(JSON.stringify({
        dependencies: {
          'expo': '~54.0.0',
          'expo-router': '~4.0.0'
        }
      }));

      const result = detectAppType('/test/expo/app');

      expect(result.isExpo).toBe(true);
      expect(result.isWeb).toBe(false);
    });

    it('should detect web apps from package.json', () => {
      mockFs.existsSync.mockImplementation((filePath: string) => {
        return filePath.includes('package.json');
      });

      mockFs.readFileSync.mockReturnValue(JSON.stringify({
        dependencies: {
          'react': '18.0.0',
          'react-dom': '18.0.0',
          'vite': '4.0.0'
        }
      }));

      const result = detectAppType('/test/web/app');

      expect(result.isExpo).toBe(false);
      expect(result.isWeb).toBe(true);
    });

    it('should handle missing files gracefully', () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = detectAppType('/test/unknown/app');

      expect(result.isExpo).toBe(false);
      expect(result.isWeb).toBe(false);
    });

    it('should handle malformed package.json', () => {
      mockFs.existsSync.mockImplementation((filePath: string) => {
        return filePath.includes('package.json');
      });

      mockFs.readFileSync.mockReturnValue('invalid json');

      const result = detectAppType('/test/broken/app');

      expect(result.isExpo).toBe(false);
      expect(result.isWeb).toBe(false);
    });
  });

  describe('🎯 Preview Integration Class', () => {
    let integration: any;

    beforeEach(() => {
      integration = PreviewIntegration.getInstance();
    });

    it('should be a singleton', () => {
      const integration1 = PreviewIntegration.getInstance();
      const integration2 = PreviewIntegration.getInstance();

      expect(integration1).toBe(integration2);
    });

    it('should trigger preparation for Expo apps', async () => {
      const mockInvoke = jest.fn().mockResolvedValue({ success: true });
      mockIpcClient.getInstance.mockReturnValue({
        ipcRenderer: { invoke: mockInvoke }
      });

      await integration.triggerPreviewPreparation({
        appId: 1,
        appName: 'Test App',
        isExpoApp: true,
        chatPhase: 'generating'
      });

      expect(mockInvoke).toHaveBeenCalledWith('intelligent-preview:start-preparation', {
        appId: 1,
        isLLMGenerating: true
      });
    });

    it('should skip preparation for non-Expo apps', async () => {
      const mockInvoke = jest.fn();
      mockIpcClient.getInstance.mockReturnValue({
        ipcRenderer: { invoke: mockInvoke }
      });

      await integration.triggerPreviewPreparation({
        appId: 1,
        appName: 'Test App',
        isExpoApp: false,
        chatPhase: 'generating'
      });

      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it('should prevent duplicate preparations', async () => {
      const mockInvoke = jest.fn().mockResolvedValue({ success: true });
      mockIpcClient.getInstance.mockReturnValue({
        ipcRenderer: { invoke: mockInvoke }
      });

      // Trigger twice for same app
      await integration.triggerPreviewPreparation({
        appId: 1,
        appName: 'Test App',
        isExpoApp: true,
        chatPhase: 'generating'
      });

      await integration.triggerPreviewPreparation({
        appId: 1,
        appName: 'Test App',
        isExpoApp: true,
        chatPhase: 'generating'
      });

      // Should only be called once
      expect(mockInvoke).toHaveBeenCalledTimes(1);
    });

    it('should notify LLM completion', async () => {
      const mockInvoke = jest.fn().mockResolvedValue({ success: true });
      mockIpcClient.getInstance.mockReturnValue({
        ipcRenderer: { invoke: mockInvoke }
      });

      // First trigger preparation
      await integration.triggerPreviewPreparation({
        appId: 1,
        appName: 'Test App',
        isExpoApp: true,
        chatPhase: 'generating'
      });

      // Then notify completion
      await integration.notifyLLMCompletion(1);

      expect(mockInvoke).toHaveBeenCalledWith('intelligent-preview:llm-completed', {
        appId: 1
      });
    });

    it('should cleanup preparations', async () => {
      const mockInvoke = jest.fn().mockResolvedValue({ success: true });
      mockIpcClient.getInstance.mockReturnValue({
        ipcRenderer: { invoke: mockInvoke }
      });

      // Start preparation
      await integration.triggerPreviewPreparation({
        appId: 1,
        appName: 'Test App',
        isExpoApp: true,
        chatPhase: 'generating'
      });

      expect(integration.isPreparationActive(1)).toBe(true);

      // Cleanup
      await integration.cleanupPreparation(1);

      expect(integration.isPreparationActive(1)).toBe(false);
      expect(mockInvoke).toHaveBeenCalledWith('intelligent-preview:stop', { appId: 1 });
    });

    it('should track active preparations', async () => {
      const mockInvoke = jest.fn().mockResolvedValue({ success: true });
      mockIpcClient.getInstance.mockReturnValue({
        ipcRenderer: { invoke: mockInvoke }
      });

      // Start multiple preparations
      await integration.triggerPreviewPreparation({
        appId: 1,
        appName: 'App 1',
        isExpoApp: true,
        chatPhase: 'generating'
      });

      await integration.triggerPreviewPreparation({
        appId: 2,
        appName: 'App 2',
        isExpoApp: true,
        chatPhase: 'generating'
      });

      const activePreparations = integration.getActivePreparations();
      expect(activePreparations).toContain(1);
      expect(activePreparations).toContain(2);
      expect(activePreparations).toHaveLength(2);
    });
  });

  describe('🔗 Chat Stream Hooks', () => {
    beforeEach(() => {
      // Setup default Expo app detection
      mockFs.existsSync.mockImplementation((filePath: string) => {
        return filePath.includes('app.json');
      });
    });

    it('should trigger on chat stream start for Expo apps', async () => {
      const mockInvoke = jest.fn().mockResolvedValue({ success: true });
      mockIpcClient.getInstance.mockReturnValue({
        ipcRenderer: { invoke: mockInvoke }
      });

      await onChatStreamStart(1, '/test/expo/app', 'Test App');

      expect(mockInvoke).toHaveBeenCalledWith('intelligent-preview:start-preparation', {
        appId: 1,
        isLLMGenerating: false
      });
    });

    it('should trigger on LLM generation start', async () => {
      const mockInvoke = jest.fn().mockResolvedValue({ success: true });
      mockIpcClient.getInstance.mockReturnValue({
        ipcRenderer: { invoke: mockInvoke }
      });

      await onLLMGenerationStart(1, '/test/expo/app', 'Test App');

      expect(mockInvoke).toHaveBeenCalledWith('intelligent-preview:start-preparation', {
        appId: 1,
        isLLMGenerating: true
      });
    });

    it('should notify on LLM generation complete', async () => {
      const mockInvoke = jest.fn().mockResolvedValue({ success: true });
      mockIpcClient.getInstance.mockReturnValue({
        ipcRenderer: { invoke: mockInvoke }
      });

      // First start generation
      await onLLMGenerationStart(1, '/test/expo/app', 'Test App');

      // Then complete
      await onLLMGenerationComplete(1);

      expect(mockInvoke).toHaveBeenCalledWith('intelligent-preview:llm-completed', {
        appId: 1
      });
    });

    it('should skip non-Expo apps', async () => {
      // Setup web app detection
      mockFs.existsSync.mockImplementation((filePath: string) => {
        return filePath.includes('package.json');
      });

      mockFs.readFileSync.mockReturnValue(JSON.stringify({
        dependencies: {
          'react': '18.0.0',
          'react-dom': '18.0.0',
          'vite': '4.0.0'
        }
      }));

      const mockInvoke = jest.fn();
      mockIpcClient.getInstance.mockReturnValue({
        ipcRenderer: { invoke: mockInvoke }
      });

      await onChatStreamStart(1, '/test/web/app', 'Web App');

      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const mockInvoke = jest.fn().mockRejectedValue(new Error('IPC Error'));
      mockIpcClient.getInstance.mockReturnValue({
        ipcRenderer: { invoke: mockInvoke }
      });

      // Should not throw
      await expect(onChatStreamStart(1, '/test/expo/app', 'Test App')).resolves.toBeUndefined();
    });
  });

  describe('🔧 Error Scenarios', () => {
    it('should handle IPC failures during preparation', async () => {
      const integration = PreviewIntegration.getInstance();
      
      const mockInvoke = jest.fn().mockRejectedValue(new Error('IPC Failed'));
      mockIpcClient.getInstance.mockReturnValue({
        ipcRenderer: { invoke: mockInvoke }
      });

      await integration.triggerPreviewPreparation({
        appId: 1,
        appName: 'Test App',
        isExpoApp: true,
        chatPhase: 'generating'
      });

      // Should not be marked as active due to failure
      expect(integration.isPreparationActive(1)).toBe(false);
    });

    it('should handle IPC failures during completion', async () => {
      const integration = PreviewIntegration.getInstance();
      
      let callCount = 0;
      const mockInvoke = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({ success: true }); // Preparation succeeds
        } else {
          return Promise.reject(new Error('Completion failed')); // Completion fails
        }
      });

      mockIpcClient.getInstance.mockReturnValue({
        ipcRenderer: { invoke: mockInvoke }
      });

      // Start preparation
      await integration.triggerPreviewPreparation({
        appId: 1,
        appName: 'Test App',
        isExpoApp: true,
        chatPhase: 'generating'
      });

      // Completion should not throw
      await expect(integration.notifyLLMCompletion(1)).resolves.toBeUndefined();
    });

    it('should handle cleanup failures gracefully', async () => {
      const integration = PreviewIntegration.getInstance();
      
      const mockInvoke = jest.fn()
        .mockResolvedValueOnce({ success: true }) // Preparation succeeds
        .mockRejectedValueOnce(new Error('Cleanup failed')); // Cleanup fails

      mockIpcClient.getInstance.mockReturnValue({
        ipcRenderer: { invoke: mockInvoke }
      });

      // Start preparation
      await integration.triggerPreviewPreparation({
        appId: 1,
        appName: 'Test App',
        isExpoApp: true,
        chatPhase: 'generating'
      });

      // Cleanup should not throw
      await expect(integration.cleanupPreparation(1)).resolves.toBeUndefined();
    });
  });

  describe('⚡ Performance', () => {
    it('should handle multiple rapid triggers efficiently', async () => {
      const integration = PreviewIntegration.getInstance();
      
      const mockInvoke = jest.fn().mockResolvedValue({ success: true });
      mockIpcClient.getInstance.mockReturnValue({
        ipcRenderer: { invoke: mockInvoke }
      });

      // Trigger multiple times rapidly
      const promises = Array.from({ length: 10 }, (_, i) =>
        integration.triggerPreviewPreparation({
          appId: 1,
          appName: 'Test App',
          isExpoApp: true,
          chatPhase: 'generating'
        })
      );

      await Promise.all(promises);

      // Should only call IPC once due to deduplication
      expect(mockInvoke).toHaveBeenCalledTimes(1);
    });

    it('should handle concurrent preparations for different apps', async () => {
      const integration = PreviewIntegration.getInstance();
      
      const mockInvoke = jest.fn().mockResolvedValue({ success: true });
      mockIpcClient.getInstance.mockReturnValue({
        ipcRenderer: { invoke: mockInvoke }
      });

      // Start preparations for different apps concurrently
      const promises = Array.from({ length: 5 }, (_, i) =>
        integration.triggerPreviewPreparation({
          appId: i + 1,
          appName: `Test App ${i + 1}`,
          isExpoApp: true,
          chatPhase: 'generating'
        })
      );

      await Promise.all(promises);

      // Should call IPC for each app
      expect(mockInvoke).toHaveBeenCalledTimes(5);
      expect(integration.getActivePreparations()).toHaveLength(5);
    });
  });
});
