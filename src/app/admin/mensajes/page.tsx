import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { adminFetch } from '@/lib/admin-fetch';
import { MassMessageForm } from '@/components/admin/MassMessageForm';
import { MessageHistory } from '@/components/admin/MessageHistory';
import type { PlanListResponse } from '@/types/fee';
import type { MassMessageHistoryResponse } from '@/types/messaging';

async function getHistory(): Promise<MassMessageHistoryResponse> {
  const response = await adminFetch(
    '/api/admin/messaging?limit=50',
    'Failed to load message history'
  );
  return response.json();
}

async function getPlans(): Promise<PlanListResponse> {
  const response = await adminFetch('/api/admin/plans', 'Failed to load plans');
  return response.json();
}

export default async function MessagesPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.role || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
    redirect('/login');
  }

  const [history, plans] = await Promise.all([getHistory(), getPlans()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Mensajes</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Envío de mensajes masivos a socios con variables personalizadas.
        </p>
      </div>

      <MassMessageForm initialPlans={plans.data} />
      <MessageHistory history={history} />
    </div>
  );
}
