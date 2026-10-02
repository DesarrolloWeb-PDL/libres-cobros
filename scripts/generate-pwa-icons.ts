import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const ICONS_DIR = path.resolve(process.cwd(), 'public', 'icons');

const svgSource = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="96" ry="96" fill="#7c3aed"/>
  <text x="256" y="330" font-family="Arial, Helvetica, sans-serif" font-size="240" font-weight="bold" fill="white" text-anchor="middle">LC</text>
</svg>
`;

async function generateIcons() {
  if (!fs.existsSync(ICONS_DIR)) {
    fs.mkdirSync(ICONS_DIR, { recursive: true });
  }

  const svgBuffer = Buffer.from(svgSource);

  const sizes = [
    { name: 'icon-192.png', size: 192 },
    { name: 'icon-512.png', size: 512 },
    { name: 'apple-touch-icon.png', size: 180 },
  ];

  for (const { name, size } of sizes) {
    const outputPath = path.join(ICONS_DIR, name);
    await sharp(svgBuffer, { density: 300 })
      .resize(size, size, { fit: 'contain', background: { r: 124, g: 58, b: 237, alpha: 1 } })
      .png()
      .toFile(outputPath);
    console.log(`Generated ${outputPath}`);
  }
}

generateIcons().catch((error) => {
  console.error('Failed to generate PWA icons:', error);
  process.exit(1);
});
