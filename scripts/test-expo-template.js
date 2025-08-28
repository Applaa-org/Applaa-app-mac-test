const fs = require('fs');
const path = require('path');

// Test if our Expo template exists and has the right structure
const templatePath = path.join(process.cwd(), 'expo-templates', 'expo-router-tabs');

console.log('🔍 Testing Expo Template System...');
console.log(`Template path: ${templatePath}`);

if (!fs.existsSync(templatePath)) {
  console.error('❌ Template directory does not exist!');
  process.exit(1);
}

// Check required files
const requiredFiles = [
  'app.json',
  'package.json',
  'babel.config.js',
  'tsconfig.json',
  'app/_layout.tsx',
  'app/(tabs)/_layout.tsx',
  'app/(tabs)/index.tsx'
];

let allFilesExist = true;
for (const file of requiredFiles) {
  const filePath = path.join(templatePath, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file} exists`);
  } else {
    console.error(`❌ ${file} missing`);
    allFilesExist = false;
  }
}

if (allFilesExist) {
  console.log('🎉 All template files exist!');
  
  // Check app.json structure
  const appJsonPath = path.join(templatePath, 'app.json');
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  
  if (appJson.expo && appJson.expo.plugins && appJson.expo.plugins.includes('expo-router')) {
    console.log('✅ app.json has proper Expo Router configuration');
  } else {
    console.error('❌ app.json missing proper Expo Router configuration');
  }
  
  console.log('🚀 Template system is ready!');
} else {
  console.error('💥 Template system has missing files!');
  process.exit(1);
}

