#!/usr/bin/env node
/**
 * SnapAI Icon Apply Script
 * Finds the latest generated icon and applies it to the Expo app
 */

const fs = require('fs');
const path = require('path');

const GENERATED_DIR = path.join(__dirname, '../../assets/icons/generated');
const TARGET_ICON = path.join(__dirname, '../../assets/icon.png');
const APP_CONFIG = path.join(__dirname, '../../app.json');

async function applyIcon() {
  try {
    // Check if generated icons directory exists
    if (!fs.existsSync(GENERATED_DIR)) {
      console.log('❌ No generated icons found. Run "npm run icon:gen" first.');
      return;
    }

    // Find the latest generated icon
    const files = fs.readdirSync(GENERATED_DIR)
      .filter(file => file.endsWith('.png'))
      .map(file => ({
        name: file,
        path: path.join(GENERATED_DIR, file),
        mtime: fs.statSync(path.join(GENERATED_DIR, file)).mtime
      }))
      .sort((a, b) => b.mtime - a.mtime);

    if (files.length === 0) {
      console.log('❌ No PNG icons found in generated directory.');
      return;
    }

    const latestIcon = files[0];
    console.log(`📋 Found latest icon: ${latestIcon.name}`);

    // Copy the icon to assets/icon.png
    fs.copyFileSync(latestIcon.path, TARGET_ICON);
    console.log(`✅ Icon applied to assets/icon.png`);

    // Update app.json if it exists
    if (fs.existsSync(APP_CONFIG)) {
      try {
        const appConfig = JSON.parse(fs.readFileSync(APP_CONFIG, 'utf8'));
        if (appConfig.expo) {
          appConfig.expo.icon = './assets/icon.png';
          fs.writeFileSync(APP_CONFIG, JSON.stringify(appConfig, null, 2));
          console.log(`✅ Updated app.json icon reference`);
        }
      } catch (error) {
        console.log(`⚠️  Could not update app.json: ${error.message}`);
      }
    }

    console.log(`🎉 Icon successfully applied! Restart your development server to see changes.`);

  } catch (error) {
    console.error(`❌ Error applying icon: ${error.message}`);
    process.exit(1);
  }
}

applyIcon();
