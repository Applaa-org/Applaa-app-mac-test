/**
 * Diagnostic script to check user settings file and identify issues
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Determine settings path (same logic as settings.ts)
const isPackaged = process.resourcesPath && !process.defaultApp;
const SETTINGS_FILE = isPackaged ? "user-settings-packaged.json" : "user-settings.json";

function getUserDataPath() {
  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'Applaa');
  } else if (process.platform === 'win32') {
    return path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'Applaa');
  } else {
    return path.join(os.homedir(), '.config', 'Applaa');
  }
}

const settingsPath = path.join(getUserDataPath(), SETTINGS_FILE);

console.log('🔍 Applaa Settings Diagnostics\n');
console.log(`Platform: ${process.platform}`);
console.log(`Settings file: ${SETTINGS_FILE}`);
console.log(`Settings path: ${settingsPath}\n`);

// Check if file exists
if (!fs.existsSync(settingsPath)) {
  console.log('❌ Settings file does not exist!');
  console.log('This is normal for first-time users.\n');
  process.exit(0);
}

// Read and parse settings
try {
  const rawData = fs.readFileSync(settingsPath, 'utf-8');
  const settings = JSON.parse(rawData);
  
  console.log('✅ Settings file exists and is valid JSON\n');
  
  // Check selected model
  console.log('📱 Selected Model:');
  if (settings.selectedModel) {
    console.log(`   Provider: ${settings.selectedModel.provider}`);
    console.log(`   Model: ${settings.selectedModel.name}`);
  } else {
    console.log('   ❌ No selected model found!');
  }
  
  // Check provider settings
  console.log('\n🔑 Provider API Keys:');
  if (settings.providerSettings) {
    const providers = Object.keys(settings.providerSettings);
    if (providers.length === 0) {
      console.log('   ℹ️  No providers configured');
    } else {
      providers.forEach(providerId => {
        const providerSettings = settings.providerSettings[providerId];
        console.log(`\n   Provider: ${providerId}`);
        
        if (providerSettings.apiKey) {
          console.log(`      ✅ Has API key`);
          console.log(`      Encryption: ${providerSettings.apiKey.encryptionType || 'none'}`);
          console.log(`      Value length: ${providerSettings.apiKey.value?.length || 0} chars`);
          console.log(`      Value starts: ${providerSettings.apiKey.value?.substring(0, 10)}...`);
          
          // Check for corrupted values
          if (providerSettings.apiKey.value && providerSettings.apiKey.value.includes('[object')) {
            console.log(`      ⚠️  WARNING: API key appears corrupted (contains "[object")`);
          }
          if (providerSettings.apiKey.value && providerSettings.apiKey.value === 'undefined') {
            console.log(`      ⚠️  WARNING: API key is string "undefined"`);
          }
        } else {
          console.log(`      ℹ️  No API key set`);
        }
        
        if (providerSettings.resourceName) {
          console.log(`      ✅ Has resource name: ${providerSettings.resourceName.value}`);
        }
      });
    }
  } else {
    console.log('   ❌ No providerSettings object found!');
  }
  
  // Check other settings
  console.log('\n⚙️  Other Settings:');
  console.log(`   Applaa Pro enabled: ${settings.enableApplaaPro || false}`);
  console.log(`   Auto-approve changes: ${settings.autoApproveChanges ?? true}`);
  console.log(`   Selected platform: ${settings.selectedPlatform || 'web'}`);
  console.log(`   Selected template: ${settings.selectedTemplateId || 'unknown'}`);
  
  console.log('\n✅ Diagnostics complete!');
  
} catch (error) {
  console.log('❌ Error reading settings file:');
  console.error(error.message);
  process.exit(1);
}

