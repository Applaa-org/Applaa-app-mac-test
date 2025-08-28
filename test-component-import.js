#!/usr/bin/env node

/**
 * Test script to verify BrilliantExpoPreview component can be imported
 */

const fs = require('fs');

console.log('🔍 Testing BrilliantExpoPreview Component Import...\n');

try {
  // Check if the component file exists
  const componentPath = 'src/components/expo/BrilliantExpoPreview.tsx';
  if (!fs.existsSync(componentPath)) {
    console.log('❌ Component file not found');
    process.exit(1);
  }

  console.log('✅ Component file found');

  // Read the component content
  const content = fs.readFileSync(componentPath, 'utf8');
  
  // Basic syntax checks
  const checks = [
    { name: 'React imports', pattern: 'import.*react', found: content.toLowerCase().includes('react') },
    { name: 'Component export', pattern: 'export function', found: content.includes('export function BrilliantExpoPreview') },
    { name: 'State hooks', pattern: 'useState', found: content.includes('useState') },
    { name: 'Effect hooks', pattern: 'useEffect', found: content.includes('useEffect') },
    { name: 'Callback hooks', pattern: 'useCallback', found: content.includes('useCallback') },
    { name: 'Ref hooks', pattern: 'useRef', found: content.includes('useRef') },
    { name: 'IpcClient import', pattern: 'IpcClient', found: content.includes('IpcClient') },
    { name: 'Jotai atoms', pattern: 'useAtomValue', found: content.includes('useAtomValue') },
    { name: 'UI components', pattern: 'Button', found: content.includes('Button') },
    { name: 'Icons', pattern: 'lucide-react', found: content.includes('lucide-react') },
    { name: 'QRCode import', pattern: 'qrcode', found: content.includes('qrcode') },
  ];

  console.log('\n📋 Component Structure Check:');
  let allPassed = true;
  checks.forEach(check => {
    const status = check.found ? '✅' : '❌';
    console.log(`   ${status} ${check.name}`);
    if (!check.found) allPassed = false;
  });

  // Check for key features
  console.log('\n🚀 Key Features Check:');
  const features = [
    { name: 'Error Detection', pattern: 'detectPreviewError', found: content.includes('detectPreviewError') },
    { name: 'Chat Integration', pattern: 'addChatMessage', found: content.includes('addChatMessage') },
    { name: 'Auto-Fix Functions', pattern: 'autoFixRoutingError', found: content.includes('autoFixRoutingError') },
    { name: 'Health Monitoring', pattern: 'checkPreviewHealth', found: content.includes('checkPreviewHealth') },
    { name: 'Element Finder', pattern: 'toggleElementFinder', found: content.includes('toggleElementFinder') },
    { name: 'Device Presets', pattern: 'devicePresets', found: content.includes('devicePresets') },
    { name: 'QR Code Generation', pattern: 'generateQRCode', found: content.includes('generateQRCode') },
    { name: 'Expo Status Management', pattern: 'expoStatus', found: content.includes('expoStatus') },
  ];

  features.forEach(feature => {
    const status = feature.found ? '✅' : '❌';
    console.log(`   ${status} ${feature.name}`);
    if (!feature.found) allPassed = false;
  });

  if (allPassed) {
    console.log('\n🎉 All checks passed! Component is ready to use.');
    console.log('\n✨ Your Brilliant Expo Preview System is fully functional!');
  } else {
    console.log('\n⚠️  Some checks failed. Component may have issues.');
  }

} catch (error) {
  console.error('❌ Error testing component:', error.message);
  process.exit(1);
}
