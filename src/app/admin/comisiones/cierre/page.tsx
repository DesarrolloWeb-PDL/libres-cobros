import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { MonthlyClosingForm } from '@/components/admin/MonthlyClosingForm';
import type { CommissionListResponse, MonthlyClosingListResponse } from '@/types/commission';

export const dynamic = 'force-dynamic';

function buildOrigin(): string {
  return process.env.NEXT_PUBLIC_URL ?? 'http://localhost:3000';
}

async function getClosings(): Promise<MonthlyClosingListResponse> {
  const response = await fetch(`${buildOrigin()}/api/admin/closings`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to load closings');
  }

  return response.json();
}

async function getInitialPreview(): Promise<CommissionListResponse> {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const response = await fetch(
    `${buildOrigin()}/api/admin/reports/commissions?month=${month}&year=${year}&unassigned=true&limit=1000`,
    {
      cache: 'no-store',
    }
  );

  if (!response.ok) {
    throw new Error('Failed to load preview');
  }

  return response.json();
}

export default async function ClosingPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.role || session.user.role !== 'ADMIN') {
    redirect('/admin/login');
  }

  const [initialClosings, initialPreview] = await Promise.all([
    getClosings(),
    getInitialPreview(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cierre mensual</h1>
        <p className="text-muted-foreground">
          Seleccioná un período, revisá las comisiones pendientes y cerrá el mes.
        </p>
      </div>

      <MonthlyClosingForm
        initialClosings={initialClosings}
        initialPreview={initialPreview}
      />
    </div>
  );
}
