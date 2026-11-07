import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { adminFetch } from '@/lib/admin-fetch';
import { MorosidadReport } from '@/components/admin/MorosidadReport';
import type { MorosidadReportResponse } from '@/types/report';

export const dynamic = 'force-dynamic';

async function getInitialData(): Promise<MorosidadReportResponse> {
  const now = new Date();
  const response = await adminFetch(
    `/api/admin/reports/morosidad?page=1&limit=20&month=${now.getMonth() + 1}&year=${now.getFullYear()}`,
    'Failed to load morosidad report'
  );
  return response.json();
}

export default async function MorosidadReportPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
    redirect('/login');
  }
  const initialData = await getInitialData();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Morosidad por antigüedad</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Socios con cuotas vencidas agrupados por días de atraso.
        </p>
      </div>
      <MorosidadReport initialData={initialData} />
    </div>
  );
}