'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Home, CreditCard, HelpCircle, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface MemberNavProps {
  institutionName: string;
  institutionSlug: string;
  institutionLogo?: string | null;
  primaryColor?: string;
}

function getLuminance(hexColor: string): number {
  const hex = hexColor.replace('#', '');

  if (hex.length !== 6) {
    return 1;
  }

  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const navItems = [
  { href: '/', label: 'Inicio', icon: Home },
  { href: '/pagos', label: 'Pagos', icon: CreditCard },
  { href: '/ayuda', label: 'Ayuda', icon: HelpCircle },
];

export function MemberNav({ institutionName, institutionSlug, institutionLogo, primaryColor }: MemberNavProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const hasColor = !!primaryColor;
  const headerIsDark = hasColor && primaryColor ? getLuminance(primaryColor) < 0.5 : false;

  const headerStyle = hasColor ? { backgroundColor: primaryColor } : undefined;
  const borderClass = hasColor ? 'border-white/15' : 'border-border';
  const textClass = hasColor
    ? headerIsDark
      ? 'text-white'
      : 'text-foreground'
    : 'text-foreground';
  const mutedTextClass = hasColor
    ? headerIsDark
      ? 'text-white/70'
      : 'text-muted-foreground'
    : 'text-muted-foreground';
  const logoPlaceholderBg = hasColor
    ? headerIsDark
      ? 'bg-white/15'
      : 'bg-black/10'
    : 'bg-accent/10';
  const logoPlaceholderText = hasColor
    ? headerIsDark
      ? 'text-white'
      : 'text-foreground'
    : 'text-accent';
  const mobileBtnClass = hasColor
    ? headerIsDark
      ? 'text-white hover:bg-white/15'
      : 'text-foreground hover:bg-black/10'
    : 'text-foreground hover:bg-muted';

  const activeDesktopClass = hasColor
    ? headerIsDark
      ? 'bg-white/25 text-white shadow-sm'
      : 'bg-black/15 text-foreground shadow-sm'
    : 'bg-accent/10 text-accent';
  const inactiveDesktopClass = hasColor
    ? headerIsDark
      ? 'text-white/80 hover:bg-white/12 hover:text-white'
      : 'text-foreground/80 hover:bg-black/10 hover:text-foreground'
    : 'text-muted-foreground hover:bg-muted hover:text-foreground';

  const activeMobileClass = 'bg-primary text-primary-foreground';
  const inactiveMobileClass = 'text-foreground hover:bg-muted';

  return (
    <header
      className={cn(
        'sticky top-0 z-50 border-b',
        borderClass,
        !hasColor && 'bg-background/80 backdrop-blur-lg'
      )}
      style={headerStyle}
    >
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        {/* Logo & Institution Name */}
        <Link href={`/pagos/${institutionSlug}`} className="flex items-center gap-3 group">
          {institutionLogo ? (
            <div className="size-10 overflow-hidden rounded-lg border border-white/20">
              <Image
                src={institutionLogo}
                alt={institutionName}
                width={40}
                height={40}
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className={cn('flex size-10 items-center justify-center rounded-lg', logoPlaceholderBg)}>
              <span className={cn('text-lg font-bold', logoPlaceholderText)}>
                {institutionName.charAt(0)}
              </span>
            </div>
          )}
          <div>
            <h1 className={cn('font-semibold transition-colors', textClass)}>
              {institutionName}
            </h1>
            <p className={cn('text-xs', mutedTextClass)}>Portal de Socios</p>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === `/pagos/${institutionSlug}` ||
              pathname.startsWith(`/pagos/${institutionSlug}${item.href}`);

            return (
              <Link
                key={item.href}
                href={`/pagos/${institutionSlug}${item.href}`}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all',
                  isActive ? activeDesktopClass : inactiveDesktopClass
                )}
              >
                <Icon className="size-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className={cn('md:hidden', mobileBtnClass)}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="absolute top-full left-0 right-0 z-50 md:hidden border-x-0 border-b border-border bg-card shadow-xl rounded-b-xl">
          <nav className="container mx-auto px-4 py-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === `/pagos/${institutionSlug}` ||
                pathname.startsWith(`/pagos/${institutionSlug}${item.href}`);

              return (
                <Link
                  key={item.href}
                  href={`/pagos/${institutionSlug}${item.href}`}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all',
                    isActive ? activeMobileClass : inactiveMobileClass
                  )}
                >
                  <Icon className="size-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
