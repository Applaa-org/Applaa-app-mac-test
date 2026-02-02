const { Jimp } = require('jimp');
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
    // Step 1: Resize to 256x256 (ICO standard size), contain to fit
    console.log('Step 1: Converting to PNG at 256x256...');
    const image = await Jimp.read(inputJpeg);
    image.contain({ w: 256, h: 256 });
    await image.write(tempPng);
    await image.write(outputPng);

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

