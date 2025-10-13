const png2icons = require('png2icons');
const fs = require('fs');
const path = require('path');

async function createMacIcon() {
  const inputPng = path.join(__dirname, '../assets/icon/logo.png');
  const outputIcns = path.join(__dirname, '../assets/icon/logo.icns');

  console.log('Creating macOS icon (.icns)...');

  try {
    const pngBuffer = fs.readFileSync(inputPng);
    const icnsBuffer = png2icons.createICNS(pngBuffer, png2icons.BILINEAR, 0);
    fs.writeFileSync(outputIcns, icnsBuffer);

    console.log('✅ Successfully created logo.icns');
    console.log(`   - ${outputIcns}`);
  } catch (error) {
    console.error('❌ Error creating macOS icon:', error);
    process.exit(1);
  }
}

createMacIcon();



