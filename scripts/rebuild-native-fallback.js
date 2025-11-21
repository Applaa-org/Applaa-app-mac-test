/**
 * Fallback script for rebuilding native modules when primary rebuild fails
 * This handles better-sqlite3 rebuild failures gracefully by:
 * 1. Checking for existing prebuilt binaries
 * 2. Attempting to use prebuilt binaries from npm
 * 3. Gracefully failing if rebuild is not possible
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Native module rebuild fallback handler...');

const betterSqlite3Path = path.join(__dirname, '..', 'node_modules', 'better-sqlite3');

function checkPrebuiltBinary() {
  // Check for prebuilt binary in different possible locations
  const possiblePaths = [
    path.join(betterSqlite3Path, 'build', 'Release', 'better_sqlite3.node'),
    path.join(betterSqlite3Path, 'lib', 'binding', 'node-v' + process.versions.modules + '-' + process.platform + '-' + process.arch, 'better_sqlite3.node'),
  ];
  
  for (const binaryPath of possiblePaths) {
    if (fs.existsSync(binaryPath)) {
      console.log(`✅ Prebuilt binary found at: ${binaryPath}`);
      return true;
    }
  }
  
  return false;
}

function attemptPrebuiltDownload() {
  try {
    console.log('📦 Attempting to use prebuilt binaries...');
    
    // Set environment variables to prefer prebuilt binaries
    process.env.npm_config_build_from_source = 'false';
    process.env.npm_config_better_sqlite3_binary_host_mirror = 'https://github.com/WiseLibs/better-sqlite3/releases/download';
    
    // Try to reinstall with prebuilt binaries
    execSync('npm rebuild better-sqlite3 --build-from-source=false', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
      env: {
        ...process.env,
        npm_config_build_from_source: 'false',
      }
    });
    
    return true;
  } catch (error) {
    console.warn('⚠️  Prebuilt binary download failed:', error.message);
    return false;
  }
}

try {
  // First, check if we already have a working binary
  if (checkPrebuiltBinary()) {
    console.log('✅ Native module binary already exists, skipping rebuild');
    process.exit(0);
  }
  
  // Try to get prebuilt binaries
  if (attemptPrebuiltDownload()) {
    if (checkPrebuiltBinary()) {
      console.log('✅ Successfully obtained prebuilt binary');
      process.exit(0);
    }
  }
  
  // If we get here, rebuild failed but that's okay
  // Electron Forge will handle the rebuild during packaging
  console.warn('⚠️  Native rebuild fallback completed with warnings');
  console.warn('   The app may still work if prebuilt binaries are available at runtime.');
  console.warn('   Electron Forge will attempt rebuild during packaging.');
  
  // Don't fail the build - let Electron Forge handle it
  process.exit(0);
  
} catch (error) {
  console.error('❌ Fallback script error:', error.message);
  console.warn('⚠️  Continuing build - Electron Forge will handle native module rebuild');
  // Don't fail - let the build continue
  process.exit(0);
}

