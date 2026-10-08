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

    if (stored === 'dark' || stored === 'light') {
      document.documentElement.classList.toggle('dark', stored === 'dark');
      updateMetaThemeColor();
      return;
    }

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      document.documentElement.classList.add('dark');
      updateMetaThemeColor();
      return;
    }

    const luminance = getLuminance(bgColor);
    document.documentElement.classList.toggle('dark', luminance < 0.5);
    updateMetaThemeColor();
  }, [bgColor]);

  return null;
}
