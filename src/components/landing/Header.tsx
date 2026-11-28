'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Wordmark } from '@/components/Wordmark';

const navItems = [
  { label: 'Por qué', href: '#problema' },
  { label: 'Cómo funciona', href: '#como-funciona' },
  { label: 'Funciones', href: '#funciones' },
  { label: 'Precios', href: '#precios' },
  { label: 'FAQ', href: '#faq' },
];

// v2: the v1 flag got burned while the lockup CSS was stale (Turbopack panic),
// so existing sessions never saw the effect — bumping replays it once.
const LOCKUP_KEY = 'lc-lockup-played-v2';
type LockupPhase = 'name' | 'morph' | 'done';

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // In-place brand transition (guide S1 storyboard): the header name itself
  // dissolves into the LC monogram, then the name re-deploys beside it.
  // Initial 'name' matches SSR; repeat visits and reduced-motion jump to
  // 'done' via a deferred setState (React19 lint rule, same as LandingEditor).
  const [lockup, setLockup] = useState<LockupPhase>('name');

  useEffect(() => {
    // matchMedia is unavailable in the test environment.
    const reduce =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || sessionStorage.getItem(LOCKUP_KEY)) {
      const id = window.setTimeout(() => setLockup('done'), 0);
      return () => window.clearTimeout(id);
    }
    // If the lockup CSS hasn't applied (stale stylesheet), skip WITHOUT
    // burning the session flag so a later load can still play the effect.
    const wrap = document.querySelector('.brand-mark-wrap');
    if (wrap && getComputedStyle(wrap).opacity !== '0') {
      return;
    }
    const t1 = window.setTimeout(() => setLockup('morph'), 850);
    const t2 = window.setTimeout(() => {
      setLockup('done');
      sessionStorage.setItem(LOCKUP_KEY, '1');
    }, 1950);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const closeMobile = () => setMobileOpen(false);

  return (
    <header
      className={`sticky top-0 z-50 h-16 border-b transition-[background-color,box-shadow,border-color] duration-200 motion-reduce:transition-none ${
        scrolled
          ? 'border-border bg-background/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80'
          : 'border-transparent bg-transparent'
      }`}
    >
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-4">
        <Link
          href="/"
          className={`brand-lockup brand-${lockup} flex items-center gap-2 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`}
        >
          <span className="brand-mark-wrap inline-flex">
            <Logo size={32} showScroll={false} draw={lockup === 'morph'} />
          </span>
          <Wordmark className="brand-wordmark font-heading font-bold" />
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeMobile}
              className="rounded-md text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/pagos"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Portal de socios
          </Link>
          <Link
            href="/registro"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Registrar mi club
          </Link>
        </nav>

        <button
          type="button"
          aria-expanded={mobileOpen}
          aria-controls="mobile-menu"
          aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
          onClick={() => setMobileOpen((open) => !open)}
          className="inline-flex size-10 items-center justify-center rounded-lg border border-border hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent md:hidden"
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div
          id="mobile-menu"
          className="absolute inset-x-0 top-16 border-b border-border bg-background/95 px-4 pb-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/90 md:hidden"
        >
          <nav className="flex flex-col gap-2 pt-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobile}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/pagos"
              onClick={closeMobile}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-3 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Portal de socios
            </Link>
            <Link
              href="/registro"
              onClick={closeMobile}
              className="mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 text-sm font-medium text-white hover:bg-accent/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Registrar mi club
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
