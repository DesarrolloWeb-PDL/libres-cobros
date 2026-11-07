import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { adminFetch } from '@/lib/admin-fetch';
import { ByConceptReport } from '@/components/admin/ByConceptReport';
import type { ByConceptReportResponse } from '@/types/report';

export const dynamic = 'force-dynamic';

async function getInitialData(): Promise<ByConceptReportResponse> {
  const now = new Date();
  const response = await adminFetch(
    `/api/admin/reports/conceptos?page=1&limit=20&month=${now.getMonth() + 1}&year=${now.getFullYear()}`,
    'Failed to load concept report'
  );
  return response.json();
}

export default async function ConceptReportPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
    redirect('/login');
  }
  const initialData = await getInitialData();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Reporte por concepto</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Cuotas agrupadas por plan y categoría.
        </p>
      </div>
      <ByConceptReport initialData={initialData} />
    </div>
  );
}