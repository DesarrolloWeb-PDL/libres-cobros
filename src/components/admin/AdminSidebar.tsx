'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { InstitutionSelector } from './InstitutionSelector';
import { Logo } from '@/components/Logo';

const navItems = [
  { href: '/admin', label: 'Panel', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'ADMIN'] as const },
  { href: '/admin/socios', label: 'Socios', icon: Users, roles: ['ADMIN'] as const },
  { href: '/admin/cuotas', label: 'Cuotas', icon: Receipt, roles: ['ADMIN'] as const },
  { href: '/admin/pagos', label: 'Pagos', icon: CreditCard, roles: ['ADMIN'] as const },
  { href: '/admin/comisiones', label: 'Comisiones', icon: Percent, roles: ['ADMIN'] as const },
  { href: '/admin/reportes', label: 'Reportes', icon: FileText, roles: ['ADMIN'] as const },
  { href: '/admin/instituciones', label: 'Instituciones', icon: Building2, roles: ['SUPER_ADMIN'] as const },
  { href: '/admin/usuarios', label: 'Usuarios', icon: UserCog, roles: ['SUPER_ADMIN'] as const },
  { href: '/admin/configuracion', label: 'Configuración', icon: Settings, roles: ['SUPER_ADMIN', 'ADMIN'] as const },
];

interface InstitutionData {
  id: string;
  name: string;
  logoUrl?: string | null;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
}

interface AdminSidebarProps {
  institution?: InstitutionData | null;
  themeColor?: string | null;
}

export function AdminSidebar({ institution, themeColor }: AdminSidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const userRole = session?.user?.role as string | undefined;
  const userName = session?.user?.name || session?.user?.email || 'Admin';
  const isSuperAdmin = userRole === 'SUPER_ADMIN';

  const filteredNavItems = userRole
    ? navItems.filter((item) => item.roles.some((r) => r === userRole))
    : [];

  // Institution colors for admin - use themeColor for super admin
  const primaryColor = themeColor || institution?.primaryColor || '#7c3aed';
  const accentStyle = { color: primaryColor };
  const accentBgStyle = { backgroundColor: primaryColor };

  return (
    <>
      {/* Mobile Header */}
      <div
        className="lg:hidden fixed top-0 left-0 right-0 z-40 flex h-14 items-center justify-between border-b bg-background/90 backdrop-blur-md px-4"
        style={accentBgStyle}
      >
        <Link href="/admin" className="flex items-center gap-2.5">
          {institution?.logoUrl ? (
            <div className="flex size-8 items-center justify-center rounded-lg overflow-hidden border border-white/20">
              <Image src={institution.logoUrl} alt={institution.name} width={32} height={32} className="size-full object-cover" />
            </div>
          ) : (
            <div className="flex size-8 items-center justify-center">
              <Logo size={32} showScroll={false} color="white" />
            </div>
          )}
          <span className="font-semibold text-white text-sm" style={accentStyle}>
            {isSuperAdmin ? 'Libres Cobros' : institution?.name || 'Admin'}
          </span>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
          className="text-white hover:bg-white/15 size-9"
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 w-60 transform border-r bg-background transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-auto',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        style={accentBgStyle}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-14 items-center border-b border-white/15 px-4">
            <Link href="/admin" className="flex items-center gap-2.5 group">
              {institution?.logoUrl ? (
                <div className="flex size-8 items-center justify-center rounded-lg overflow-hidden border border-white/20 group-hover:scale-105 transition-transform duration-200">
                  <Image src={institution.logoUrl} alt={institution.name} width={32} height={32} className="size-full object-cover" />
                </div>
              ) : (
                <div className="flex size-8 items-center justify-center group-hover:scale-105 transition-transform duration-200">
                  <Logo size={32} showScroll={false} color="white" />
                </div>
              )}
              <span className="font-semibold text-white text-sm transition-colors">
                {isSuperAdmin ? 'Libres Cobros' : institution?.name || 'Admin'}
              </span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-0.5 p-2.5 overflow-y-auto">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'bg-white/20 text-white shadow-sm'
                      : 'text-white/60 hover:bg-white/8 hover:text-white/90'
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Institution Selector */}
          {isSuperAdmin && <InstitutionSelector userRole={userRole} />}

          {/* User Menu */}
          <div className="border-t border-white/15 p-2.5">
            <div className="relative">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-white/60 hover:bg-white/8 hover:text-white h-auto py-2"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                <div className="flex size-7 items-center justify-center rounded-full bg-white/15">
                  <span className="text-xs font-medium text-white">
                    {userName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="flex-1 text-left truncate text-sm">{userName}</span>
                <ChevronDown className={cn('size-3.5 transition-transform duration-200', userMenuOpen && 'rotate-180')} />
              </Button>

              {userMenuOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-2 rounded-lg border bg-background shadow-lg overflow-hidden">
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive h-auto py-2.5"
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
          className="fixed inset-0 z-20 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
}
