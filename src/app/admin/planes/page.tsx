import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { adminFetch } from '@/lib/admin-fetch';
import { PlanList } from '@/components/admin/PlanList';
import type { PlanListResponse } from '@/types/fee';

async function getInitialPlans(): Promise<PlanListResponse> {
  const response = await adminFetch(
    '/api/admin/plans',
    'Failed to load plans'
  );

  return response.json();
}

export default async function PlansPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.role || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
    redirect('/login');
  }

  const initialData = await getInitialPlans();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Planes</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Gestión de planes de cuota de la institución.
        </p>
      </div>

      <PlanList initialData={initialData} />
    </div>
  );
}
