/**
 * Test script to check if auto-updater can detect latest version
 * This simulates what the app does on startup
 */

const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

// Initialize logging
log.initialize();
log.transports.console.level = 'info';
log.transports.file.level = 'info';

const logger = log.scope("update-test");

// Get current version from package.json
const packageJson = require('../package.json');
const currentVersion = packageJson.version;

console.log('='.repeat(60));
console.log('Windows OTA Update Test');
console.log('='.repeat(60));
console.log(`Current version: ${currentVersion}`);
console.log(`Repository: Applaa-Builder/Applaa-Builder-v1`);
console.log('='.repeat(60));
console.log('');

// Configure auto-updater (same as in main.ts)
autoUpdater.setFeedURL({
  provider: "github",
  owner: "Applaa-Builder",
  repo: "Applaa-Builder-v1",
});

autoUpdater.allowPrerelease = false;
autoUpdater.channel = "latest";

// Configure logging
autoUpdater.logger = logger;

// Set up event handlers
autoUpdater.on("checking-for-update", () => {
  console.log('✓ Checking for updates...');
});

autoUpdater.on("update-available", (info) => {
  console.log('');
  console.log('='.repeat(60));
  console.log('✓ UPDATE AVAILABLE!');
  console.log('='.repeat(60));
  console.log(`Latest version: ${info.version}`);
  console.log(`Current version: ${currentVersion}`);
  console.log(`Release date: ${info.releaseDate || 'N/A'}`);
  console.log(`Release notes: ${info.releaseNotes || 'N/A'}`);
  console.log('='.repeat(60));
  process.exit(0);
});

autoUpdater.on("update-not-available", (info) => {
  console.log('');
  console.log('='.repeat(60));
  console.log('✓ NO UPDATE AVAILABLE');
  console.log('='.repeat(60));
  console.log(`Current version: ${currentVersion}`);
  console.log(`Latest version: ${info.version || currentVersion}`);
  console.log('You are running the latest version!');
  console.log('='.repeat(60));
  process.exit(0);
});

autoUpdater.on("error", (err) => {
  console.log('');
  console.log('='.repeat(60));
  console.log('✗ ERROR CHECKING FOR UPDATES');
  console.log('='.repeat(60));
  console.error('Error:', err.message);
  console.error('Full error:', err);
  console.log('');
  console.log('Possible causes:');
  console.log('1. No internet connection');
  console.log('2. GitHub API rate limit');
  console.log('3. Repository not found or private');
  console.log('4. No releases available');
  console.log('='.repeat(60));
  process.exit(1);
});

// Check for updates
console.log('Starting update check...');
console.log('');

autoUpdater.checkForUpdates().catch((err) => {
  console.error('Failed to check for updates:', err);
  process.exit(1);
});

// Timeout after 30 seconds
setTimeout(() => {
  console.log('');
  console.log('⚠ Update check timed out after 30 seconds');
  console.log('This might indicate a network issue or GitHub API problem');
  process.exit(1);
}, 30000);
