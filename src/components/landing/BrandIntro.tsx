'use client';

import { useEffect, useRef, useState } from 'react';
import { MARK_SEGMENTS, MARK_STROKE_WIDTH } from '@/lib/brand-mark';

const SESSION_KEY = 'lc-intro-played';

/**
 * Brand intro (branding guide S1 transition storyboard): "Libres Cobros"
 * fluidifies into the LC monogram — the wordmark blurs out while the L and C
 * strokes draw themselves in, then the overlay lifts to reveal the landing.
 * Plays once per browser session and honors prefers-reduced-motion.
 */
export function BrandIntro() {
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState<'wordmark' | 'morph' | 'exit'>('wordmark');
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || sessionStorage.getItem(SESSION_KEY)) return;

    // The session flag is written when playback actually starts (inside the
    // deferred timer): React StrictMode's mount → cleanup → mount cycle clears
    // run-1 timers before they fire, and run 2 must not bail out early.
    document.body.style.overflow = 'hidden';

    timers.current.push(
      window.setTimeout(() => {
        sessionStorage.setItem(SESSION_KEY, '1');
        setVisible(true);
      }, 0)
    );
    timers.current.push(window.setTimeout(() => setPhase('morph'), 950));
    timers.current.push(window.setTimeout(() => setPhase('exit'), 2150));
    timers.current.push(
      window.setTimeout(() => {
        setVisible(false);
        document.body.style.overflow = '';
      }, 2800)
    );

    const list = timers.current;
    return () => {
      list.forEach(window.clearTimeout);
      document.body.style.overflow = '';
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`brand-intro${phase === 'morph' ? ' morph' : ''}${phase === 'exit' ? ' exit' : ''}`}
      aria-hidden="true"
    >
      <div className="intro-stack">
        <div className="intro-wordmark">
          <span className="intro-word-libres">Libres</span>{' '}
          <span className="intro-word-cobros">Cobros</span>
        </div>
        <svg
          className="intro-mark"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 64 64"
          width="150"
          height="150"
          fill="none"
          stroke="#ffffff"
          strokeWidth={MARK_STROKE_WIDTH}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {MARK_SEGMENTS.map((d) => (
            <path key={d} d={d} pathLength={100} />
          ))}
        </svg>
      </div>
    </div>
  );
}
