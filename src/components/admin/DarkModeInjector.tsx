'use client';

import { useEffect } from 'react';
import { updateMetaThemeColor } from '@/lib/theme-color';

interface DarkModeInjectorProps {
  bgColor: string;
}

function getLuminance(hexColor: string): number {
  const hex = hexColor.replace('#', '');

  if (hex.length !== 6) {
    return 1;
  }

  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function DarkModeInjector({ bgColor }: DarkModeInjectorProps) {
  useEffect(() => {
    // Priority: explicit day/night choice > system preference > institution bg luminance.
    const stored = (() => {
      try {
        return window.localStorage.getItem('libres-theme');
      } catch {
        return null;
      }
    })();

    const setDark = (isDark: boolean) => {
      document.documentElement.classList.toggle('dark', isDark);
      if (isDark) {
        // Inline --background (light institution bg) would override .dark vars.
        document.documentElement.style.removeProperty('--background');
      }
      updateMetaThemeColor();
    };

    if (stored === 'dark' || stored === 'light') {
      setDark(stored === 'dark');
      return;
    }

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      setDark(true);
      return;
    }

    setDark(getLuminance(bgColor) < 0.5);
  }, [bgColor]);

  return null;
}
