import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { CommissionReport } from '@/components/admin/CommissionReport';
import { Button } from '@/components/ui/button';
import { Lock } from 'lucide-react';
import type { CommissionListResponse } from '@/types/commission';

export const dynamic = 'force-dynamic';

async function getInitialCommissions(): Promise<CommissionListResponse> {
  const origin = process.env.NEXT_PUBLIC_URL ?? 'http://localhost:3000';
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const response = await fetch(
    `${origin}/api/admin/reports/commissions?page=1&limit=20&month=${month}&year=${year}`,
    {
      cache: 'no-store',
    }
  );

  if (!response.ok) {
    throw new Error('Failed to load commissions');
  }

  return response.json();
}

export default async function CommissionsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.role || session.user.role !== 'ADMIN') {
    redirect('/admin/login');
  }

  const initialData = await getInitialCommissions();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Comisiones</h1>
          <p className="text-muted-foreground">
            Reporte de comisiones generadas por pagos confirmados.
          </p>
        </div>

        <Button render={<Link href="/admin/comisiones/cierre" />} variant="outline" className="gap-2">
          <Lock className="size-4" />
          Cierre mensual
        </Button>
      </div>

      <CommissionReport initialData={initialData} />
    </div>
  );
}
