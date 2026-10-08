'use client';

import { useEffect } from 'react';
import { updateMetaThemeColor } from '@/lib/theme-color';

/**
 * Applies the Super Admin theme (SiteConfig clubId=null, key=theme) to public
 * pages. Institution layouts override --accent with their own colors when active.
 */
export function SuperAdminThemeInjector() {
  useEffect(() => {
    let cancelled = false;

    fetch('/api/theme')
      .then((res) => (res.ok ? res.json() : { theme: null }))
      .then(({ theme }) => {
        if (cancelled || !theme?.primaryColor) return;

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

        // Background color only in light mode — dark mode owns --background.
        const isDark = document.documentElement.classList.contains('dark');
        if (theme.bgColor && !isDark) {
          root.style.setProperty('--background', theme.bgColor);
        }

        updateMetaThemeColor();
      })
      .catch(() => {
        // Theme is progressive enhancement — ignore network failures.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
