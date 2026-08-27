import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { adminFetch } from '@/lib/admin-fetch';
import { StatsCards } from '@/components/admin/StatsCards';
import { LayoutDashboard, Users, CreditCard, FileText } from 'lucide-react';
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
    { href: '/admin/socios', label: 'Gestionar Socios', icon: Users, color: 'bg-blue-500', roles: ['ADMIN'] as const },
    { href: '/admin/pagos', label: 'Ver Pagos', icon: CreditCard, color: 'bg-green-500', roles: ['ADMIN'] as const },
    { href: '/admin/reportes', label: 'Reportes', icon: FileText, color: 'bg-purple-500', roles: ['ADMIN'] as const },
    { href: '/admin/clubes', label: 'Gestionar Clubes', icon: Users, color: 'bg-blue-500', roles: ['SUPER_ADMIN'] as const },
    { href: '/admin/usuarios', label: 'Gestionar Usuarios', icon: Users, color: 'bg-green-500', roles: ['SUPER_ADMIN'] as const },
  ];

  const filteredQuickActions = quickActions.filter(action => 
    action.roles.some(r => r === session.user.role)
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex size-12 items-center justify-center rounded-xl bg-accent/10">
          <LayoutDashboard className="size-6 text-accent" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Panel de Control</h1>
          <p className="text-muted-foreground">
            Resumen del club y métricas del mes en curso.
          </p>
        </div>
      </div>

      {/* Stats */}
      <StatsCards data={data} />

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Accesos Rápidos</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredQuickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="group flex items-center gap-4 rounded-xl border bg-card p-4 hover:shadow-md transition-all"
              >
                <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${action.color} text-white`}>
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold group-hover:text-accent transition-colors truncate">
                    {action.label}
                  </h3>
                  <p className="text-sm text-muted-foreground truncate">Ir a {action.label.toLowerCase()}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
