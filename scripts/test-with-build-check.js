#!/usr/bin/env node

/**
 * APPLAA COMPREHENSIVE TEST RUNNER
 * 
 * This script runs core tests + optional build verification to catch breaking changes.
 * 
 * Usage:
 *   npm run test:full           # Core tests + build check
 *   npm run test:watch          # Continuous testing
 *   npm run test:core           # Core tests only (existing)
 */

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Test configuration
const ENABLE_BUILD_CHECK = process.env.TEST_BUILD === 'true' || process.argv.includes('--build');
const ENABLE_WATCH_MODE = process.env.TEST_WATCH === 'true' || process.argv.includes('--watch');
const QUICK_MODE = process.argv.includes('--quick');

console.log('🛡️  APPLAA COMPREHENSIVE TEST SUITE');
console.log('=====================================\n');

if (ENABLE_WATCH_MODE) {
  console.log('👀 WATCH MODE ENABLED - Tests will run continuously');
}
if (ENABLE_BUILD_CHECK) {
  console.log('🔨 BUILD VERIFICATION ENABLED');
}
if (QUICK_MODE) {
  console.log('⚡ QUICK MODE - Skipping slower tests');
}
console.log('');

const coreTests = [
  {
    name: 'Core Features Protection',
    file: 'src/__tests__/core-features.test.ts',
    description: 'Tests critical Applaa tag system and chat functionality',
    required: true
  },
  {
    name: 'Applaa Enhancements',
    file: 'src/__tests__/applaa-enhancements.test.ts',
    description: 'Tests system prompt improvements, optimizations, and quality standards',
    required: true
  }
];

const buildTests = [
  {
    name: 'TypeScript Compilation',
    command: 'npx tsc --noEmit --skipLibCheck',
    description: 'Verify TypeScript compilation without errors',
    timeout: 30000
  },
  {
    name: 'Electron Build Check',
    command: 'npm run build:check',
    description: 'Verify Electron app can be built',
    timeout: 60000,
    skipInQuick: true
  }
];

async function runTest(test) {
  const startTime = Date.now();
  
  try {
    console.log(`🧪 Running: ${test.name}`);
    console.log(`   ${test.description}`);
    
    if (test.file) {
      // Run vitest for specific file
      execSync(`npx vitest run ${test.file}`, { 
        stdio: 'pipe',
        cwd: process.cwd(),
        timeout: test.timeout || 30000
      });
    } else if (test.command) {
      // Run shell command
      execSync(test.command, { 
        stdio: 'pipe',
        cwd: process.cwd(),
        timeout: test.timeout || 30000
      });
    }
    
    const duration = Date.now() - startTime;
    console.log(`✅ PASSED (${duration}ms)\n`);
    return { success: true, duration, name: test.name };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`❌ FAILED (${duration}ms)`);
    console.log(`   Error: ${error.message}\n`);
    return { success: false, duration, name: test.name, error: error.message };
  }
}

async function runAllTests() {
  const results = [];
  let hasFailures = false;
  
  console.log('📋 RUNNING CORE TESTS');
  console.log('=====================\n');
  
  // Run core tests (always required)
  for (const test of coreTests) {
    const result = await runTest(test);
    results.push(result);
    if (!result.success) {
      hasFailures = true;
      if (test.required) {
        console.log('💥 CRITICAL TEST FAILED - Stopping execution');
        break;
      }
    }
  }
  
  // Run build tests if enabled and core tests passed
  if (ENABLE_BUILD_CHECK && !hasFailures) {
    console.log('📋 RUNNING BUILD VERIFICATION');
    console.log('=============================\n');
    
    for (const test of buildTests) {
      if (QUICK_MODE && test.skipInQuick) {
        console.log(`⏭️  Skipping: ${test.name} (quick mode)`);
        continue;
      }
      
      const result = await runTest(test);
      results.push(result);
      if (!result.success) {
        hasFailures = true;
      }
    }
  }
  
  // Print summary
  console.log('📊 TEST SUMMARY');
  console.log('===============');
  
  const passed = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  passed.forEach(r => console.log(`✅ ${r.name} (${r.duration}ms)`));
  failed.forEach(r => console.log(`❌ ${r.name} (${r.duration}ms) - ${r.error}`));
  
  console.log('');
  
  if (hasFailures) {
    console.log('💥 SOME TESTS FAILED!');
    console.log('🔧 Please fix the issues before committing.');
    process.exit(1);
  } else {
    console.log('🎉 ALL TESTS PASSED!');
    console.log('✨ Your changes are safe to commit.');
    
    if (ENABLE_BUILD_CHECK) {
      console.log('🔨 Build verification also passed.');
    }
  }
  
  return !hasFailures;
}

async function watchMode() {
  console.log('👀 Starting watch mode...');
  console.log('📁 Watching: src/, expo-templates/, scripts/');
  console.log('⌨️  Press Ctrl+C to stop\n');
  
  const chokidar = require('chokidar');
  
  let isRunning = false;
  let pendingRun = false;
  
  const runTests = async () => {
    if (isRunning) {
      pendingRun = true;
      return;
    }
    
    isRunning = true;
    pendingRun = false;
    
    console.log('🔄 Files changed, running tests...\n');
    
    try {
      await runAllTests();
    } catch (error) {
      console.log('💥 Test run failed:', error.message);
    }
    
    isRunning = false;
    
    if (pendingRun) {
      setTimeout(runTests, 1000); // Debounce
    }
    
    console.log('\n👀 Watching for changes...\n');
  };
  
  // Watch for changes
  const watcher = chokidar.watch(['src/**/*', 'expo-templates/**/*', 'scripts/**/*'], {
    ignored: ['**/node_modules/**', '**/.git/**', '**/dist/**'],
    persistent: true,
    ignoreInitial: true
  });
  
  watcher.on('change', runTests);
  watcher.on('add', runTests);
  watcher.on('unlink', runTests);
  
  // Run initial test
  await runTests();
  
  // Keep process alive
  process.on('SIGINT', () => {
    console.log('\n👋 Stopping watch mode...');
    watcher.close();
    process.exit(0);
  });
}

// Main execution
async function main() {
  try {
    if (ENABLE_WATCH_MODE) {
      await watchMode();
    } else {
      await runAllTests();
    }
  } catch (error) {
    console.error('💥 Test runner failed:', error);
    process.exit(1);
  }
}

main();

