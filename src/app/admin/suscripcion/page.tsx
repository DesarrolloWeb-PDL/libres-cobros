import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { adminFetch } from '@/lib/admin-fetch';
import { AdminSubscriptionPanel } from '@/components/admin/AdminSubscriptionPanel';
import type { SaasSubscriptionDetailResponse } from '@/types/saas';

export const dynamic = 'force-dynamic';

async function getSubscription(institutionId: string): Promise<SaasSubscriptionDetailResponse> {
  const response = await adminFetch(
    `/api/admin/saas/institutions/${institutionId}/subscription`,
    'Failed to load subscription'
  );
  return response.json();
}

export default async function AdminSubscriptionPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.role || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
    redirect('/login');
  }

  if (session.user.role === 'SUPER_ADMIN') {
    redirect('/admin/saas/suscripciones');
  }

  if (!session.user.institutionId) {
    redirect('/admin');
  }

  const initialData = await getSubscription(session.user.institutionId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Mi suscripción</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Plan actual, solicitudes de cambio y facturas de tu institución.
        </p>
      </div>

      <AdminSubscriptionPanel institutionId={session.user.institutionId} initialData={initialData} />
    </div>
  );
}
