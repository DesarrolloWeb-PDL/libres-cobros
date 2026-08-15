import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { DebtReport } from '@/components/admin/DebtReport';
import type { DebtReportResponse } from '@/types/report';

export const dynamic = 'force-dynamic';

async function getInitialDebts(): Promise<DebtReportResponse> {
  const origin = process.env.NEXT_PUBLIC_URL ?? 'http://localhost:3000';
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const response = await fetch(
    `${origin}/api/admin/reports/debts?page=1&limit=20&month=${month}&year=${year}`,
    {
      cache: 'no-store',
    }
  );

  if (!response.ok) {
    throw new Error('Failed to load debt report');
  }

  return response.json();
}

export default async function DebtReportPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.role || session.user.role !== 'ADMIN') {
    redirect('/admin/login');
  }

  const initialData = await getInitialDebts();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reporte de deudas</h1>
        <p className="text-muted-foreground">
          Socios con cuotas pendientes o vencidas y monto total adeudado.
        </p>
      </div>

      <DebtReport initialData={initialData} />
    </div>
  );
}
