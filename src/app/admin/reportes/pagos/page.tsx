import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { adminFetch } from '@/lib/admin-fetch';
import { PaymentReport } from '@/components/admin/PaymentReport';
import type { PaymentReportResponse } from '@/types/report';

export const dynamic = 'force-dynamic';

async function getInitialPayments(): Promise<PaymentReportResponse> {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const response = await adminFetch(
    `/api/admin/reports/payments?page=1&limit=20&from=${firstDay.toISOString()}&to=${lastDay.toISOString()}`,
    'Failed to load payment report'
  );

  return response.json();
}

export default async function PaymentReportPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.role || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
    redirect('/admin/login');
  }

  const initialData = await getInitialPayments();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Historial de pagos</h1>
        <p className="text-muted-foreground">
          Pagos confirmados con filtros por período, método y socio.
        </p>
      </div>

      <PaymentReport initialData={initialData} />
    </div>
  );
}
