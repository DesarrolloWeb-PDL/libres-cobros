'use client';

import { useEffect } from 'react';

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

  // Relative luminance formula (sRGB)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function DarkModeInjector({ bgColor }: DarkModeInjectorProps) {
  useEffect(() => {
    // An explicit day/night choice from ThemeToggle always wins.
    const stored = (() => {
      try {
        return window.localStorage.getItem('libres-theme');
      } catch {
        return null;
      }
    })();

    if (stored === 'dark' || stored === 'light') {
      document.documentElement.classList.toggle('dark', stored === 'dark');
      return;
    }

    const luminance = getLuminance(bgColor);

    if (luminance < 0.5) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [bgColor]);

  return null;
}
