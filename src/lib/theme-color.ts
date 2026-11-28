'use client';

import { markPathsSvg } from './brand-mark';

/**
 * Keeps the browser/PWA title-bar color in sync with the active day/night theme.
 * Light mode uses the current --primary (Super Admin / institution accent).
 * Dark mode uses the dark surface color.
 */
export function updateMetaThemeColor() {
  if (typeof document === 'undefined') return;

  const isDark = document.documentElement.classList.contains('dark');
  let color = '#001a40';

  if (!isDark) {
    const primary =
      getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() ||
      getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    color = primary || '#582694';
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

  // LC → check isotipo (branding guide S7): rounded badge in the active
  // brand color with the white mark on top.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${color}"/><g fill="none" stroke="#ffffff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round">${markPathsSvg()}</g></svg>`;
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
