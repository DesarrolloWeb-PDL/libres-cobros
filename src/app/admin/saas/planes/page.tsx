import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { adminFetch } from '@/lib/admin-fetch';
import { SaasPlanList } from '@/components/admin/SaasPlanList';
import type { SaasPlanListResponse } from '@/types/saas';

export const dynamic = 'force-dynamic';

async function getInitialPlans(): Promise<SaasPlanListResponse> {
  const response = await adminFetch('/api/admin/saas/plans', 'Failed to load SaaS plans');
  return response.json();
}

export default async function SaasPlansPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.role || session.user.role !== 'SUPER_ADMIN') {
    redirect('/login');
  }

  const initialData = await getInitialPlans();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Planes SaaS</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Catálogo de planes para la suscripción de instituciones.
        </p>
      </div>

      <SaasPlanList initialData={initialData} />
    </div>
  );
}
