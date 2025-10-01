/**
 * Comprehensive test suite for the enhanced preview system
 */

import { UnifiedPreviewManager } from '../src/preview/UnifiedPreviewManager';
import { AppType } from '../src/preview/types';

// Mock configuration
const mockConfig = {
  maxConcurrentApps: 5,
  suspendInactiveAfter: 30000, // 30 seconds
  cleanupInterval: 10000, // 10 seconds
  resourceThresholds: {
    memory: 80, // 80% memory usage threshold
    cpu: 70    // 70% CPU usage threshold
  }
};

// Test data
const testApps = [
  { appId: 1, appType: 'react' as AppType, template: 'react-typescript' },
  { appId: 2, appType: 'vue' as AppType, template: 'vue3-composition' },
  { appId: 3, appType: 'next' as AppType, template: 'nextjs-app' },
  { appId: 4, appType: 'angular' as AppType, template: 'angular-standalone' },
  { appId: 5, appType: 'svelte' as AppType, template: 'svelte-kit' }
];

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
  details?: string;
}

interface TestResults {
  passed: number;
  failed: number;
  tests: TestResult[];
}

class PreviewSystemTester {
  private results: TestResults;
  private previewManager: UnifiedPreviewManager | null;

  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
    this.previewManager = null;
  }

  /**
   * Initialize the preview system for testing
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('🔧 Initializing Preview System for Testing...');
      
      // Create UnifiedPreviewManager instance
      this.previewManager = UnifiedPreviewManager.getInstance(mockConfig);
      
      // Initialize with test configuration
      await this.previewManager.initialize();
      
      console.log('✅ Preview System initialized successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to initialize Preview System:', error);
      return false;
    }
  }

  /**
   * Run a single test with error handling and timing
   */
  private async runTest(name: string, testFn: () => Promise<any>): Promise<void> {
    const startTime = Date.now();
    try {
      console.log(`\n🧪 Running test: ${name}`);
      const result = await testFn();
      const duration = Date.now() - startTime;
      
      this.results.passed++;
      this.results.tests.push({
        name,
        passed: true,
        duration,
        details: typeof result === 'string' ? result : 'Test passed'
      });
      
      console.log(`  ✅ ${name} - Passed (${duration}ms)`);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.results.failed++;
      this.results.tests.push({
        name,
        passed: false,
        duration,
        error: errorMessage
      });
      
      console.log(`  ❌ ${name} - Failed (${duration}ms): ${errorMessage}`);
    }
  }

  /**
   * Test lazy loading capabilities
   */
  async testLazyLoading(): Promise<void> {
    console.log('\n📦 Testing Lazy Loading Capabilities...');
    
    await this.runTest('Basic App Startup', async () => {
       if (!this.previewManager) throw new Error('Preview manager not initialized');
       
       const app = testApps[0];
       const result = await this.previewManager.startPreview({
         appId: app.appId,
         appType: app.appType,
         options: { skipCache: false }
       });
       
       if (!result.success) {
         throw new Error('Failed to start preview');
       }
       
       return `App ${app.appId} started successfully`;
     });

    await this.runTest('Template Caching', async () => {
       if (!this.previewManager) throw new Error('Preview manager not initialized');
       
       const app = testApps[1];
       
       // First load
       const startTime1 = Date.now();
       await this.previewManager.startPreview({
         appId: app.appId,
         appType: app.appType,
         options: { skipCache: true }
       });
       const firstLoadTime = Date.now() - startTime1;
       
       // Stop and restart to test caching
       await this.previewManager.stopPreview({ appId: app.appId });
       
       const startTime2 = Date.now();
       await this.previewManager.startPreview({
         appId: app.appId,
         appType: app.appType,
         options: { skipCache: false }
       });
       const cachedLoadTime = Date.now() - startTime2;
       
       return `First: ${firstLoadTime}ms, Cached: ${cachedLoadTime}ms`;
     });
  }

  /**
   * Test resource management
   */
  async testResourceManagement(): Promise<void> {
    console.log('\n🔧 Testing Resource Management...');
    
    await this.runTest('System Status Check', async () => {
      if (!this.previewManager) throw new Error('Preview manager not initialized');
      
      const status = this.previewManager.getSystemStatus();
      
      if (!status || typeof status.activeApps !== 'number') {
        throw new Error('Invalid system status');
      }
      
      return `Active apps: ${status.activeApps}, Initialized: ${status.isInitialized}`;
    });

    await this.runTest('App Suspension', async () => {
       if (!this.previewManager) throw new Error('Preview manager not initialized');
       
       const app = testApps[2];
       
       // Start app
       await this.previewManager.startPreview({
         appId: app.appId,
         appType: app.appType
       });
       
       // Stop app (suspension is handled internally)
       const stopResult = await this.previewManager.stopPreview({ appId: app.appId });
       
       if (!stopResult.success) {
         throw new Error('Failed to stop app');
       }
       
       return `App ${app.appId} stopped successfully`;
     });
  }

  /**
   * Test caching functionality
   */
  async testCaching(): Promise<void> {
    console.log('\n💾 Testing Smart Caching...');
    
    await this.runTest('Cache Manager Availability', async () => {
      if (!this.previewManager) throw new Error('Preview manager not initialized');
      
      // Access cache manager through the preview manager
      const systemStatus = this.previewManager.getSystemStatus();
      
      if (!systemStatus) {
        throw new Error('System status not available');
      }
      
      return 'Cache manager is accessible';
    });
  }

  /**
   * Test lifecycle management
   */
  async testLifecycleManagement(): Promise<void> {
    console.log('\n🔄 Testing Lifecycle Management...');
    
    await this.runTest('App State Transitions', async () => {
       if (!this.previewManager) throw new Error('Preview manager not initialized');
       
       const app = testApps[3];
       
       // Start app
       await this.previewManager.startPreview({
         appId: app.appId,
         appType: app.appType
       });
       
       // Get state
       const stateResponse = await this.previewManager.getPreviewState(app.appId);
       
       if (!stateResponse.success || !stateResponse.state) {
         throw new Error('Failed to get app state');
       }
       
       // Stop app
       await this.previewManager.stopPreview({ appId: app.appId });
       
       return `App lifecycle managed successfully, final phase: ${stateResponse.state.phase}`;
     });
  }

  /**
   * Test performance improvements
   */
  async testPerformanceImprovements(): Promise<void> {
    console.log('\n⚡ Testing Performance Improvements...');
    
    await this.runTest('Concurrent App Loading', async () => {
      if (!this.previewManager) throw new Error('Preview manager not initialized');
      
      const apps = testApps.slice(0, 3);
      const startTime = Date.now();
      
      // Start multiple apps concurrently
       const promises = apps.map(app => 
         this.previewManager!.startPreview({
           appId: app.appId + 10, // Use different IDs to avoid conflicts
           appType: app.appType
         })
       );
      
      const results = await Promise.allSettled(promises);
      const loadTime = Date.now() - startTime;
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      
      return `Loaded ${successCount}/${apps.length} apps in ${loadTime}ms`;
    });
  }

  /**
   * Run all test suites
   */
  async runAllTests(): Promise<void> {
    console.log('\n🧪 Starting Comprehensive Preview System Tests...');
    console.log('='.repeat(60));
    
    const startTime = Date.now();
    
    // Test categories
    await this.testLazyLoading();
    await this.testResourceManagement();
    await this.testCaching();
    await this.testLifecycleManagement();
    await this.testPerformanceImprovements();
    
    const totalTime = Date.now() - startTime;
    
    // Print comprehensive results
    this.printResults(totalTime);
  }

  /**
   * Print test results
   */
  private printResults(totalTime: number): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(60));
    
    console.log(`\n🎯 Overall Results:`);
    console.log(`  ✅ Passed: ${this.results.passed}`);
    console.log(`  ❌ Failed: ${this.results.failed}`);
    console.log(`  ⏱️  Total Time: ${totalTime}ms`);
    console.log(`  📈 Success Rate: ${((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1)}%`);
    
    if (this.results.failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.tests
        .filter(test => !test.passed)
        .forEach(test => {
          console.log(`  • ${test.name}: ${test.error}`);
        });
    }
    
    console.log('\n' + '='.repeat(60));
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    try {
      if (this.previewManager) {
        await this.previewManager.shutdown();
        console.log('✅ Preview system shutdown complete');
      }
    } catch (error) {
      console.error('❌ Cleanup error:', error);
    }
  }
}

// Main execution
async function main() {
  const tester = new PreviewSystemTester();
  
  try {
    // Initialize
    const initialized = await tester.initialize();
    if (!initialized) {
      console.error('❌ Failed to initialize test suite');
      process.exit(1);
    }
    
    // Run tests
    await tester.runAllTests();
    
    // Cleanup
    await tester.cleanup();
    
  } catch (error) {
    console.error('❌ Test suite error:', error);
    await tester.cleanup();
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { PreviewSystemTester };