import sharp from 'sharp';

// Portfolio mark: full-bleed gradient cubes (matches src/components/Logo.tsx geometry:
// size 14, gap 4, rx 2.5, gradient #7c3aed -> #a78bfa, opacity falloff 1/0.7/0.5/0.3).
// Black backdrop: platforms composite transparent manifest icons onto white in
// install prompts / home-screen tiles; an opaque black base renders identically everywhere.
const mark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#7c3aed"/>
      <stop offset="100%" stop-color="#a78bfa"/>
    </linearGradient>
  </defs>
  <rect width="32" height="32" fill="#000000"/>
  <rect x="0"  y="0"  width="14" height="14" rx="2.5" fill="url(#g)" opacity="1"/>
  <rect x="18" y="0"  width="14" height="14" rx="2.5" fill="url(#g)" opacity="0.7"/>
  <rect x="0"  y="18" width="14" height="14" rx="2.5" fill="url(#g)" opacity="0.5"/>
  <rect x="18" y="18" width="14" height="14" rx="2.5" fill="url(#g)" opacity="0.3"/>
</svg>`;

await sharp(Buffer.from(mark), { density: 720 }).resize(192, 192).png().toFile('public/icons/icon-192.png');
await sharp(Buffer.from(mark), { density: 720 }).resize(512, 512).png().toFile('public/icons/icon-512.png');
await sharp(Buffer.from(mark), { density: 720 }).resize(180, 180).png().toFile('public/icons/apple-touch-icon.png');
// iOS probes /apple-touch-icon.png at the domain ROOT (ignores the manifest);
// a 404 makes it fall back to a screenshot of the page.
await sharp(Buffer.from(mark), { density: 720 }).resize(180, 180).png().toFile('public/apple-touch-icon.png');
console.log('icons ok');
