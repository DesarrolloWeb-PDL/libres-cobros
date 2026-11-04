'use client';

import { useEffect, useSyncExternalStore } from 'react';
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
const THEME_CHANGED_EVENT = 'libres-theme-changed';

function subscribe(callback: () => void) {
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = () => callback();
  window.addEventListener('storage', handler);          // cross-tab change
  window.addEventListener(THEME_CHANGED_EVENT, handler); // same-tab toggle
  media.addEventListener('change', handler);             // system preference change
  return () => {
    window.removeEventListener('storage', handler);
    window.removeEventListener(THEME_CHANGED_EVENT, handler);
    media.removeEventListener('change', handler);
  };
}

function getSnapshot(): ThemeMode {
  // Stored preference wins; otherwise follow the system. When a stored
  // preference exists this ignores system changes, matching original logic.
  const stored = getStoredTheme();
  if (stored) return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

const getServerSnapshot = (): ThemeMode => 'light';

export function ThemeToggle() {
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // DOM side-effect (allowed in an effect — not setState):
  useEffect(() => {
    applyTheme(mode);
  }, [mode]);

  function toggle() {
    const next: ThemeMode = mode === 'dark' ? 'light' : 'dark';
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // private mode — still applies for this session
    }
    window.dispatchEvent(new Event(THEME_CHANGED_EVENT));
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
