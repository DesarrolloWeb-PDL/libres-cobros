'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Logo } from '@/components/Logo';

const navItems = [
  { label: 'Problema', href: '#problema' },
  { label: 'Cómo funciona', href: '#como-funciona' },
  { label: 'Funciones', href: '#funciones' },
  { label: 'Precios', href: '#precios' },
  { label: 'FAQ', href: '#faq' },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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
          className="flex items-center gap-2 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <Logo size={32} showScroll={false} />
          <span className="font-heading font-bold text-foreground">Libres Cobros</span>
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
