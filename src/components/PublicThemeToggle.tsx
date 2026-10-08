'use client';

import { usePathname } from 'next/navigation';
import { ThemeToggle } from '@/components/ThemeToggle';

/**
 * Shows the day/night toggle on public pages only.
 * Admin keeps institution-driven DarkModeInjector instead.
 */
export function PublicThemeToggle() {
  const pathname = usePathname();

  if (pathname?.startsWith('/admin') || pathname?.startsWith('/change-password')) {
    return null;
  }

  return <ThemeToggle />;
}
