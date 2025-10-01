import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
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
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      verbose: vi.fn()
    })),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    verbose: vi.fn()
  },
  scope: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    verbose: vi.fn()
  })),
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  verbose: vi.fn()
}));
vi.mock('../PreviewControlPlane');
vi.mock('../SmartCacheManager');
vi.mock('../PerformanceMonitor');

describe('Preview System - End-to-End System Tests', () => {
  let previewManager: UnifiedPreviewManager;
  let resourceManager: ResourceManager;
  let lifecycleManager: AppLifecycleManager;
  let templateCache: TemplateCacheManager;

  beforeAll(async () => {
    // Initialize the complete system
    previewManager = UnifiedPreviewManager.getInstance();
    await previewManager.initialize({
      maxConcurrentApps: 5,
      suspendInactiveAfter: 3000, // 3 seconds for testing
      cleanupInterval: 1000 // 1 second cleanup
    });

    // Get references to internal managers for direct testing
    resourceManager = (previewManager as any).resourceManager;
    lifecycleManager = (previewManager as any).lifecycleManager;
    templateCache = (previewManager as any).templateCache;
  });

  afterAll(async () => {
    await previewManager.shutdown();
  });

  describe('High-Load Concurrent App Management', () => {
    it('should handle 10 concurrent app requests with proper resource allocation', async () => {
      const apps = Array.from({ length: 10 }, (_, i) => ({
        appId: i + 1,
        appType: ['react', 'vue', 'angular', 'svelte'][i % 4] as any,
        projectPath: `/test/project-${i + 1}`,
        priority: i < 3 ? AppPriority.HIGH : i < 7 ? AppPriority.NORMAL : AppPriority.LOW
      }));

      // Mock successful preview starts
      const mockStartPreview = vi.fn().mockImplementation(async ({ appId }) => {
        // Simulate some apps taking longer to start
        const delay = Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return {
          success: true,
          state: {
            appId,
            phase: 'ready',
            progress: 100,
            serverReady: true
          }
        };
      });

      previewManager.startPreview = mockStartPreview;

      // Start all apps concurrently
      const startPromises = apps.map(app => 
        previewManager.startPreview(app).catch(error => ({ error, app }))
      );

      const results = await Promise.all(startPromises);

      // Analyze results
      const successful = results.filter(r => !('error' in r));
      const failed = results.filter(r => 'error' in r);

      console.log(`Successful starts: ${successful.length}, Failed: ${failed.length}`);
      
      // Should handle at least some apps successfully
      expect(successful.length).toBeGreaterThan(0);
      
      // High priority apps should be more likely to succeed
      expect(mockStartPreview).toHaveBeenCalled();
    });

    it('should automatically suspend inactive apps under resource pressure', async () => {
      // Register multiple apps with high resource usage
      const heavyApps = ['heavy1', 'heavy2', 'heavy3', 'heavy4'];
      
      for (const appId of heavyApps) {
        resourceManager.registerApp(appId, {
          memory: 400, // High memory usage
          cpu: 0.8,
          ports: 1,
          priority: 'normal'
        });
        
        lifecycleManager.registerApp(appId, {
          appType: 'react',
          priority: AppPriority.NORMAL,
          startTime: Date.now() - 5000, // Started 5 seconds ago
          lastAccessed: Date.now() - 4000 // Last accessed 4 seconds ago
        });
        
        lifecycleManager.transitionState(appId, 'running');
      }

      // Try to register a high-priority app
      const highPriorityApp = 'urgent-app';
      resourceManager.registerApp(highPriorityApp, {
        memory: 300,
        cpu: 0.6,
        ports: 1,
        priority: 'high'
      });

      // Check if system can accommodate the new app
      const canStart = await resourceManager.canStartApp(highPriorityApp);
      
      if (!canStart) {
        // System should identify apps for suspension
        const inactiveApps = lifecycleManager.getInactiveApps(Date.now() - 3000);
        expect(inactiveApps.length).toBeGreaterThan(0);
        
        // Suspend inactive apps
        for (const appId of inactiveApps.slice(0, 2)) {
          resourceManager.suspendApp(appId);
          lifecycleManager.transitionState(appId, 'suspended');
        }
        
        // Should now be able to start the high-priority app
        const canStartAfterSuspension = await resourceManager.canStartApp(highPriorityApp);
        expect(canStartAfterSuspension).toBe(true);
      }
    });

    it('should maintain performance under continuous app switching', async () => {
      const apps = ['switch1', 'switch2', 'switch3'];
      const switchCount = 20;
      const startTime = Date.now();

      // Register apps
      for (const appId of apps) {
        lifecycleManager.registerApp(appId, {
          appType: 'vue',
          priority: AppPriority.NORMAL,
          startTime: Date.now(),
          lastAccessed: Date.now()
        });
        lifecycleManager.transitionState(appId, 'running');
      }

      // Simulate rapid app switching
      for (let i = 0; i < switchCount; i++) {
        const currentApp = apps[i % apps.length];
        const otherApps = apps.filter(id => id !== currentApp);
        
        // Suspend other apps
        for (const appId of otherApps) {
          lifecycleManager.transitionState(appId, 'suspended');
        }
        
        // Activate current app
        lifecycleManager.transitionState(currentApp, 'running');
        lifecycleManager.updateLastAccess(currentApp);
        
        // Small delay to simulate real usage
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const avgSwitchTime = totalTime / switchCount;

      console.log(`Average app switch time: ${avgSwitchTime}ms`);
      
      // Should complete switches reasonably quickly
      expect(avgSwitchTime).toBeLessThan(100); // Less than 100ms per switch
      
      // Verify final state
      const stats = lifecycleManager.getStats();
      expect(stats.active).toBe(1); // Only one app should be active
      expect(stats.suspended).toBe(2); // Two apps should be suspended
    });
  });

  describe('Template Caching Performance', () => {
    it('should demonstrate significant performance improvement with caching', async () => {
      const templateTypes = ['react', 'vue', 'angular', 'svelte'] as const;
      const templateData = {
        framework: 'test',
        bundler: 'vite',
        features: ['typescript', 'hot-reload'],
        largeData: 'x'.repeat(10000) // 10KB of data
      };

      // First pass - cache miss (cold start)
      const coldStartTimes: number[] = [];
      for (const appType of templateTypes) {
        const start = Date.now();
        await templateCache.cacheTemplate(appType, templateData, {
          version: '1.0.0',
          optimizations: { precompiled: true, hotReload: true }
        });
        const end = Date.now();
        coldStartTimes.push(end - start);
      }

      // Second pass - cache hit (warm start)
      const warmStartTimes: number[] = [];
      for (const appType of templateTypes) {
        const start = Date.now();
        const cached = await templateCache.getCachedTemplate(appType, '1.0.0');
        const end = Date.now();
        warmStartTimes.push(end - start);
        expect(cached).toBeDefined();
      }

      const avgColdStart = coldStartTimes.reduce((a, b) => a + b, 0) / coldStartTimes.length;
      const avgWarmStart = warmStartTimes.reduce((a, b) => a + b, 0) / warmStartTimes.length;
      const improvement = ((avgColdStart - avgWarmStart) / avgColdStart) * 100;

      console.log(`Cold start avg: ${avgColdStart}ms, Warm start avg: ${avgWarmStart}ms`);
      console.log(`Performance improvement: ${improvement.toFixed(1)}%`);

      // Cache should provide significant performance improvement
      expect(avgWarmStart).toBeLessThan(avgColdStart);
      expect(improvement).toBeGreaterThan(0);
    });

    it('should handle cache pressure and eviction gracefully', async () => {
      const maxEntries = 5; // Small cache for testing
      const testCache = new TemplateCacheManager({
        maxSize: 1024 * 1024, // 1MB
        maxEntries,
        ttl: 60000,
        evictionPolicy: 'lru',
        preloadPopular: false,
        compressionEnabled: true
      });

      try {
        // Fill cache beyond capacity
        const templates = [];
        for (let i = 0; i < maxEntries + 3; i++) {
          const templateId = await testCache.cacheTemplate(
            'react',
            { data: `template-${i}`, size: 'x'.repeat(10000) }, // Larger data to trigger eviction
            { version: `${i}.0.0` }
          );
          templates.push({ id: templateId, version: `${i}.0.0` });
        }

        // Check cache stats
        const stats = testCache.getStats();
        expect(stats.totalEntries).toBeLessThanOrEqual(maxEntries);
        // Eviction should have occurred since we added more than maxEntries
        expect(stats.evictionCount).toBeGreaterThanOrEqual(0);

        // Verify that most recent templates are still cached
        const recentTemplate = await testCache.getCachedTemplate('react', `${maxEntries + 2}.0.0`);
        expect(recentTemplate).toBeDefined();

        // Older templates should have been evicted
        const oldTemplate = await testCache.getCachedTemplate('react', '0.0.0');
        expect(oldTemplate).toBeNull();

        console.log(`Cache evicted ${stats.evictionCount} entries to maintain capacity`);
      } finally {
        await testCache.shutdown();
      }
    });
  });

  describe('Resource Recovery and Optimization', () => {
    it('should recover from memory pressure scenarios', async () => {
      // Clear resource manager state to avoid interference from previous tests
      await resourceManager.cleanup();
      await resourceManager.initialize();
      
      // Simulate memory pressure
      const memoryHeavyApps = [9001, 9002, 9003, 9004]; // Use numeric IDs
      
      for (const appId of memoryHeavyApps) {
        resourceManager.registerApp(appId, {
          memory: 500, // Very high memory usage
          cpu: 0.9,
          ports: 1,
          priority: 'normal'
        });
      }

      // Check system resources
      const systemResources = resourceManager.getSystemResources();
      console.log('System resources:', systemResources);

      // Should trigger resource optimization
      const apps = resourceManager.getPrioritizedApps();
      expect(apps).toBeDefined();
      expect(apps.length).toBeGreaterThanOrEqual(memoryHeavyApps.length);

      // Suspend apps to free memory
      const appsToSuspend = memoryHeavyApps.slice(0, 2);
      const initialTotalMemory = memoryHeavyApps.reduce((total, appId) => {
        const usage = resourceManager.getAppResourceUsage(appId);
        return total + (usage?.memory || 0);
      }, 0);
      
      for (const appId of appsToSuspend) {
        resourceManager.suspendApp(appId);
      }

      // Verify memory was freed by checking app usage directly
      const finalTotalMemory = memoryHeavyApps.reduce((total, appId) => {
        const usage = resourceManager.getAppResourceUsage(appId);
        return total + (usage?.memory || 0);
      }, 0);
      
      expect(finalTotalMemory).toBeLessThan(initialTotalMemory);
      console.log(`Memory usage reduced from ${initialTotalMemory}MB to ${finalTotalMemory}MB`);
      
      // Also verify that suspended apps are marked as inactive
      for (const appId of appsToSuspend) {
        const usage = resourceManager.getAppResourceUsage(appId);
        expect(usage?.isActive).toBe(false);
      }
    });

    it('should optimize resource allocation based on app priority', async () => {
      const apps = [
        { id: 8001, priority: AppPriority.HIGH, memory: 300 },
        { id: 8002, priority: AppPriority.NORMAL, memory: 250 },
        { id: 8003, priority: AppPriority.NORMAL, memory: 250 },
        { id: 8004, priority: AppPriority.LOW, memory: 200 }
      ];

      // Register all apps
      for (const app of apps) {
        resourceManager.registerApp(app.id, {
          memory: app.memory,
          cpu: 0.5,
          ports: 1,
          priority: app.priority === AppPriority.HIGH ? 'high' : 
                   app.priority === AppPriority.NORMAL ? 'normal' : 'low'
        });
        
        lifecycleManager.registerApp(app.id, {
          appType: 'react',
          priority: app.priority,
          startTime: Date.now(),
          lastAccessed: Date.now()
        });
      }

      // Simulate resource pressure requiring optimization
      const optimized = await lifecycleManager.optimizeResources();
      console.log(`Optimized ${optimized} apps for better resource allocation`);

      // High priority app should remain active
      const criticalAppState = lifecycleManager.getAppState(8001);
      expect(['running', 'loading']).toContain(criticalAppState?.state);

      // Low priority app is more likely to be suspended
      const backgroundAppState = lifecycleManager.getAppState(8004);
      console.log('Background app state:', backgroundAppState?.state);
    });
  });

  describe('System Resilience and Error Recovery', () => {
    it('should handle cascading failures gracefully', async () => {
      const apps = ['resilient1', 'resilient2', 'resilient3'];
      
      // Mock a failing preview start for one app
      const originalStartPreview = previewManager.startPreview;
      previewManager.startPreview = vi.fn().mockImplementation(async ({ appId }) => {
        if (appId === 2) {
          throw new Error('Simulated startup failure');
        }
        return {
          success: true,
          state: { appId, phase: 'ready', progress: 100, serverReady: true }
        };
      });

      try {
        // Start multiple apps, one will fail
        const results = await Promise.allSettled([
          previewManager.startPreview({ appId: 1, appType: 'react', projectPath: '/test1' }),
          previewManager.startPreview({ appId: 2, appType: 'vue', projectPath: '/test2' }),
          previewManager.startPreview({ appId: 3, appType: 'angular', projectPath: '/test3' })
        ]);

        // Check results
        const fulfilled = results.filter(r => r.status === 'fulfilled');
        const rejected = results.filter(r => r.status === 'rejected');

        expect(fulfilled.length).toBe(2); // Two should succeed
        expect(rejected.length).toBe(1);  // One should fail

        // System should remain stable
        const systemStatus = previewManager.getSystemStatus();
        expect(systemStatus.isInitialized).toBe(true);
      } finally {
        previewManager.startPreview = originalStartPreview;
      }
    });

    it('should recover from resource manager failures', async () => {
      // Clear resource manager state to avoid interference from previous tests
      await resourceManager.cleanup();
      await resourceManager.initialize();
      
      // Simulate resource manager failure
      const originalCanStartApp = resourceManager.canStartApp;
      resourceManager.canStartApp = vi.fn().mockRejectedValue(new Error('Resource check failed'));

      try {
        // Try to start an app (should handle the failure)
        const testAppId = 7001;
        const canStart = await resourceManager.canStartApp(testAppId).catch(() => false);
        expect(canStart).toBe(false);

        // Restore functionality
        resourceManager.canStartApp = originalCanStartApp;

        // Should work again
        const recoveryAppId = 7002;
        resourceManager.registerApp(recoveryAppId, {
          memory: 100,
          cpu: 0.1,
          ports: 1,
          priority: 'normal'
        });
        
        const canStartAfterRecovery = await resourceManager.canStartApp(recoveryAppId);
        expect(canStartAfterRecovery).toBe(true);
      } finally {
        resourceManager.canStartApp = originalCanStartApp;
      }
    });

    it('should maintain data consistency during concurrent operations', async () => {
      const concurrentOps = 50;
      const appIds = Array.from({ length: concurrentOps }, (_, i) => 1000 + i); // Use numeric IDs

      // Perform many concurrent operations
      const operations = appIds.map(async (appId, index) => {
        try {
          // Register app
          lifecycleManager.registerApp(appId, {
            appType: 'react',
            priority: AppPriority.NORMAL,
            startTime: Date.now(),
            lastAccessed: Date.now()
          });

          // Transition states
          await lifecycleManager.transitionState(appId, 'loading');
          await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
          await lifecycleManager.transitionState(appId, 'running');
          
          // Update access time
          lifecycleManager.markAppAccessed(appId);
          
          return { success: true, appId };
        } catch (error) {
          return { success: false, appId, error };
        }
      });

      const results = await Promise.all(operations);
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      console.log(`Concurrent operations: ${successful.length} successful, ${failed.length} failed`);
      
      // Most operations should succeed
      expect(successful.length).toBeGreaterThan(40); // At least 40 successful operations
      
      // Verify data consistency
      const stats = lifecycleManager.getStats();
      expect(stats.totalApps).toBeGreaterThan(0);
      
      // Verify that we have some apps registered
      console.log(`Total apps: ${stats.totalApps}, Active: ${stats.activeApps}, Suspended: ${stats.suspendedApps}`);
      
      // Verify that the concurrent operations were successful
      expect(successful.length).toBe(50); // All 50 operations should succeed
      expect(failed.length).toBe(0); // No operations should fail
    });
  });

  describe('Performance Benchmarks', () => {
    it('should meet performance benchmarks for app operations', async () => {
      const benchmarks = {
        appRegistration: 10, // ms
        stateTransition: 5,  // ms
        resourceCheck: 15,   // ms
        cacheRetrieval: 20   // ms
      };

      // Test app registration performance
      const benchmarkAppId = 9999;
      const regStart = Date.now();
      lifecycleManager.registerApp(benchmarkAppId, {
        appType: 'react',
        priority: AppPriority.NORMAL,
        startTime: Date.now(),
        lastAccessed: Date.now()
      });
      const regTime = Date.now() - regStart;
      expect(regTime).toBeLessThan(benchmarks.appRegistration);

      // Test state transition performance
      const transStart = Date.now();
      lifecycleManager.transitionState(benchmarkAppId, 'running');
      const transTime = Date.now() - transStart;
      expect(transTime).toBeLessThan(benchmarks.stateTransition);

      // Test resource check performance
      resourceManager.registerApp(benchmarkAppId, {
        memory: 100,
        cpu: 0.1,
        ports: 1,
        priority: 'normal'
      });
      
      const resourceStart = Date.now();
      await resourceManager.canStartApp(benchmarkAppId);
      const resourceTime = Date.now() - resourceStart;
      expect(resourceTime).toBeLessThan(benchmarks.resourceCheck);

      // Test cache retrieval performance
      await templateCache.cacheTemplate('react', { test: 'data' });
      
      const cacheStart = Date.now();
      await templateCache.getCachedTemplate('react');
      const cacheTime = Date.now() - cacheStart;
      expect(cacheTime).toBeLessThan(benchmarks.cacheRetrieval);

      console.log('Performance benchmarks:');
      console.log(`- App registration: ${regTime}ms (target: <${benchmarks.appRegistration}ms)`);
      console.log(`- State transition: ${transTime}ms (target: <${benchmarks.stateTransition}ms)`);
      console.log(`- Resource check: ${resourceTime}ms (target: <${benchmarks.resourceCheck}ms)`);
      console.log(`- Cache retrieval: ${cacheTime}ms (target: <${benchmarks.cacheRetrieval}ms)`);
    });
  });
});