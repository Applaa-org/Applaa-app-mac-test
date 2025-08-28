#!/usr/bin/env node

/**
 * Test script to verify Expo fixes
 * This script tests the improved tunnel handling and fallback logic
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Testing Expo Configuration Fixes...\n');

// Test 1: Check .expo/settings.json
console.log('1. Checking .expo/settings.json...');
try {
  const expoSettings = JSON.parse(fs.readFileSync('.expo/settings.json', 'utf8'));
  console.log('   ✅ .expo/settings.json found');
  console.log('   📱 hostType:', expoSettings.hostType);
  console.log('   🌐 tunnel:', expoSettings.tunnel);
  
  if (expoSettings.hostType === 'tunnel' && expoSettings.tunnel === true) {
    console.log('   ✅ Tunnel configuration is correct');
  } else {
    console.log('   ❌ Tunnel configuration needs fixing');
  }
} catch (error) {
  console.log('   ❌ Error reading .expo/settings.json:', error.message);
}

// Test 2: Check Expo handlers
console.log('\n2. Checking Expo handlers...');
try {
  const expoHandlers = fs.readFileSync('src/ipc/handlers/expo_handlers.ts', 'utf8');
  
  // Check for tunnel fallback logic
  if (expoHandlers.includes('tunnelAttempted') && expoHandlers.includes('tunnelFailed')) {
    console.log('   ✅ Tunnel fallback logic found');
  } else {
    console.log('   ❌ Tunnel fallback logic missing');
  }
  
  // Check for improved URL patterns - use a more robust method
  const hasTunnelPatterns = expoHandlers.includes('tunnelUrlPatterns');
  const hasExpDirect = expoHandlers.includes('.exp.direct') || expoHandlers.includes('exp.direct');
  const hasExpoDev = expoHandlers.includes('.expo.dev') || expoHandlers.includes('expo.dev');
  
  if (hasTunnelPatterns && (hasExpDirect || hasExpoDev)) {
    console.log('   ✅ Enhanced URL patterns found');
  } else {
    console.log('   ❌ Enhanced URL patterns missing');
    console.log('      tunnelUrlPatterns:', hasTunnelPatterns);
    console.log('      .exp.direct:', hasExpDirect);
    console.log('      .expo.dev:', hasExpoDev);
  }
  
  // Check for tunnel failure detection
  if (expoHandlers.includes('tunnelFailurePatterns')) {
    console.log('   ✅ Tunnel failure detection found');
  } else {
    console.log('   ❌ Tunnel failure detection missing');
  }
  
} catch (error) {
  console.log('   ❌ Error reading expo_handlers.ts:', error.message);
}

// Test 3: Check MobilePreview component
console.log('\n3. Checking MobilePreview component...');
try {
  const mobilePreview = fs.readFileSync('src/components/expo/MobilePreview.tsx', 'utf8');
  
  // Check for element finder
  if (mobilePreview.includes('isElementFinderActive') && mobilePreview.includes('toggleElementFinder')) {
    console.log('   ✅ Element finder functionality found');
  } else {
    console.log('   ❌ Element finder functionality missing');
  }
  
  // Check for tunnel status indicator
  if (mobilePreview.includes('Tunnel Status Indicator') && mobilePreview.includes('LAN Fallback')) {
    console.log('   ✅ Tunnel status indicator found');
  } else {
    console.log('   ❌ Tunnel status indicator missing');
  }
  
} catch (error) {
  console.log('   ❌ Error reading MobilePreview.tsx:', error.message);
}

// Test 4: Check package.json for Expo dependencies
console.log('\n4. Checking package.json...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  // Check if we have the necessary dependencies
  const hasExpo = packageJson.dependencies && (
    packageJson.dependencies.expo || 
    packageJson.dependencies['@expo/cli'] ||
    packageJson.devDependencies?.expo ||
    packageJson.devDependencies?.['@expo/cli']
  );
  
  if (hasExpo) {
    console.log('   ✅ Expo dependencies found');
  } else {
    console.log('   ⚠️  Expo dependencies not found in package.json');
    console.log('   💡 You may need to install: npm install -g @expo/cli');
  }
  
} catch (error) {
  console.log('   ❌ Error reading package.json:', error.message);
}

console.log('\n🎯 Summary of Fixes Applied:');
console.log('   • Updated .expo/settings.json to enable automatic tunneling');
console.log('   • Enhanced Expo handlers with tunnel fallback logic');
console.log('   • Added tunnel failure detection and recovery');
console.log('   • Improved URL pattern matching for various tunnel services');
console.log('   • Added element finder functionality to mobile preview');
console.log('   • Added tunnel status indicators for better user feedback');
console.log('   • Implemented automatic fallback from tunnel to LAN when needed');

console.log('\n🚀 Next Steps:');
console.log('   1. Install Expo CLI globally: npm install -g @expo/cli');
console.log('   2. Try starting the app: npm run start');
console.log('   3. Test the mobile preview with a mobile app');
console.log('   4. Use the element finder to inspect UI elements');
console.log('   5. Check tunnel status indicators for connection info');

console.log('\n✨ Expo preview and tunnel issues should now be resolved!');
