const sharp = require('sharp');
const pngToIco = require('png-to-ico').default || require('png-to-ico');
const fs = require('fs');
const path = require('path');

async function convertLogoToIco() {
  // Use the unified logo asset as the single source of truth
  const inputJpeg = path.join(__dirname, '../assets/logo.png');
  const tempPng = path.join(__dirname, '../assets/icon/temp-logo.png');
  const outputIco = path.join(__dirname, '../assets/icon/logo.ico');
  const outputPng = path.join(__dirname, '../assets/icon/logo.png');

  console.log('Converting new logo to ICO format...');

  try {
    // Step 1: Convert JPEG to PNG at 256x256 (ICO standard size)
    console.log('Step 1: Converting JPEG to PNG...');
    await sharp(inputJpeg)
      .resize(256, 256, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(tempPng);

    // Also save as logo.png for other uses
    await sharp(inputJpeg)
      .resize(256, 256, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(outputPng);

    console.log('Step 2: Converting PNG to ICO...');
    // Step 2: Convert PNG to ICO
    const icoBuffer = await pngToIco(tempPng);
    fs.writeFileSync(outputIco, icoBuffer);

    // Clean up temp file
    fs.unlinkSync(tempPng);

    console.log('✅ Successfully created logo.ico and logo.png');
    console.log(`   - ${outputIco}`);
    console.log(`   - ${outputPng}`);
  } catch (error) {
    console.error('❌ Error converting logo:', error);
    process.exit(1);
  }
}

convertLogoToIco();

