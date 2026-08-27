'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import {
  LayoutDashboard,
  Users,
  Receipt,
  CreditCard,
  Percent,
  FileText,
  Settings,
  Building2,
  UserCog,
  Menu,
  X,
  LogOut,
  ChevronDown,
  Palette,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ClubSelector } from './ClubSelector';

const navItems = [
  { href: '/admin', label: 'Panel', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'ADMIN'] as const },
  { href: '/admin/socios', label: 'Socios', icon: Users, roles: ['ADMIN'] as const },
  { href: '/admin/cuotas', label: 'Cuotas', icon: Receipt, roles: ['ADMIN'] as const },
  { href: '/admin/pagos', label: 'Pagos', icon: CreditCard, roles: ['ADMIN'] as const },
  { href: '/admin/comisiones', label: 'Comisiones', icon: Percent, roles: ['ADMIN'] as const },
  { href: '/admin/reportes', label: 'Reportes', icon: FileText, roles: ['ADMIN'] as const },
  { href: '/admin/clubes', label: 'Clubes', icon: Building2, roles: ['SUPER_ADMIN'] as const },
  { href: '/admin/usuarios', label: 'Usuarios', icon: UserCog, roles: ['SUPER_ADMIN'] as const },
  { href: '/admin/configuracion', label: 'Configuración', icon: Settings, roles: ['SUPER_ADMIN', 'ADMIN'] as const },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const userRole = session?.user?.role as string | undefined;
  const userName = session?.user?.name || session?.user?.email || 'Admin';

  const filteredNavItems = userRole
    ? navItems.filter((item) => item.roles.some((r) => r === userRole))
    : [];

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex h-14 items-center justify-between border-b bg-background/80 backdrop-blur-lg px-4">
        <Link href="/admin" className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-accent">
            <Palette className="size-4 text-white" />
          </div>
          <span className="font-semibold">Libres Cobros</span>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 w-64 transform border-r bg-background transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-auto',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-14 items-center border-b px-4">
            <Link href="/admin" className="flex items-center gap-2 group">
              <div className="flex size-8 items-center justify-center rounded-lg bg-accent group-hover:scale-105 transition-transform">
                <Palette className="size-4 text-white" />
              </div>
              <span className="font-semibold group-hover:text-accent transition-colors">Libres Cobros</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-3">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                    isActive
                      ? 'bg-accent text-white shadow-md shadow-accent/20'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Club Selector */}
          {userRole === 'SUPER_ADMIN' && <ClubSelector userRole={userRole} />}

          {/* User Menu */}
          <div className="border-t p-3">
            <div className="relative">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                <div className="flex size-8 items-center justify-center rounded-full bg-accent/10">
                  <span className="text-sm font-medium text-accent">
                    {userName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="flex-1 text-left truncate">{userName}</span>
                <ChevronDown className={cn('size-4 transition-transform', userMenuOpen && 'rotate-180')} />
              </Button>

              {userMenuOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-2 rounded-lg border bg-background shadow-lg">
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
                    onClick={() => signOut({ callbackUrl: '/login' })}
                  >
                    <LogOut className="size-4" />
                    Cerrar sesión
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
}
