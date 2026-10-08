'use client';

import { useEffect } from 'react';

interface AdminPageBackgroundProps {
  /** Institution / Super Admin light-mode page background. */
  bgColor: string;
}

/**
 * Applies the themed light background to the page. In dark mode the inline
 * color is removed so CSS .dark variables own the body background.
 */
export function AdminPageBackground({ bgColor }: AdminPageBackgroundProps) {
  useEffect(() => {
    const apply = () => {
      const isDark = document.documentElement.classList.contains('dark');
      if (isDark) {
        document.body.style.backgroundColor = '';
      } else {
        document.body.style.backgroundColor = bgColor;
      }
    };

    apply();

    const observer = new MutationObserver(apply);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => {
      document.body.style.backgroundColor = '';
      observer.disconnect();
    };
  }, [bgColor]);

  return null;
}
