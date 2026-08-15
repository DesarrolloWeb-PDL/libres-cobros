import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { PaymentList } from '@/components/admin/PaymentList';
import type { PaymentListResponse } from '@/types/payment';

async function getInitialPayments(): Promise<PaymentListResponse> {
  const origin = process.env.NEXT_PUBLIC_URL ?? 'http://localhost:3000';
  const response = await fetch(`${origin}/api/admin/payments?page=1&limit=20`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to load payments');
  }

  return response.json();
}

export default async function PaymentsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.role || session.user.role !== 'ADMIN') {
    redirect('/admin/login');
  }

  const initialData = await getInitialPayments();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pagos</h1>
        <p className="text-muted-foreground">
          Historial de pagos, transferencias pendientes y confirmaciones.
        </p>
      </div>

      <PaymentList initialData={initialData} />
    </div>
  );
}
