'use client';

/**
 * Keeps the browser/PWA title-bar color in sync with the active day/night theme.
 * Light mode uses the current --primary (Super Admin / institution accent).
 * Dark mode uses the dark surface color.
 */
export function updateMetaThemeColor() {
  if (typeof document === 'undefined') return;

  const isDark = document.documentElement.classList.contains('dark');
  let color = '#0a0a0a';

  if (!isDark) {
    const primary =
      getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() ||
      getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    color = primary || '#7c3aed';
  }

  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', color);
}

/**
 * Recolors the four-cubes app icon (favicon) to match the active brand color.
 */
export function setCubesFavicon(color: string) {
  if (typeof document === 'undefined' || !color) return;

  const opacitySteps = [1, 0.7, 0.5, 0.3];
  const size = 14;
  const gap = 4;
  const rects = [
    { x: 0, y: 0 },
    { x: size + gap, y: 0 },
    { x: 0, y: size + gap },
    { x: size + gap, y: size + gap },
  ]
    .map(
      ({ x, y }, i) =>
        `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="3" fill="${color}" opacity="${opacitySteps[i]}"/>`
    )
    .join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${rects}</svg>`;
  const href = `data:image/svg+xml,${encodeURIComponent(svg)}`;

  let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.type = 'image/svg+xml';
  link.href = href;

  // Apple touch icon cannot be SVG — leave the static PNG as fallback.
}
