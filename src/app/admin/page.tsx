import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { StatsCards } from '@/components/admin/StatsCards';

interface DashboardData {
  totalSocios: number;
  cuotasPendientes: number;
  cuotasVencidas: number;
  pagosMes: number;
  comisionesMes: number;
}

async function getDashboardData(): Promise<DashboardData> {
  const origin = process.env.NEXT_PUBLIC_URL ?? 'http://localhost:3000';
  const response = await fetch(`${origin}/api/admin/dashboard`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to load dashboard metrics');
  }

  return response.json();
}

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.role || session.user.role !== 'ADMIN') {
    redirect('/admin/login');
  }

  const data = await getDashboardData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Panel</h1>
        <p className="text-muted-foreground">
          Resumen del club y métricas del mes en curso.
        </p>
      </div>

      <StatsCards data={data} />
    </div>
  );
}
