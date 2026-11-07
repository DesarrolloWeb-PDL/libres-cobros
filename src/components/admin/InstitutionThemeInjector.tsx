'use client';

import { useEffect } from 'react';
import { updateMetaThemeColor, setCubesFavicon } from '@/lib/theme-color';

interface InstitutionThemeProps {
  primaryColor: string;
}

export function InstitutionThemeInjector({ primaryColor }: InstitutionThemeProps) {
  useEffect(() => {
    const root = document.documentElement;

    // Mark the document so the CSS variable overrides in globals.css apply.
    root.setAttribute('data-institution-theme', '');

    // Re-tokenize the full primary/accent ramp, charts and sidebar tokens.
    root.style.setProperty('--accent', primaryColor);
    root.style.setProperty('--accent-hover', primaryColor);
    root.style.setProperty('--primary', primaryColor);
    root.style.setProperty('--primary-foreground', '#ffffff');
    root.style.setProperty('--ring', primaryColor);
    root.style.setProperty('--chart-1', primaryColor);
    root.style.setProperty('--chart-2', `color-mix(in srgb, ${primaryColor} 72%, #ffffff)`);
    root.style.setProperty('--chart-3', `color-mix(in srgb, ${primaryColor} 48%, #ffffff)`);
    root.style.setProperty('--chart-4', `color-mix(in srgb, ${primaryColor} 86%, #000000)`);
    root.style.setProperty('--chart-5', `color-mix(in srgb, ${primaryColor} 64%, #000000)`);
    root.style.setProperty('--sidebar-primary', primaryColor);
    root.style.setProperty('--sidebar-primary-foreground', '#ffffff');
    root.style.setProperty('--sidebar-ring', primaryColor);
    root.style.setProperty('--institution-primary', primaryColor);

    // PWA title bar + app icon follow this institution's color.
    updateMetaThemeColor();
    setCubesFavicon(primaryColor);

    return () => {
      // Cleanup on unmount
      root.removeAttribute('data-institution-theme');
      root.style.removeProperty('--accent');
      root.style.removeProperty('--accent-hover');
      root.style.removeProperty('--primary');
      root.style.removeProperty('--primary-foreground');
      root.style.removeProperty('--ring');
      root.style.removeProperty('--chart-1');
      root.style.removeProperty('--chart-2');
      root.style.removeProperty('--chart-3');
      root.style.removeProperty('--chart-4');
      root.style.removeProperty('--chart-5');
      root.style.removeProperty('--sidebar-primary');
      root.style.removeProperty('--sidebar-primary-foreground');
      root.style.removeProperty('--sidebar-ring');
      root.style.removeProperty('--institution-primary');
    };
  }, [primaryColor]);

  return null;
}