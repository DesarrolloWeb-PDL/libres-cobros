'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, CreditCard, HelpCircle, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface MemberNavProps {
  clubName: string;
  clubSlug: string;
  clubLogo?: string | null;
  primaryColor?: string;
}

const navItems = [
  { href: '/', label: 'Inicio', icon: Home },
  { href: '/pagos', label: 'Pagos', icon: CreditCard },
  { href: '/ayuda', label: 'Ayuda', icon: HelpCircle },
];

export function MemberNav({ clubName, clubSlug, clubLogo, primaryColor }: MemberNavProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const accentStyle = primaryColor ? { color: primaryColor } : undefined;
  const accentBgStyle = primaryColor ? { backgroundColor: `${primaryColor}15` } : undefined;

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        {/* Logo & Club Name */}
        <Link href={`/pagos/${clubSlug}`} className="flex items-center gap-3 group">
          {clubLogo ? (
            <div className="size-10 overflow-hidden rounded-lg border border-border">
              <img 
                src={clubLogo} 
                alt={clubName} 
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div 
              className="flex size-10 items-center justify-center rounded-lg"
              style={accentBgStyle || { backgroundColor: 'hsl(var(--accent) / 0.1)' }}
            >
              <span 
                className="text-lg font-bold"
                style={accentStyle || { color: 'hsl(var(--accent))' }}
              >
                {clubName.charAt(0)}
              </span>
            </div>
          )}
          <div>
            <h1 
              className="font-semibold transition-colors"
              style={accentStyle}
            >
              {clubName}
            </h1>
            <p className="text-xs text-muted-foreground">Portal de Socios</p>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === `/pagos/${clubSlug}` || 
                           pathname.startsWith(`/pagos/${clubSlug}${item.href}`);
            
            return (
              <Link
                key={item.href}
                href={`/pagos/${clubSlug}${item.href}`}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all',
                  isActive
                    ? 'bg-accent/10'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
                style={isActive ? accentBgStyle : undefined}
              >
                <Icon className="size-4" style={isActive ? accentStyle : undefined} />
                <span style={isActive ? accentStyle : undefined}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background">
          <nav className="container mx-auto px-4 py-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === `/pagos/${clubSlug}` || 
                             pathname.startsWith(`/pagos/${clubSlug}${item.href}`);
              
              return (
                <Link
                  key={item.href}
                  href={`/pagos/${clubSlug}${item.href}`}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all',
                    isActive
                      ? 'bg-accent/10'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                  style={isActive ? accentBgStyle : undefined}
                >
                  <Icon className="size-5" style={isActive ? accentStyle : undefined} />
                  <span style={isActive ? accentStyle : undefined}>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
