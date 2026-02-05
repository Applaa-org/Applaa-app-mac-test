/**
 * Safe native module rebuild script for Windows
 * Attempts to rebuild better-sqlite3, but gracefully handles failures
 * when Visual Studio Build Tools are not available
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Attempting to rebuild native modules...');

const betterSqlite3Path = path.join(__dirname, '..', 'node_modules', 'better-sqlite3');

function checkPrebuiltBinary() {
  try {
    if (!fs.existsSync(betterSqlite3Path)) {
      return false;
    }
    
    // Check for the compiled binary
    const buildPath = path.join(betterSqlite3Path, 'build', 'Release');
    if (fs.existsSync(buildPath)) {
      const files = fs.readdirSync(buildPath);
      const hasBinary = files.some(file => 
        file.endsWith('.node') || 
        file.endsWith('.dll') || 
        file.endsWith('.so') || 
        file.endsWith('.dylib')
      );
      if (hasBinary) {
        console.log('✅ Prebuilt binary already exists');
        return true;
      }
    }
  } catch (error) {
    // Ignore errors when checking
  }
  return false;
}

try {
  // Check if binary already exists
  if (checkPrebuiltBinary()) {
    console.log('✅ Native module binary already exists, skipping rebuild');
    process.exit(0);
  }

  // Try to rebuild better-sqlite3 only
  // Use --only=better-sqlite3 to ensure we only rebuild that module
  console.log('📦 Rebuilding better-sqlite3 for Electron...');
  try {
    // First, try with --only flag to be more specific
    execSync('npx electron-rebuild --only=better-sqlite3 --force', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
      env: {
        ...process.env,
        // Prefer prebuilt binaries if available
        npm_config_build_from_source: 'false',
      }
    });
    console.log('✅ Native module rebuild successful');
    process.exit(0);
  } catch (rebuildError) {
    // If --only doesn't work, try the old method
    try {
      console.log('📦 Trying alternative rebuild method...');
      execSync('npx electron-rebuild -f -w better-sqlite3', {
        stdio: 'pipe', // Use pipe to suppress output on failure
        cwd: path.join(__dirname, '..'),
        env: {
          ...process.env,
          npm_config_build_from_source: 'false',
        }
      });
      console.log('✅ Native module rebuild successful');
      process.exit(0);
    } catch (rebuildError2) {
      // Rebuild failed - this is okay, we'll use prebuilt binaries
      console.warn('⚠️  Native rebuild failed (this is okay if Visual Studio Build Tools are not installed)');
      console.warn('   The app will attempt to use prebuilt binaries from npm.');
      console.warn('   If you encounter runtime errors, install Visual Studio Build Tools:');
      console.warn('   https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022');
      console.warn('   Or install Visual Studio with "Desktop development with C++" workload');
      
      // Try to use prebuilt binaries
      try {
        console.log('📦 Attempting to use prebuilt binaries...');
        execSync('npm rebuild better-sqlite3 --build-from-source=false', {
          stdio: 'pipe',
          cwd: path.join(__dirname, '..'),
          env: {
            ...process.env,
            npm_config_build_from_source: 'false',
          }
        });
        if (checkPrebuiltBinary()) {
          console.log('✅ Successfully obtained prebuilt binary');
          process.exit(0);
        }
      } catch (prebuiltError) {
        // That's okay too - Electron Forge will handle it during packaging
        console.warn('⚠️  Prebuilt binary download also failed, but this is non-critical');
      }
      
      // Don't fail the install - continue
      console.log('✅ Continuing installation (native modules will be handled during packaging)');
      process.exit(0);
    }
  }
} catch (error) {
  console.warn('⚠️  Unexpected error in rebuild script:', error.message);
  console.warn('   Continuing installation - native modules will be handled during packaging');
  // Don't fail - let npm install continue
  process.exit(0);
}
