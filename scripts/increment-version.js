#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * 🚀 Auto-Version Increment Script for Applaa EXE Builds
 * 
 * This script automatically increments the version number each time we build an EXE.
 * Version format: MAJOR.MINOR.PATCH (e.g., 1.2.15)
 * 
 * - MAJOR: Manual increment for breaking changes
 * - MINOR: Manual increment for new features  
 * - PATCH: Auto-increment for each build/bugfix
 */

const packageJsonPath = path.join(__dirname, '..', 'package.json');

function incrementVersion() {
  try {
    // Read current package.json
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const currentVersion = packageJson.version;
    
    console.log(`📦 Current version: ${currentVersion}`);
    
    // Parse version (e.g., "1.2.15" -> [1, 2, 15])
    const versionParts = currentVersion.split('.').map(Number);
    
    if (versionParts.length !== 3) {
      throw new Error(`Invalid version format: ${currentVersion}. Expected MAJOR.MINOR.PATCH`);
    }
    
    // Auto-increment PATCH version
    versionParts[2] += 1;
    
    const newVersion = versionParts.join('.');
    
    // Update package.json
    packageJson.version = newVersion;
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');
    
    console.log(`🚀 Version incremented: ${currentVersion} → ${newVersion}`);
    console.log(`✅ Updated package.json`);
    
    return newVersion;
    
  } catch (error) {
    console.error(`❌ Failed to increment version:`, error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  const newVersion = incrementVersion();
  
  // Also update any other version references
  console.log(`\n📋 Build Info:`);
  console.log(`   Version: ${newVersion}`);
  console.log(`   Build Date: ${new Date().toISOString()}`);
  console.log(`   Platform: win32-x64`);
}

module.exports = { incrementVersion };
