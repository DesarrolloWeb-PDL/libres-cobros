'use client';

import { useEffect } from 'react';

interface ClubThemeProps {
  primaryColor: string;
}

export function ClubThemeInjector({ primaryColor }: ClubThemeProps) {
  useEffect(() => {
    const root = document.documentElement;
    
    // Set all CSS variables directly on <html>
    root.style.setProperty('--accent', primaryColor);
    root.style.setProperty('--accent-hover', primaryColor);
    root.style.setProperty('--primary', primaryColor);
    root.style.setProperty('--primary-foreground', '#ffffff');
    root.style.setProperty('--ring', primaryColor);
    root.style.setProperty('--chart-1', primaryColor);
    root.style.setProperty('--sidebar-primary', primaryColor);
    root.style.setProperty('--sidebar-primary-foreground', '#ffffff');
    root.style.setProperty('--sidebar-ring', primaryColor);
    root.style.setProperty('--club-primary', primaryColor);

    return () => {
      // Cleanup on unmount
      root.style.removeProperty('--accent');
      root.style.removeProperty('--accent-hover');
      root.style.removeProperty('--primary');
      root.style.removeProperty('--primary-foreground');
      root.style.removeProperty('--ring');
      root.style.removeProperty('--chart-1');
      root.style.removeProperty('--sidebar-primary');
      root.style.removeProperty('--sidebar-primary-foreground');
      root.style.removeProperty('--sidebar-ring');
      root.style.removeProperty('--club-primary');
    };
  }, [primaryColor]);

  return null;
}
