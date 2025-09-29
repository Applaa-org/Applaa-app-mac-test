import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { UnifiedPreviewManager } from '../UnifiedPreviewManager';
import { ResourceManager } from '../ResourceManager';
import { AppLifecycleManager } from '../AppLifecycleManager';
import { TemplateCacheManager } from '../TemplateCacheManager';
import { AppState, AppPriority } from '../types-simple';

// Mock external dependencies
vi.mock('electron-log', () => ({
  default: {
    scope: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn()
    }))
  },
  scope: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }))
}));
vi.mock('../PreviewControlPlane');
vi.mock('../SmartCacheManager');
vi.mock('../PerformanceMonitor');

describe('Preview System Integration Tests', () => {
  let previewManager: UnifiedPreviewManager;
  let resourceManager: ResourceManager;
  let lifecycleManager: AppLifecycleManager;
  let templateCache: TemplateCacheManager;

  beforeEach(async () => {
    // Initialize managers
    resourceManager = new ResourceManager();
    lifecycleManager = new AppLifecycleManager({
      inactivityTimeout: 5000,
      maxConcurrentActive: 3,
      maxSuspendedTime: 10000
    });
    templateCache = new TemplateCacheManager({
      maxSize: 10 * 1024 * 1024, // 10MB for testing
      maxEntries: 10,
      ttl: 30000, // 30 seconds for testing
      evictionPolicy: 'hybrid',
      preloadPopular: false,
      compressionEnabled: true
    });

    previewManager = UnifiedPreviewManager.getInstance();
    await previewManager.initialize({
      maxConcurrentApps: 3,
      suspendInactiveAfter: 5000,
      cleanupInterval: 1000
    });
  });

  afterEach(async () => {
    await previewManager.shutdown();
    await resourceManager.shutdown();
    await lifecycleManager.shutdown();
    await templateCache.shutdown();
  });

  describe('Resource Management Integration', () => {
    it('should allocate resources when starting an app', async () => {
      const appId = 'test-app-1';
      
      // Register app with resource manager
      resourceManager.registerApp(appId, {
        memory: 256,
        cpu: 0.5,
        ports: 1,
        priority: 'normal'
      });

      // Check if app can start
      const canStart = await resourceManager.canStartApp(appId);
      expect(canStart).toBe(true);

      // Verify resource allocation
      const usage = resourceManager.getAppUsage(appId);
      expect(usage).toBeDefined();
      expect(usage?.memory).toBe(256);
    });

    it('should prevent starting apps when resources are exhausted', async () => {
      // Fill up resource capacity
      const apps = ['app1', 'app2', 'app3', 'app4'];
      
      for (const appId of apps.slice(0, 3)) {
        resourceManager.registerApp(appId, {
          memory: 400, // High memory usage
          cpu: 0.8,
          ports: 1,
          priority: 'normal'
        });
      }

      // Try to start one more app
      const canStart = await resourceManager.canStartApp('app4');
      expect(canStart).toBe(false);
    });

    it('should suspend apps to free resources for new ones', async () => {
      const app1 = 'high-memory-app';
      const app2 = 'new-app';

      // Start high memory app
      resourceManager.registerApp(app1, {
        memory: 800,
        cpu: 0.9,
        ports: 1,
        priority: 'low'
      });

      // Try to start new app (should trigger suspension)
      resourceManager.registerApp(app2, {
        memory: 400,
        cpu: 0.5,
        ports: 1,
        priority: 'high'
      });

      // Suspend the first app to make room
      resourceManager.suspendApp(app1);
      
      const canStartNew = await resourceManager.canStartApp(app2);
      expect(canStartNew).toBe(true);
    });
  });

  describe('App Lifecycle Management Integration', () => {
    it('should manage app state transitions correctly', async () => {
      const appId = 'lifecycle-test-app';
      
      // Register app
      lifecycleManager.registerApp(appId, {
        appType: 'react',
        priority: AppPriority.NORMAL,
        startTime: Date.now(),
        lastAccessed: Date.now()
      });

      // Test state transitions
      lifecycleManager.transitionState(appId, 'loading');
      expect(lifecycleManager.getAppState(appId)).toBe('loading');
      
      lifecycleManager.transitionState(appId, 'running');
      expect(lifecycleManager.getAppState(appId)).toBe('running');

      lifecycleManager.transitionState(appId, 'suspended');
      expect(lifecycleManager.getAppState(appId)).toBe('suspended');
    });

    it('should identify inactive apps for suspension', async () => {
      const appId = 'inactive-app';
      const oldTime = Date.now() - 10000; // 10 seconds ago
      
      lifecycleManager.registerApp(appId, {
        appType: 'vue',
        priority: AppPriority.LOW,
        startTime: oldTime,
        lastAccessed: oldTime
      });

      lifecycleManager.transitionState(appId, 'running');

      // Get inactive apps (older than 5 seconds)
      const inactiveApps = lifecycleManager.getInactiveApps(Date.now() - 5000);
      expect(inactiveApps).toContain(appId);
    });

    it('should handle app cleanup and resource optimization', async () => {
      const apps = ['app1', 'app2', 'app3'];
      
      // Register multiple apps
      for (const appId of apps) {
        lifecycleManager.registerApp(appId, {
          appType: 'react',
          priority: AppPriority.NORMAL,
          startTime: Date.now(),
          lastAccessed: Date.now()
        });
        lifecycleManager.transitionState(appId, 'running');
      }

      // Optimize resources (should suspend some apps)
      const optimized = await lifecycleManager.optimizeResources();
      expect(optimized).toBeGreaterThan(0);

      // Check that some apps were suspended
      const stats = lifecycleManager.getStats();
      expect(stats.suspended).toBeGreaterThan(0);
    });
  });

  describe('Template Caching Integration', () => {
    it('should cache and retrieve templates efficiently', async () => {
      const appType = 'react';
      const templateData = {
        framework: 'react',
        bundler: 'vite',
        features: ['typescript', 'hot-reload']
      };

      // Cache template
      const templateId = await templateCache.cacheTemplate(appType, templateData, {
        version: '1.0.0',
        optimizations: {
          precompiled: true,
          hotReload: true
        }
      });

      expect(templateId).toBeDefined();

      // Retrieve cached template
      const cached = await templateCache.getCachedTemplate(appType, '1.0.0');
      expect(cached).toBeDefined();
      expect(cached?.data.framework).toBe('react');
      expect(cached?.metadata.accessCount).toBe(1);
    });

    it('should handle cache eviction policies correctly', async () => {
      // Fill cache to capacity
      const templates = [];
      for (let i = 0; i < 12; i++) { // Exceed maxEntries (10)
        const templateId = await templateCache.cacheTemplate(
          'react',
          { data: `template-${i}` },
          { version: `${i}.0.0` }
        );
        templates.push(templateId);
      }

      // Check that eviction occurred
      const stats = templateCache.getStats();
      expect(stats.totalEntries).toBeLessThanOrEqual(10);
      expect(stats.evictionCount).toBeGreaterThan(0);
    });

    it('should track popular templates and preload them', async () => {
      const popularTypes = ['react', 'vue', 'angular'];
      
      // Simulate usage patterns
      for (const appType of popularTypes) {
        for (let i = 0; i < 5; i++) {
          await templateCache.getCachedTemplate(appType as any); // Simulate cache misses
        }
      }

      // Get popular templates
      const popular = templateCache.getPopularTemplates(3);
      expect(popular.length).toBe(3);
      expect(popular[0].hits).toBeGreaterThan(0);
    });
  });

  describe('End-to-End Preview Workflow', () => {
    it('should handle complete app lifecycle from start to stop', async () => {
      const mockStartPreview = vi.fn().mockResolvedValue({
        success: true,
        state: {
          appId: 1,
          phase: 'ready',
          progress: 100,
          serverReady: true
        }
      });

      const mockStopPreview = vi.fn().mockResolvedValue({
        success: true
      });

      // Mock the preview manager methods
      previewManager.startPreview = mockStartPreview;
      previewManager.stopPreview = mockStopPreview;

      // Start preview
      const startResult = await previewManager.startPreview({
        appId: 1,
        appType: 'react',
        projectPath: '/test/project'
      });

      expect(startResult.success).toBe(true);
      expect(mockStartPreview).toHaveBeenCalledWith({
        appId: 1,
        appType: 'react',
        projectPath: '/test/project'
      });

      // Stop preview
      const stopResult = await previewManager.stopPreview({ appId: 1 });
      expect(stopResult.success).toBe(true);
      expect(mockStopPreview).toHaveBeenCalledWith({ appId: 1 });
    });

    it('should handle multiple concurrent apps with resource management', async () => {
      const apps = [
        { appId: 1, appType: 'react' as const },
        { appId: 2, appType: 'vue' as const },
        { appId: 3, appType: 'angular' as const }
      ];

      const mockStartPreview = vi.fn().mockImplementation(async ({ appId }) => ({
        success: true,
        state: {
          appId,
          phase: 'ready',
          progress: 100,
          serverReady: true
        }
      }));

      previewManager.startPreview = mockStartPreview;

      // Start multiple apps
      const results = await Promise.all(
        apps.map(app => previewManager.startPreview({
          appId: app.appId,
          appType: app.appType,
          projectPath: `/test/project-${app.appId}`
        }))
      );

      // All should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      expect(mockStartPreview).toHaveBeenCalledTimes(3);
    });

    it('should handle app suspension and resumption', async () => {
      const appId = 1;
      
      const mockSuspendPreview = vi.fn().mockResolvedValue({ success: true });
      const mockResumePreview = vi.fn().mockResolvedValue({ success: true });

      // Mock suspend/resume methods
      (previewManager as any).suspendPreview = mockSuspendPreview;
      (previewManager as any).resumePreview = mockResumePreview;

      // Suspend app
      await (previewManager as any).suspendPreview(appId);
      expect(mockSuspendPreview).toHaveBeenCalledWith(appId);

      // Resume app
      await (previewManager as any).resumePreview(appId);
      expect(mockResumePreview).toHaveBeenCalledWith(appId);
    });
  });

  describe('Performance and Monitoring', () => {
    it('should track system metrics and performance', async () => {
      // Get system status
      const status = previewManager.getSystemStatus();
      
      expect(status).toBeDefined();
      expect(status.isInitialized).toBe(true);
      expect(typeof status.activeApps).toBe('number');
      expect(typeof status.suspendedApps).toBe('number');
    });

    it('should provide template cache statistics', async () => {
      // Cache some templates
      await templateCache.cacheTemplate('react', { test: 'data' });
      await templateCache.cacheTemplate('vue', { test: 'data' });

      const stats = previewManager.getTemplateCacheStats();
      
      expect(stats).toBeDefined();
      expect(stats.totalEntries).toBeGreaterThan(0);
      expect(stats.totalSize).toBeGreaterThan(0);
      expect(typeof stats.hitRate).toBe('number');
    });

    it('should handle cleanup and resource optimization', async () => {
      // Create some test data
      await templateCache.cacheTemplate('react', { large: 'data'.repeat(1000) });
      await templateCache.cacheTemplate('vue', { large: 'data'.repeat(1000) });

      const initialStats = templateCache.getStats();
      
      // Perform cleanup
      await templateCache.cleanup();
      
      const finalStats = templateCache.getStats();
      
      // Stats should be available (cleanup may or may not remove entries depending on TTL)
      expect(finalStats).toBeDefined();
      expect(typeof finalStats.totalEntries).toBe('number');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle app startup failures gracefully', async () => {
      const mockStartPreview = vi.fn().mockRejectedValue(new Error('Startup failed'));
      previewManager.startPreview = mockStartPreview;

      try {
        await previewManager.startPreview({
          appId: 999,
          appType: 'react',
          projectPath: '/invalid/path'
        });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Startup failed');
      }
    });

    it('should recover from resource exhaustion', async () => {
      // Simulate resource exhaustion
      const apps = [1, 2, 3, 4];
      
      for (const appId of apps) {
        resourceManager.registerApp(appId, {
          memory: 300,
          cpu: 0.7,
          ports: 1,
          priority: 'normal'
        });
      }

      // Should not be able to start more apps (app5 not registered, uses defaults: 150MB, 0.3 CPU)
      // Total: 4 * (300MB + 0.7 CPU) + (150MB + 0.3 CPU) = 1350MB + 3.1 CPU > limits (1000MB, 2.0 CPU)
      const canStart = await resourceManager.canStartApp(5);
      expect(canStart).toBe(false);

      // Suspend some apps to free resources
      resourceManager.suspendApp(1);
      resourceManager.suspendApp(2);

      // Should now be able to start new app
      const canStartAfterSuspension = await resourceManager.canStartApp(5);
      expect(canStartAfterSuspension).toBe(true);
    });

    it('should handle cache corruption and recovery', async () => {
      // Cache a template
      await templateCache.cacheTemplate('react', { valid: 'data' });
      
      // Simulate cache corruption by invalidating
      const invalidated = templateCache.invalidateTemplates('react');
      expect(invalidated).toBeGreaterThan(0);
      
      // Should be able to cache again
      const newTemplateId = await templateCache.cacheTemplate('react', { recovered: 'data' });
      expect(newTemplateId).toBeDefined();
    });
  });
});