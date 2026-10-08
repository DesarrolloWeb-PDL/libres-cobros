'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { updateMetaThemeColor } from '@/lib/theme-color';

const STORAGE_KEY = 'libres-theme';

export type ThemeMode = 'light' | 'dark';

export function getStoredTheme(): ThemeMode | null {
  if (typeof window === 'undefined') return null;
  const value = window.localStorage.getItem(STORAGE_KEY);
  return value === 'light' || value === 'dark' ? value : null;
}

export function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  root.classList.toggle('dark', mode === 'dark');

  // Dark CSS owns --background. An inline light bg from the theme injector
  // would otherwise win and leave the page light while cards go dark.
  if (mode === 'dark') {
    root.style.removeProperty('--background');
  }

  updateMetaThemeColor();
}

/**
 * Floating day/night toggle. Preference is persisted in localStorage;
 * default follows the system. Works on public and admin pages.
 */
export function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>('light');

  useEffect(() => {
    const stored = getStoredTheme();
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initial: ThemeMode = stored ?? (prefersDark ? 'dark' : 'light');
    setMode(initial);
    applyTheme(initial);

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => {
      if (getStoredTheme()) return;
      const next: ThemeMode = e.matches ? 'dark' : 'light';
      setMode(next);
      applyTheme(next);
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  function toggle() {
    const next: ThemeMode = mode === 'dark' ? 'light' : 'dark';
    setMode(next);
    applyTheme(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // private mode — still applies for this session
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={toggle}
      aria-label={mode === 'dark' ? 'Cambiar a modo día' : 'Cambiar a modo noche'}
      title={mode === 'dark' ? 'Modo día' : 'Modo noche'}
      className="fixed right-4 bottom-4 z-50 size-11 rounded-full shadow-lg bg-card/90 backdrop-blur-sm border-border"
    >
      {mode === 'dark' ? (
        <Sun className="size-5" />
      ) : (
        <Moon className="size-5" />
      )}
    </Button>
  );
}
