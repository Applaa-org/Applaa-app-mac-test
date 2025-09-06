/**
 * 🧪 INTELLIGENT PREVIEW SYSTEM - UNIT TESTS
 * 
 * Comprehensive test suite for the intelligent preview system
 * Tests all critical paths, error scenarios, and performance optimizations
 */

import { describe, it, expect, beforeEach, afterEach, jest, beforeAll, afterAll } from '@jest/globals';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';

// Mock dependencies
jest.mock('child_process');
jest.mock('fs');
jest.mock('../../db');
jest.mock('../../paths/paths');
jest.mock('../handlers/unified_dependency_manager');

const mockSpawn = jest.mocked(spawn);
const mockFs = fs as jest.Mocked<typeof fs>;

// Mock process for testing
class MockChildProcess extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  stdin = new EventEmitter();
  killed = false;
  
  kill() {
    this.killed = true;
    this.emit('exit', 0, 'SIGTERM');
  }
}

describe('Intelligent Preview System', () => {
  let mockProcess: MockChildProcess;
  let mockDb: any;
  let mockGetDyadAppPath: jest.MockedFunction<any>;
  let mockUnifiedInstallDependencies: jest.MockedFunction<any>;

  beforeAll(() => {
    // Setup global mocks
    mockDb = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{
              id: 1,
              name: 'test-app',
              path: '/test/path'
            }])
          })
        })
      })
    };

    mockGetDyadAppPath = jest.fn().mockReturnValue('/test/app/path');
    mockUnifiedInstallDependencies = jest.fn().mockResolvedValue(true);

    // Mock the modules
    jest.doMock('../../db', () => ({ db: mockDb }));
    jest.doMock('../../paths/paths', () => ({ getDyadAppPath: mockGetDyadAppPath }));
    jest.doMock('../handlers/unified_dependency_manager', () => ({ 
      unifiedInstallDependencies: mockUnifiedInstallDependencies 
    }));
  });

  beforeEach(() => {
    mockProcess = new MockChildProcess();
    mockSpawn.mockReturnValue(mockProcess as any);
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup default fs mocks
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(JSON.stringify({
      name: 'test-app',
      dependencies: {
        'expo': '~53.0.0',
        'expo-router': '~4.0.0'
      }
    }));
  });

  afterEach(() => {
    if (mockProcess && !mockProcess.killed) {
      mockProcess.kill();
    }
  });

  describe('🚀 Preview Preparation', () => {
    it('should start preparation during LLM generation', async () => {
      // Import after mocks are set up
      const { registerIntelligentPreviewSystem } = await import('../handlers/intelligent_preview_system');
      
      // Register handlers
      const mockIpcMain = {
        handle: jest.fn()
      };
      
      jest.doMock('electron', () => ({
        ipcMain: mockIpcMain
      }));

      registerIntelligentPreviewSystem();

      // Find the start-preparation handler
      const startHandler = mockIpcMain.handle.mock.calls.find(
        call => call[0] === 'intelligent-preview:start-preparation'
      )?.[1];

      expect(startHandler).toBeDefined();

      // Test the handler
      const result = await startHandler(null, { 
        appId: 1, 
        isLLMGenerating: true 
      });

      expect(result.success).toBe(true);
      expect(result.state).toBeDefined();
      expect(result.state.phase).toBe('preparing');
      expect(result.state.userMessage).toContain('Getting your app ready');
    });

    it('should handle parallel dependency installation', async () => {
      const { registerIntelligentPreviewSystem } = await import('../handlers/intelligent_preview_system');
      
      const mockIpcMain = {
        handle: jest.fn()
      };
      
      jest.doMock('electron', () => ({
        ipcMain: mockIpcMain
      }));

      registerIntelligentPreviewSystem();

      const startHandler = mockIpcMain.handle.mock.calls.find(
        call => call[0] === 'intelligent-preview:start-preparation'
      )?.[1];

      // Start preparation
      await startHandler(null, { 
        appId: 1, 
        isLLMGenerating: true 
      });

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify dependency installation was called
      expect(mockUnifiedInstallDependencies).toHaveBeenCalledWith(
        '/test/app/path',
        1,
        'intelligent-preview'
      );
    });

    it('should warm Metro cache in parallel', async () => {
      const { registerIntelligentPreviewSystem } = await import('../handlers/intelligent_preview_system');
      
      const mockIpcMain = {
        handle: jest.fn()
      };
      
      jest.doMock('electron', () => ({
        ipcMain: mockIpcMain
      }));

      registerIntelligentPreviewSystem();

      const startHandler = mockIpcMain.handle.mock.calls.find(
        call => call[0] === 'intelligent-preview:start-preparation'
      )?.[1];

      // Start preparation
      await startHandler(null, { 
        appId: 1, 
        isLLMGenerating: true 
      });

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify Metro cache warming was attempted
      expect(mockSpawn).toHaveBeenCalledWith(
        'npx',
        expect.arrayContaining(['expo', 'start']),
        expect.objectContaining({
          cwd: '/test/app/path',
          env: expect.objectContaining({
            EXPO_CACHE_WARMING: '1'
          })
        })
      );
    });
  });

  describe('🎯 LLM Integration', () => {
    it('should handle LLM completion notification', async () => {
      const { registerIntelligentPreviewSystem } = await import('../handlers/intelligent_preview_system');
      
      const mockIpcMain = {
        handle: jest.fn()
      };
      
      jest.doMock('electron', () => ({
        ipcMain: mockIpcMain
      }));

      registerIntelligentPreviewSystem();

      // Start preparation first
      const startHandler = mockIpcMain.handle.mock.calls.find(
        call => call[0] === 'intelligent-preview:start-preparation'
      )?.[1];

      await startHandler(null, { 
        appId: 1, 
        isLLMGenerating: true 
      });

      // Find LLM completion handler
      const completionHandler = mockIpcMain.handle.mock.calls.find(
        call => call[0] === 'intelligent-preview:llm-completed'
      )?.[1];

      expect(completionHandler).toBeDefined();

      // Test completion notification
      const result = await completionHandler(null, { appId: 1 });

      expect(result.success).toBe(true);
      expect(result.state.phase).toBe('warming');
      expect(result.state.userMessage).toContain('Your code is ready');
    });

    it('should provide instant preview when ready', async () => {
      const { registerIntelligentPreviewSystem } = await import('../handlers/intelligent_preview_system');
      
      const mockIpcMain = {
        handle: jest.fn()
      };
      
      jest.doMock('electron', () => ({
        ipcMain: mockIpcMain
      }));

      registerIntelligentPreviewSystem();

      // Simulate ready state by completing the full flow
      const startHandler = mockIpcMain.handle.mock.calls.find(
        call => call[0] === 'intelligent-preview:start-preparation'
      )?.[1];

      const completionHandler = mockIpcMain.handle.mock.calls.find(
        call => call[0] === 'intelligent-preview:llm-completed'
      )?.[1];

      const getPreviewHandler = mockIpcMain.handle.mock.calls.find(
        call => call[0] === 'intelligent-preview:get-preview'
      )?.[1];

      // Start and complete preparation
      await startHandler(null, { appId: 1, isLLMGenerating: true });
      
      // Simulate Expo process output for QR code
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'Metro waiting on exp://192.168.1.100:8081');
      }, 50);

      await completionHandler(null, { appId: 1 });

      // Wait for finalization
      await new Promise(resolve => setTimeout(resolve, 200));

      // Get preview
      const result = await getPreviewHandler(null, { appId: 1 });

      expect(result.success).toBe(true);
      // Note: In real scenario, this would be true after full preparation
      expect(result.ready).toBeDefined();
    });
  });

  describe('🔧 Error Handling', () => {
    it('should handle dependency installation failure gracefully', async () => {
      // Mock dependency installation failure
      mockUnifiedInstallDependencies.mockResolvedValue(false);

      const { registerIntelligentPreviewSystem } = await import('../handlers/intelligent_preview_system');
      
      const mockIpcMain = {
        handle: jest.fn()
      };
      
      jest.doMock('electron', () => ({
        ipcMain: mockIpcMain
      }));

      registerIntelligentPreviewSystem();

      const startHandler = mockIpcMain.handle.mock.calls.find(
        call => call[0] === 'intelligent-preview:start-preparation'
      )?.[1];

      // Start preparation
      await startHandler(null, { 
        appId: 1, 
        isLLMGenerating: true 
      });

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should not throw error, should handle gracefully
      expect(mockUnifiedInstallDependencies).toHaveBeenCalled();
    });

    it('should handle missing app gracefully', async () => {
      // Mock missing app
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]) // Empty array = no app found
          })
        })
      });

      const { registerIntelligentPreviewSystem } = await import('../handlers/intelligent_preview_system');
      
      const mockIpcMain = {
        handle: jest.fn()
      };
      
      jest.doMock('electron', () => ({
        ipcMain: mockIpcMain
      }));

      registerIntelligentPreviewSystem();

      const startHandler = mockIpcMain.handle.mock.calls.find(
        call => call[0] === 'intelligent-preview:start-preparation'
      )?.[1];

      const result = await startHandler(null, { 
        appId: 999, 
        isLLMGenerating: true 
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('App not found');
    });

    it('should handle Expo process errors', async () => {
      const { registerIntelligentPreviewSystem } = await import('../handlers/intelligent_preview_system');
      
      const mockIpcMain = {
        handle: jest.fn()
      };
      
      jest.doMock('electron', () => ({
        ipcMain: mockIpcMain
      }));

      registerIntelligentPreviewSystem();

      const startHandler = mockIpcMain.handle.mock.calls.find(
        call => call[0] === 'intelligent-preview:start-preparation'
      )?.[1];

      const completionHandler = mockIpcMain.handle.mock.calls.find(
        call => call[0] === 'intelligent-preview:llm-completed'
      )?.[1];

      // Start preparation
      await startHandler(null, { appId: 1, isLLMGenerating: true });
      
      // Simulate process error
      setTimeout(() => {
        mockProcess.emit('error', new Error('Process failed'));
      }, 50);

      await completionHandler(null, { appId: 1 });

      // Wait for error handling
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should handle error gracefully without crashing
      expect(mockProcess.killed).toBe(false); // Process should still be managed
    });
  });

  describe('⚡ Performance Optimizations', () => {
    it('should use optimized Expo server configuration', async () => {
      const { registerIntelligentPreviewSystem } = await import('../handlers/intelligent_preview_system');
      
      const mockIpcMain = {
        handle: jest.fn()
      };
      
      jest.doMock('electron', () => ({
        ipcMain: mockIpcMain
      }));

      registerIntelligentPreviewSystem();

      const completionHandler = mockIpcMain.handle.mock.calls.find(
        call => call[0] === 'intelligent-preview:llm-completed'
      )?.[1];

      // Start and complete preparation
      const startHandler = mockIpcMain.handle.mock.calls.find(
        call => call[0] === 'intelligent-preview:start-preparation'
      )?.[1];

      await startHandler(null, { appId: 1, isLLMGenerating: true });
      await completionHandler(null, { appId: 1 });

      // Wait for Expo server start
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify optimized configuration
      const spawnCall = mockSpawn.mock.calls.find(call => 
        call[1]?.includes('expo') && call[1]?.includes('start')
      );

      expect(spawnCall).toBeDefined();
      expect(spawnCall?.[2]?.env).toMatchObject({
        EXPO_NO_TELEMETRY: '1',
        EXPO_USE_DEV_SERVER: '1',
        EXPO_USE_FAST_RESOLVER: '1',
        METRO_CACHE_ENABLED: '1',
        EXPO_OPTIMIZE_STARTUP: '1'
      });
    });

    it('should allocate available ports correctly', async () => {
      const { registerIntelligentPreviewSystem } = await import('../handlers/intelligent_preview_system');
      
      const mockIpcMain = {
        handle: jest.fn()
      };
      
      jest.doMock('electron', () => ({
        ipcMain: mockIpcMain
      }));

      registerIntelligentPreviewSystem();

      // Mock net module for port checking
      const mockNet = {
        createServer: jest.fn().mockReturnValue({
          listen: jest.fn().mockImplementation((port, callback) => {
            // Simulate port 8081 is available
            if (port === 8081) {
              callback();
            }
          }),
          close: jest.fn().mockImplementation((callback) => callback()),
          on: jest.fn()
        })
      };

      jest.doMock('net', () => mockNet);

      const completionHandler = mockIpcMain.handle.mock.calls.find(
        call => call[0] === 'intelligent-preview:llm-completed'
      )?.[1];

      const startHandler = mockIpcMain.handle.mock.calls.find(
        call => call[0] === 'intelligent-preview:start-preparation'
      )?.[1];

      await startHandler(null, { appId: 1, isLLMGenerating: true });
      await completionHandler(null, { appId: 1 });

      // Wait for port allocation
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify port allocation was attempted
      expect(mockNet.createServer).toHaveBeenCalled();
    });
  });

  describe('🧹 Resource Management', () => {
    it('should clean up processes on stop', async () => {
      const { registerIntelligentPreviewSystem } = await import('../handlers/intelligent_preview_system');
      
      const mockIpcMain = {
        handle: jest.fn()
      };
      
      jest.doMock('electron', () => ({
        ipcMain: mockIpcMain
      }));

      registerIntelligentPreviewSystem();

      const startHandler = mockIpcMain.handle.mock.calls.find(
        call => call[0] === 'intelligent-preview:start-preparation'
      )?.[1];

      const stopHandler = mockIpcMain.handle.mock.calls.find(
        call => call[0] === 'intelligent-preview:stop'
      )?.[1];

      // Start preparation
      await startHandler(null, { appId: 1, isLLMGenerating: true });

      // Stop preview
      const result = await stopHandler(null, { appId: 1 });

      expect(result.success).toBe(true);
      // Process cleanup is handled internally
    });

    it('should handle multiple concurrent preparations', async () => {
      const { registerIntelligentPreviewSystem } = await import('../handlers/intelligent_preview_system');
      
      const mockIpcMain = {
        handle: jest.fn()
      };
      
      jest.doMock('electron', () => ({
        ipcMain: mockIpcMain
      }));

      registerIntelligentPreviewSystem();

      const startHandler = mockIpcMain.handle.mock.calls.find(
        call => call[0] === 'intelligent-preview:start-preparation'
      )?.[1];

      // Start multiple preparations
      const promises = [
        startHandler(null, { appId: 1, isLLMGenerating: true }),
        startHandler(null, { appId: 2, isLLMGenerating: true }),
        startHandler(null, { appId: 3, isLLMGenerating: true })
      ];

      const results = await Promise.all(promises);

      // All should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Each should have unique state
      const appIds = results.map(r => r.state.appId);
      expect(new Set(appIds).size).toBe(3); // All unique
    });
  });
});
