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
 * Recolors the app icon (favicon) to match the active brand color.
 */
export function setCubesFavicon(color: string) {
  if (typeof document === 'undefined' || !color) return;

  // Growth bars: 13-wide rounded bars at (8,36)/(25.5,24)/(43,10), all ending at y=56.
  const opacitySteps = [0.5, 0.75, 1];
  const bars = [
    { x: 8, y: 36 },
    { x: 25.5, y: 24 },
    { x: 43, y: 10 },
  ]
    .map(
      ({ x, y }, i) =>
        `<rect x="${x}" y="${y}" width="13" height="${56 - y}" rx="6.5" fill="${color}" opacity="${opacitySteps[i]}"/>`
    )
    .join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bars}</svg>`;
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
