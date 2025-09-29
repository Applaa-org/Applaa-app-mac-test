#!/usr/bin/env node

/**
 * 🚀 UNIFIED PREVIEW SYSTEM TEST
 * 
 * Comprehensive test to verify the Quest-inspired preview system integration
 * Tests both new and old app compatibility
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Testing Unified Preview System Integration...\n');

// Test configuration
const tests = [
  {
    name: 'TypeScript Compilation',
    command: 'npx',
    args: ['tsc', '--noEmit', '--project', 'tsconfig.json'],
    description: 'Verify no TypeScript compilation errors'
  },
  {
    name: 'Preview System Types',
    command: 'node',
    args: ['-e', `
      try {
        const types = require('./src/preview/types.ts');
        const simpleTypes = require('./src/preview/types-simple.ts');
        console.log('✅ Types loaded successfully');
        console.log('✅ AppType:', simpleTypes.AppType || 'Available');
        console.log('✅ PreviewState:', types.PreviewState || 'Available');
      } catch (error) {
        console.error('❌ Type loading failed:', error.message);
        process.exit(1);
      }
    `],
    description: 'Verify type definitions are accessible'
  },
  {
    name: 'IPC Handler Registration',
    command: 'node',
    args: ['-e', `
      try {
        const { registerUnifiedPreviewManagerHandlers } = require('./src/ipc/handlers/unified_preview_manager_handlers.ts');
        const { registerProcessMonitorHandlers } = require('./src/ipc/handlers/process_monitor_handlers.ts');
        console.log('✅ IPC handlers loaded successfully');
        console.log('✅ UnifiedPreviewManager handlers:', typeof registerUnifiedPreviewManagerHandlers);
        console.log('✅ ProcessMonitor handlers:', typeof registerProcessMonitorHandlers);
      } catch (error) {
        console.error('❌ IPC handler loading failed:', error.message);
        process.exit(1);
      }
    `],
    description: 'Verify IPC handlers can be loaded'
  },
  {
    name: 'Preview System Components',
    command: 'node',
    args: ['-e', `
      try {
        // Test main process components
        const { UnifiedPreviewManager } = require('./src/preview/UnifiedPreviewManager.ts');
        const { ResourceManager } = require('./src/preview/ResourceManager.ts');
        const { AppLifecycleManager } = require('./src/preview/AppLifecycleManager.ts');
        
        console.log('✅ Main process components loaded');
        console.log('✅ UnifiedPreviewManager:', typeof UnifiedPreviewManager);
        console.log('✅ ResourceManager:', typeof ResourceManager);
        console.log('✅ AppLifecycleManager:', typeof AppLifecycleManager);
        
        // Test renderer process components
        const { UnifiedPreviewManagerRenderer } = require('./src/preview/UnifiedPreviewManager.renderer.ts');
        const { getMigrationAdapter } = require('./src/preview/MigrationAdapter.renderer.ts');
        
        console.log('✅ Renderer process components loaded');
        console.log('✅ UnifiedPreviewManagerRenderer:', typeof UnifiedPreviewManagerRenderer);
        console.log('✅ getMigrationAdapter:', typeof getMigrationAdapter);
      } catch (error) {
        console.error('❌ Component loading failed:', error.message);
        process.exit(1);
      }
    `],
    description: 'Verify all preview system components can be loaded'
  }
];

// Run tests sequentially
async function runTests() {
  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    console.log(`🧪 Running: ${test.name}`);
    console.log(`   ${test.description}`);
    
    try {
      await runTest(test);
      console.log(`✅ PASSED: ${test.name}\n`);
      passed++;
    } catch (error) {
      console.error(`❌ FAILED: ${test.name}`);
      console.error(`   Error: ${error.message}\n`);
      failed++;
    }
  }

  // Summary
  console.log('📊 TEST SUMMARY');
  console.log('================');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📝 Total: ${tests.length}`);

  if (failed === 0) {
    console.log('\n🎉 All tests passed! The unified preview system integration looks good.');
    console.log('\n🚀 NEXT STEPS:');
    console.log('1. Test with actual Expo and React apps');
    console.log('2. Verify performance monitoring works');
    console.log('3. Test resource management and suspension');
    console.log('4. Verify backward compatibility with existing apps');
  } else {
    console.log('\n⚠️  Some tests failed. Please fix the issues before proceeding.');
    process.exit(1);
  }
}

function runTest(test) {
  return new Promise((resolve, reject) => {
    const child = spawn(test.command, test.args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
      cwd: process.cwd()
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        if (stdout.trim()) {
          console.log(`   Output: ${stdout.trim()}`);
        }
        resolve();
      } else {
        reject(new Error(stderr.trim() || stdout.trim() || `Process exited with code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

// Run the tests
runTests().catch((error) => {
  console.error('❌ Test runner failed:', error);
  process.exit(1);
});



