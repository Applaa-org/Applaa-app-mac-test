#!/usr/bin/env node

/**
 * 🚀 UNIFIED PREVIEW SYSTEM SIMPLE TEST
 * 
 * Simple test to verify the Quest-inspired preview system integration
 */

console.log('🚀 Testing Unified Preview System Integration...\n');

// Test 1: Check if main files exist
const fs = require('fs');
const path = require('path');

const requiredFiles = [
  'src/preview/UnifiedPreviewManager.ts',
  'src/preview/ResourceManager.ts',
  'src/preview/AppLifecycleManager.ts',
  'src/preview/PerformanceMonitor.ts',
  'src/preview/SmartCacheManager.ts',
  'src/preview/PreviewControlPlane.ts',
  'src/preview/MigrationAdapter.ts',
  'src/preview/types.ts',
  'src/preview/types-simple.ts',
  'src/ipc/handlers/unified_preview_manager_handlers.ts',
  'src/ipc/handlers/process_monitor_handlers.ts'
];

console.log('📁 Checking required files...');
let missingFiles = [];

for (const file of requiredFiles) {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    missingFiles.push(file);
  }
}

// Test 2: Check IPC registration
console.log('\n🔌 Checking IPC registration...');
const ipcHostContent = fs.readFileSync('src/ipc/ipc_host.ts', 'utf8');

if (ipcHostContent.includes('registerUnifiedPreviewManagerHandlers')) {
  console.log('✅ UnifiedPreviewManager handlers registered');
} else {
  console.log('❌ UnifiedPreviewManager handlers NOT registered');
  missingFiles.push('UnifiedPreviewManager IPC registration');
}

if (ipcHostContent.includes('registerProcessMonitorHandlers')) {
  console.log('✅ ProcessMonitor handlers registered');
} else {
  console.log('❌ ProcessMonitor handlers NOT registered');
  missingFiles.push('ProcessMonitor IPC registration');
}

// Test 3: Check IPC client methods
console.log('\n📡 Checking IPC client methods...');
const ipcClientContent = fs.readFileSync('src/ipc/ipc_client.ts', 'utf8');

const requiredMethods = [
  'unifiedPreviewInitialize',
  'unifiedPreviewStart',
  'unifiedPreviewStop',
  'getProcessStats',
  'emergencyKillAllProcesses'
];

for (const method of requiredMethods) {
  if (ipcClientContent.includes(method)) {
    console.log(`✅ ${method} method exists`);
  } else {
    console.log(`❌ ${method} method MISSING`);
    missingFiles.push(`IPC client method: ${method}`);
  }
}

// Test 4: Check for duplicate imports
console.log('\n🔍 Checking for duplicate imports...');
const unifiedManagerContent = fs.readFileSync('src/preview/UnifiedPreviewManager.ts', 'utf8');
const resourceManagerImports = (unifiedManagerContent.match(/import.*ResourceManager/g) || []).length;

if (resourceManagerImports === 1) {
  console.log('✅ ResourceManager import is clean (no duplicates)');
} else {
  console.log(`❌ ResourceManager has ${resourceManagerImports} imports (should be 1)`);
  missingFiles.push('Duplicate ResourceManager imports');
}

// Test 5: Check type definitions
console.log('\n📝 Checking type definitions...');
const typesContent = fs.readFileSync('src/preview/types.ts', 'utf8');

const requiredTypes = [
  'ResourceUsage',
  'SystemResources', 
  'ResourceThresholds',
  'AppLifecycleConfig'
];

for (const type of requiredTypes) {
  if (typesContent.includes(`interface ${type}`) || typesContent.includes(`type ${type}`)) {
    console.log(`✅ ${type} type exists`);
  } else {
    console.log(`❌ ${type} type MISSING`);
    missingFiles.push(`Type definition: ${type}`);
  }
}

// Summary
console.log('\n📊 TEST SUMMARY');
console.log('================');

if (missingFiles.length === 0) {
  console.log('🎉 All checks passed! The unified preview system integration looks good.');
  console.log('\n🚀 NEXT STEPS:');
  console.log('1. Test with actual Expo and React apps');
  console.log('2. Verify performance monitoring works');
  console.log('3. Test resource management and suspension');
  console.log('4. Verify backward compatibility with existing apps');
  console.log('\n✨ The Quest-inspired preview system is ready for testing!');
} else {
  console.log(`❌ Found ${missingFiles.length} issues:`);
  missingFiles.forEach((issue, index) => {
    console.log(`   ${index + 1}. ${issue}`);
  });
  console.log('\n⚠️  Please fix these issues before proceeding.');
  process.exit(1);
}



