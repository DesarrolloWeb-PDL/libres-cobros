'use client';

import { useEffect, useRef } from 'react';

interface ParallaxBackdropProps {
  /** Public image path used as the photo band background. */
  src: string;
  /**
   * Scrim style: 'theme' follows light/dark (hero copy keeps theme colors);
   * 'navy' is always the deep brand gradient (band forces white copy).
   */
  scrim?: 'theme' | 'navy';
}

/**
 * Scroll-parallax photo band for the landing (branding guide surfaces):
 * the image drifts slower than the page behind a scrim so copy stays
 * readable in both themes. Static under prefers-reduced-motion.
 */
export function ParallaxBackdrop({ src, scrim = 'theme' }: ParallaxBackdropProps) {
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduce =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const layer = layerRef.current;
      const host = layer?.parentElement;
      if (!layer || !host) return;
      const rect = host.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, -rect.top / Math.max(1, rect.height)));
      // 300px of lag across the band's scroll-out: ~30% slower than the page —
      // clearly perceptible — while the ±300px headroom keeps full coverage.
      layer.style.transform = `translate3d(0, ${Math.round(progress * 300)}px, 0)`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div
        ref={layerRef}
        className="absolute inset-x-0 -top-[300px] -bottom-[300px] bg-cover bg-center will-change-transform"
        style={{ backgroundImage: `url(${src})` }}
      />
      <div className={scrim === 'navy' ? 'hero-scrim-navy absolute inset-0' : 'hero-scrim absolute inset-0'} />
    </div>
  );
}
