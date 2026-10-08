// One-off: regenerate public/favicon.ico from the portfolio-style violet cubes mark.
// Usage: node scripts/gen-favicon-ico.mjs
import sharp from 'sharp';
import { writeFileSync } from 'node:fs';

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#7c3aed"/>
      <stop offset="100%" stop-color="#a78bfa"/>
    </linearGradient>
  </defs>
  <rect x="0"  y="0"  width="14" height="14" rx="2.5" fill="url(#g)" opacity="1"/>
  <rect x="18" y="0"  width="14" height="14" rx="2.5" fill="url(#g)" opacity="0.7"/>
  <rect x="0"  y="18" width="14" height="14" rx="2.5" fill="url(#g)" opacity="0.5"/>
  <rect x="18" y="18" width="14" height="14" rx="2.5" fill="url(#g)" opacity="0.3"/>
</svg>`;

const sizes = [16, 32, 48, 64];
const frames = [];
for (const size of sizes) {
  const png = await sharp(Buffer.from(SVG), { density: (72 * size) / 32 })
    .resize(size, size)
    .png()
    .toBuffer();
  frames.push({ size, png });
}

// ICO container with PNG-compressed frames (same format as the previous file).
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(frames.length, 4);

let offset = 6 + frames.length * 16;
const entries = [];
for (const { size, png } of frames) {
  const entry = Buffer.alloc(16);
  entry[0] = size >= 256 ? 0 : size; // width (0 = 256)
  entry[1] = size >= 256 ? 0 : size; // height
  entry.writeUInt16LE(1, 4); // planes
  entry.writeUInt16LE(32, 6); // bit count
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(offset, 12);
  entries.push(entry);
  offset += png.length;
}

writeFileSync(
  new URL('../public/favicon.ico', import.meta.url),
  Buffer.concat([header, ...entries, ...frames.map((f) => f.png)])
);
console.log(`favicon.ico written: ${frames.map((f) => f.size).join('/')} PNG frames`);
