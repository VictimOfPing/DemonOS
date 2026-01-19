/**
 * Icon Generator Script
 * 
 * This script generates PNG icons from the SVG source.
 * Run: npm run generate-icons
 * 
 * Prerequisites: npm install sharp
 */

const fs = require('fs');
const path = require('path');

// Check if sharp is available
let sharp;
try {
  sharp = require('sharp');
} catch {
  console.log('Sharp is not installed. Install it with: npm install sharp --save-dev');
  console.log('Then run: npm run generate-icons');
  process.exit(0);
}

const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const INPUT_SVG = path.join(__dirname, '../public/icons/icon.svg');
const INPUT_MASKABLE_SVG = path.join(__dirname, '../public/icons/icon-maskable.svg');
const OUTPUT_DIR = path.join(__dirname, '../public/icons');

async function generateIcons() {
  console.log('🎨 Generating PWA icons...\n');

  // Generate regular icons
  for (const size of ICON_SIZES) {
    const outputPath = path.join(OUTPUT_DIR, `icon-${size}.png`);
    await sharp(INPUT_SVG)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`✅ Generated icon-${size}.png`);
  }

  // Generate maskable icons (192 and 512 are most important)
  for (const size of [192, 512]) {
    const outputPath = path.join(OUTPUT_DIR, `icon-maskable-${size}.png`);
    await sharp(INPUT_MASKABLE_SVG)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`✅ Generated icon-maskable-${size}.png`);
  }

  // Generate favicon
  const faviconSvg = path.join(__dirname, '../public/favicon.svg');
  const faviconIco = path.join(__dirname, '../public/favicon.ico');
  
  await sharp(faviconSvg)
    .resize(32, 32)
    .png()
    .toFile(path.join(__dirname, '../public/favicon-32.png'));
  console.log(`✅ Generated favicon-32.png`);

  // Generate apple-touch-icon
  await sharp(INPUT_SVG)
    .resize(180, 180)
    .png()
    .toFile(path.join(__dirname, '../public/apple-touch-icon.png'));
  console.log(`✅ Generated apple-touch-icon.png`);

  console.log('\n🎉 All icons generated successfully!');
  console.log('\nNote: For favicon.ico, you can use an online converter or the png2ico tool.');
}

generateIcons().catch(console.error);
