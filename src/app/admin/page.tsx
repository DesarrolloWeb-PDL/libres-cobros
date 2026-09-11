import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { adminFetch } from '@/lib/admin-fetch';
import { StatsCards } from '@/components/admin/StatsCards';
import { LayoutDashboard, Users, CreditCard, FileText, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface DashboardData {
  totalSocios: number;
  cuotasPendientes: number;
  cuotasVencidas: number;
  pagosMes: number;
  comisionesMes: number;
}

async function getDashboardData(): Promise<DashboardData> {
  const response = await adminFetch(
    '/api/admin/dashboard',
    'Failed to load dashboard metrics'
  );

  return response.json();
}

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.role || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
    redirect('/login');
  }

  const data = await getDashboardData();

  const quickActions = [
    { href: '/admin/socios', label: 'Socios', description: 'Gestionar socios de la institución', icon: Users, color: 'bg-blue-500/10 text-blue-600', roles: ['ADMIN'] as const },
    { href: '/admin/pagos', label: 'Pagos', description: 'Historial de pagos recibidos', icon: CreditCard, color: 'bg-emerald-500/10 text-emerald-600', roles: ['ADMIN'] as const },
    { href: '/admin/reportes', label: 'Reportes', description: 'Estadísticas y exportaciones', icon: FileText, color: 'bg-violet-500/10 text-violet-600', roles: ['ADMIN'] as const },
    { href: '/admin/instituciones', label: 'Instituciones', description: 'Administrar instituciones', icon: Users, color: 'bg-blue-500/10 text-blue-600', roles: ['SUPER_ADMIN'] as const },
    { href: '/admin/usuarios', label: 'Usuarios', description: 'Gestión de usuarios del sistema', icon: Users, color: 'bg-emerald-500/10 text-emerald-600', roles: ['SUPER_ADMIN'] as const },
  ];

  const filteredQuickActions = quickActions.filter(action =>
    action.roles.some(r => r === session.user.role)
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex size-11 items-center justify-center rounded-xl bg-accent/10">
          <LayoutDashboard className="size-5 text-accent" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Panel de Control</h1>
          <p className="text-sm text-muted-foreground">
            Resumen de la institución y métricas del mes en curso.
          </p>
        </div>
      </div>

      {/* Stats */}
      <StatsCards data={data} />

      {/* Quick Actions */}
      <div>
        <h2 className="text-base font-semibold mb-4">Accesos Rápidos</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredQuickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="group flex items-center gap-4 rounded-xl border bg-card p-4 hover:shadow-sm hover:border-accent/20 transition-all duration-200"
              >
                <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${action.color}`}>
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-sm group-hover:text-accent transition-colors truncate">
                    {action.label}
                  </h3>
                  <p className="text-xs text-muted-foreground truncate">{action.description}</p>
                </div>
                <ArrowRight className="size-4 text-muted-foreground/50 group-hover:text-accent group-hover:translate-x-0.5 transition-all shrink-0" />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
