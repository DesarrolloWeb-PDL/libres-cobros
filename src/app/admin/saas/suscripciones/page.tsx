import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { adminFetch } from '@/lib/admin-fetch';
import { SaasSubscriptionPanel } from '@/components/admin/SaasSubscriptionPanel';
import { getOverdueInstitutions } from '@/lib/saas-subscription-alert';
import type {
  SaasPlanChangeRequestListResponse,
  SaasSubscriptionListResponse,
  SaasInvoiceListResponse,
} from '@/types/saas';
import type { OverdueInstitution } from '@/lib/saas-subscription-alert';

export const dynamic = 'force-dynamic';

async function getInitialData(): Promise<{
  requests: SaasPlanChangeRequestListResponse;
  subscriptions: SaasSubscriptionListResponse;
  invoices: SaasInvoiceListResponse;
  overdue: OverdueInstitution[];
}> {
  const [requestsRes, subscriptionsRes, invoicesRes] = await Promise.all([
    adminFetch('/api/admin/saas/change-requests', 'Failed to load change requests'),
    adminFetch('/api/admin/saas/subscriptions', 'Failed to load subscriptions'),
    adminFetch('/api/admin/saas/invoices', 'Failed to load invoices'),
  ]);

  const [requests, subscriptions, invoices] = await Promise.all([
    requestsRes.json(),
    subscriptionsRes.json(),
    invoicesRes.json(),
  ]);

  const overdue = await getOverdueInstitutions();

  return { requests, subscriptions, invoices, overdue };
}

export default async function SaasSubscriptionsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.role || session.user.role !== 'SUPER_ADMIN') {
    redirect('/login');
  }

  const { requests, subscriptions, invoices, overdue } = await getInitialData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Suscripciones SaaS</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Solicitudes, suscripciones activas y facturación de instituciones.
        </p>
      </div>

      <SaasSubscriptionPanel
        initialRequests={requests}
        initialSubscriptions={subscriptions}
        initialInvoices={invoices}
        initialOverdue={overdue}
      />
    </div>
  );
}
