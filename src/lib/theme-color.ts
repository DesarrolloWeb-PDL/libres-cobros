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
