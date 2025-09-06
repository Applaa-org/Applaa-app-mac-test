#!/usr/bin/env node

/**
 * APPLAA CONTINUOUS TEST RUNNER
 * 
 * Runs core tests continuously to catch breaking changes early.
 * Focuses on critical functionality without build verification.
 * 
 * Usage:
 *   npm run test:continuous    # Run tests every time files change
 *   npm run test:quick         # Run tests once (existing)
 */

const { execSync } = require('child_process');
const chokidar = require('chokidar');
const path = require('path');

console.log('🛡️  APPLAA CONTINUOUS TESTING');
console.log('==============================\n');

let isRunning = false;
let pendingRun = false;
let testCount = 0;

async function runCoreTests() {
  if (isRunning) {
    pendingRun = true;
    return;
  }
  
  isRunning = true;
  pendingRun = false;
  testCount++;
  
  const startTime = Date.now();
  
  console.log(`🧪 Test Run #${testCount} - ${new Date().toLocaleTimeString()}`);
  console.log('================================================\n');
  
  try {
    // Run our existing core tests
    execSync('npm run test:core', { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    const duration = Date.now() - startTime;
    console.log(`\n✅ Tests passed in ${duration}ms`);
    console.log('👀 Watching for changes...\n');
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`\n❌ Tests failed after ${duration}ms`);
    console.log('🔧 Fix the issues and save to re-run tests\n');
  }
  
  isRunning = false;
  
  if (pendingRun) {
    setTimeout(runCoreTests, 1000); // Debounce
  }
}

function startWatching() {
  console.log('👀 Starting file watcher...');
  console.log('📁 Watching: src/, expo-templates/, scripts/');
  console.log('⌨️  Press Ctrl+C to stop\n');
  
  // Watch for changes in critical directories
  const watcher = chokidar.watch([
    'src/**/*.{ts,tsx,js,jsx}',
    'expo-templates/**/*.{ts,tsx,js,jsx,json}',
    'scripts/**/*.js',
    'package.json'
  ], {
    ignored: [
      '**/node_modules/**',
      '**/.git/**',
      '**/dist/**',
      '**/out/**',
      '**/*.test.{ts,tsx,js,jsx}' // Don't trigger on test file changes
    ],
    persistent: true,
    ignoreInitial: true
  });
  
  watcher.on('change', (filePath) => {
    console.log(`📝 Changed: ${path.relative(process.cwd(), filePath)}`);
    runCoreTests();
  });
  
  watcher.on('add', (filePath) => {
    console.log(`➕ Added: ${path.relative(process.cwd(), filePath)}`);
    runCoreTests();
  });
  
  watcher.on('unlink', (filePath) => {
    console.log(`➖ Deleted: ${path.relative(process.cwd(), filePath)}`);
    runCoreTests();
  });
  
  // Run initial test
  runCoreTests();
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n👋 Stopping continuous testing...');
    watcher.close();
    process.exit(0);
  });
}

// Start watching
startWatching();

