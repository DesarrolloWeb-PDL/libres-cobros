import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SaasSubscriptionPanel } from '@/components/admin/SaasSubscriptionPanel';
import type {
  SaasPlanChangeRequestListResponse,
  SaasSubscriptionListResponse,
  SaasInvoiceListResponse,
} from '@/types/saas';
import type { OverdueInstitution } from '@/lib/saas-subscription-alert';

const requests: SaasPlanChangeRequestListResponse = {
  data: [
    {
      id: 'req-1',
      institutionId: 'club-1',
      institution: { id: 'club-1', name: 'Club Libre' },
      requestedSaasPlanId: 'plan-2',
      requestedSaasPlan: { id: 'plan-2', name: '51 a 200', priceArs: 35000, maxMembers: 200 },
      status: 'PENDING',
      createdAt: '2026-11-01T00:00:00.000Z',
      updatedAt: '2026-11-01T00:00:00.000Z',
    },
  ],
};

const subscriptions: SaasSubscriptionListResponse = {
  data: [
    {
      id: 'sub-1',
      institutionId: 'club-1',
      institution: { id: 'club-1', name: 'Club Libre' },
      saasPlanId: 'plan-1',
      saasPlan: { id: 'plan-1', name: 'Hasta 50', priceArs: 0, maxMembers: 50 },
      pendingSaasPlanId: null,
      pendingSaasPlan: null,
      status: 'ACTIVE',
      createdAt: '2026-11-01T00:00:00.000Z',
      updatedAt: '2026-11-01T00:00:00.000Z',
    },
  ],
};

const invoices: SaasInvoiceListResponse = {
  data: [
    {
      id: 'inv-1',
      institutionId: 'club-1',
      institution: { id: 'club-1', name: 'Club Libre' },
      saasPlanId: 'plan-1',
      saasPlan: { id: 'plan-1', name: 'Hasta 50' },
      month: 11,
      year: 2026,
      amount: 0,
      status: 'PAID',
      dueDate: '2026-11-11T00:00:00.000Z',
      paidAt: '2026-11-01T00:00:00.000Z',
      paymentMethod: null,
      transferRef: null,
      remindersSent: 0,
      createdAt: '2026-11-01T00:00:00.000Z',
      updatedAt: '2026-11-01T00:00:00.000Z',
    },
  ],
};

describe('SaasSubscriptionPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (globalThis as { fetch?: unknown }).fetch;
  });

  it('renders requests, subscriptions and invoices tabs', () => {
    render(
      <SaasSubscriptionPanel
        initialRequests={requests}
        initialSubscriptions={subscriptions}
        initialInvoices={invoices}
      />
    );

    expect(screen.getByRole('tab', { name: /solicitudes/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /suscripciones/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /facturas/i })).toBeInTheDocument();
    expect(screen.getByText('Club Libre')).toBeInTheDocument();
  });

  it('approves a pending change request', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    });
    global.fetch = fetchMock as unknown as typeof global.fetch;

    render(
      <SaasSubscriptionPanel
        initialRequests={requests}
        initialSubscriptions={subscriptions}
        initialInvoices={invoices}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /aprobar/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/admin/saas/change-requests/req-1/decide',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"decision":"APPROVED"'),
        })
      );
    });
  });

  it('renders an overdue alert when institutions have overdue invoices', () => {
    const overdue: OverdueInstitution[] = [
      {
        institutionId: 'club-1',
        name: 'Club Libre',
        count: 1,
        oldestDueDate: new Date('2026-11-05T00:00:00.000Z'),
        daysOverdue: 3,
      },
    ];

    render(
      <SaasSubscriptionPanel
        initialRequests={requests}
        initialSubscriptions={subscriptions}
        initialInvoices={invoices}
        initialOverdue={overdue}
      />
    );

    expect(screen.getByText(/Instituciones con facturas vencidas/i)).toBeInTheDocument();
    expect(screen.getByRole('listitem')).toHaveTextContent(
      /Club Libre — 1 factura vencida · hace 3 días/
    );
  });
});
