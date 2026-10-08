import sharp from 'sharp';

const padded = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="#ffffff"/>
  <rect x="4" y="4" width="11" height="11" rx="2" fill="#7c3aed"/>
  <rect x="17" y="4" width="11" height="11" rx="2" fill="#7c3aed" opacity="0.7"/>
  <rect x="4" y="17" width="11" height="11" rx="2" fill="#7c3aed" opacity="0.5"/>
  <rect x="17" y="17" width="11" height="11" rx="2" fill="#7c3aed" opacity="0.3"/>
</svg>`
);

await sharp(padded, { density: 300 }).resize(192, 192).png().toFile('public/icons/icon-192.png');
await sharp(padded, { density: 300 }).resize(512, 512).png().toFile('public/icons/icon-512.png');
await sharp(padded, { density: 300 }).resize(180, 180).png().toFile('public/icons/apple-touch-icon.png');
console.log('icons ok');
