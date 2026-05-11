#!/usr/bin/env node
/**
 * Generate app icons for all platforms from SVG source.
 * Usage: node scripts/generate-icons.mjs
 */
import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ICONS_DIR = join(__dirname, '..', 'src-tauri', 'icons');
mkdirSync(ICONS_DIR, { recursive: true });

// Professional app icon SVG — flat design, document + translate concept
const SVG_ICON = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#c73937"/>
      <stop offset="100%" style="stop-color:#a02d2b"/>
    </linearGradient>
    <linearGradient id="doc" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#ffffff"/>
      <stop offset="100%" style="stop-color:#f0f0f0"/>
    </linearGradient>
  </defs>

  <!-- Rounded square background -->
  <rect width="1024" height="1024" rx="220" ry="220" fill="url(#bg)"/>

  <!-- Document shape -->
  <rect x="280" y="160" width="464" height="580" rx="32" fill="url(#doc)" opacity="0.95"/>

  <!-- Document fold corner -->
  <path d="M644 160 L744 260 L644 260 Z" fill="#e0e0e0" opacity="0.8"/>

  <!-- Text lines on document -->
  <rect x="340" y="300" width="280" height="18" rx="9" fill="#c73937" opacity="0.7"/>
  <rect x="340" y="340" width="220" height="14" rx="7" fill="#999" opacity="0.4"/>
  <rect x="340" y="370" width="300" height="14" rx="7" fill="#999" opacity="0.4"/>
  <rect x="340" y="400" width="180" height="14" rx="7" fill="#999" opacity="0.4"/>

  <rect x="340" y="450" width="260" height="18" rx="9" fill="#c73937" opacity="0.7"/>
  <rect x="340" y="490" width="300" height="14" rx="7" fill="#999" opacity="0.4"/>
  <rect x="340" y="520" width="240" height="14" rx="7" fill="#999" opacity="0.4"/>
  <rect x="340" y="550" width="280" height="14" rx="7" fill="#999" opacity="0.4"/>
  <rect x="340" y="580" width="160" height="14" rx="7" fill="#999" opacity="0.4"/>

  <!-- Translate arrows circle (bottom right) -->
  <circle cx="680" cy="700" r="120" fill="white" opacity="0.95"/>
  <circle cx="680" cy="700" r="110" fill="#c73937" opacity="0.15"/>

  <!-- Arrow: EN → VN -->
  <text x="640" y="680" font-family="Arial,sans-serif" font-size="42" font-weight="bold" fill="#c73937">EN</text>
  <path d="M660 695 L700 695" stroke="#c73937" stroke-width="6" stroke-linecap="round" marker-end="url(#arrowhead)"/>
  <text x="648" y="730" font-family="Arial,sans-serif" font-size="42" font-weight="bold" fill="#333">VI</text>

  <!-- Small arrow indicator -->
  <path d="M700 688 L718 695 L700 702" fill="none" stroke="#c73937" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>

  <!-- Vietnamese flag accent (small star) -->
  <polygon points="512,810 520,830 542,830 524,842 531,862 512,850 493,862 500,842 482,830 504,830" fill="#FFD700" opacity="0.9"/>
</svg>`;

async function generateIcons() {
  console.log('Generating icons...');

  // Generate master 1024x1024 PNG
  const masterBuffer = await sharp(Buffer.from(SVG_ICON))
    .resize(1024, 1024)
    .png()
    .toBuffer();

  // Tauri v2 required icon sizes
  const sizes = [
    { name: '32x32.png', size: 32 },
    { name: '128x128.png', size: 128 },
    { name: '128x128@2x.png', size: 256 },
    { name: 'icon.png', size: 512 },        // Linux
    { name: 'Square30x30Logo.png', size: 30 },
    { name: 'Square44x44Logo.png', size: 44 },
    { name: 'Square71x71Logo.png', size: 71 },
    { name: 'Square89x89Logo.png', size: 89 },
    { name: 'Square107x107Logo.png', size: 107 },
    { name: 'Square142x142Logo.png', size: 142 },
    { name: 'Square150x150Logo.png', size: 150 },
    { name: 'Square284x284Logo.png', size: 284 },
    { name: 'Square310x310Logo.png', size: 310 },
    { name: 'StoreLogo.png', size: 50 },
  ];

  for (const { name, size } of sizes) {
    const buf = await sharp(masterBuffer).resize(size, size).png().toBuffer();
    const outPath = join(ICONS_DIR, name);
    writeFileSync(outPath, buf);
    console.log(`  ✅ ${name} (${size}x${size})`);
  }

  // Generate ICO (Windows) — multi-size
  const icoSizes = [16, 24, 32, 48, 64, 128, 256];
  const icoPngs = await Promise.all(
    icoSizes.map(s => sharp(masterBuffer).resize(s, s).png().toBuffer())
  );
  const icoBuffer = await pngToIco(icoPngs);
  writeFileSync(join(ICONS_DIR, 'icon.ico'), icoBuffer);
  console.log(`  ✅ icon.ico (multi-size: ${icoSizes.join(',')})`);

  // Save master
  writeFileSync(join(ICONS_DIR, 'icon-master.png'), masterBuffer);
  console.log(`  ✅ icon-master.png (1024x1024)`);

  console.log(`\nAll icons saved to: ${ICONS_DIR}`);
}

generateIcons().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
