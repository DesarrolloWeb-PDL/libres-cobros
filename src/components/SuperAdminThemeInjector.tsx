'use client';

import { useEffect, useRef } from 'react';
import { updateMetaThemeColor } from '@/lib/theme-color';

interface PublicTheme {
  primaryColor?: string;
  accentColor?: string;
  bgColor?: string;
}

function applyPublicTheme(theme: PublicTheme | null) {
  if (!theme?.primaryColor) return;

  const root = document.documentElement;
  const primary = theme.primaryColor;

  root.style.setProperty('--accent', primary);
  root.style.setProperty('--accent-hover', theme.accentColor || primary);
  root.style.setProperty('--primary', primary);
  root.style.setProperty('--primary-foreground', '#ffffff');
  root.style.setProperty('--ring', primary);
  root.style.setProperty('--chart-1', primary);
  root.style.setProperty('--sidebar-primary', primary);
  root.style.setProperty('--sidebar-primary-foreground', '#ffffff');
  root.style.setProperty('--sidebar-ring', primary);
  root.style.setProperty('--institution-primary', primary);

  // Light mode may tint the page. Dark mode must use CSS .dark variables —
  // an inline light --background would win and leave a light page with dark cards.
  const isDark = root.classList.contains('dark');
  if (isDark) {
    root.style.removeProperty('--background');
  } else if (theme.bgColor) {
    root.style.setProperty('--background', theme.bgColor);
  }

  updateMetaThemeColor();
}

/**
 * Applies the Super Admin theme (SiteConfig clubId=null, key=theme) to public
 * pages. Institution layouts override --accent with their own colors when active.
 */
export function SuperAdminThemeInjector() {
  const themeRef = useRef<PublicTheme | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/theme')
      .then((res) => (res.ok ? res.json() : { theme: null }))
      .then(({ theme }) => {
        if (cancelled) return;
        themeRef.current = theme;
        applyPublicTheme(theme);
      })
      .catch(() => {
        // progressive enhancement
      });

    const observer = new MutationObserver(() => {
      applyPublicTheme(themeRef.current);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, []);

  return null;
}
