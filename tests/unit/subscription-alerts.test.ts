import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateDaysUntilDue,
  calculateDaysOverdue,
  getInstitutionSubscriptionAlert,
  getOverdueInstitutions,
} from '@/lib/saas-subscription-alert';

function makeInvoice(opts: {
  id?: string;
  institutionId?: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
  dueDate: Date;
  month?: number;
  year?: number;
  amount?: number;
}) {
  return {
    id: opts.id ?? 'inv-1',
    institutionId: opts.institutionId ?? 'club-1',
    saasPlanId: 'plan-1',
    month: opts.month ?? 11,
    year: opts.year ?? 2026,
    amount: opts.amount ?? 35000,
    status: opts.status,
    dueDate: opts.dueDate,
    paidAt: opts.status === 'PAID' ? opts.dueDate : null,
    paymentMethod: null,
    transferRef: null,
    gatewayPaymentId: null,
    remindersSent: 0,
    lastReminderAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function createMockClient({
  invoice = null,
  overdueInvoices = [],
  dueSoonDays,
}: {
  invoice?: ReturnType<typeof makeInvoice> | null;
  overdueInvoices?: Array<{ institutionId: string; name: string; dueDate: Date }>;
  dueSoonDays?: string | null;
} = {}) {
  const siteConfigValues: Record<string, string | null> = {
    saas_due_soon_days: dueSoonDays ?? null,
  };

  return {
    siteConfig: {
      findFirst: vi.fn(async ({ where: { key } }: { where: { key: string } }) => {
        const value = siteConfigValues[key];
        return value !== undefined && value !== null
          ? { id: `cfg-${key}`, clubId: null, key, value }
          : null;
      }),
    },
    saasInvoice: {
      findUnique: vi.fn(async (args: { where: { institutionId_month_year: { institutionId: string; month: number; year: number } } }) => {
        if (!invoice) return null;
        const { institutionId, month, year } = args.where.institutionId_month_year;
        if (
          invoice.institutionId === institutionId &&
          invoice.month === month &&
          invoice.year === year
        ) {
          return invoice;
        }
        return null;
      }),
      findMany: vi.fn(async () =>
        overdueInvoices.map((inv, idx) => ({
          id: `inv-${idx}`,
          institutionId: inv.institutionId,
          institution: { id: inv.institutionId, name: inv.name },
          dueDate: inv.dueDate,
          saasPlanId: 'plan-1',
          month: inv.dueDate.getUTCMonth() + 1,
          year: inv.dueDate.getUTCFullYear(),
          amount: 35000,
          status: 'OVERDUE',
          paidAt: null,
          paymentMethod: null,
          transferRef: null,
          gatewayPaymentId: null,
          remindersSent: 0,
          lastReminderAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }))
      ),
    },
  } as unknown as NonNullable<Parameters<typeof getInstitutionSubscriptionAlert>[2]>;
}

describe('calculateDaysUntilDue', () => {
  it('returns 0 when the due date is today', () => {
    const now = new Date('2026-11-10T12:00:00.000Z');
    const due = new Date('2026-11-10T00:00:00.000Z');
    expect(calculateDaysUntilDue(due, now)).toBe(0);
  });

  it('returns N exactly N days before the due date (inclusive boundary)', () => {
    const now = new Date('2026-11-05T12:00:00.000Z');
    const due = new Date('2026-11-10T00:00:00.000Z');
    expect(calculateDaysUntilDue(due, now)).toBe(5);
  });

  it('returns N+1 when the due date is one day past the N-day window (exclusive)', () => {
    const now = new Date('2026-11-04T12:00:00.000Z');
    const due = new Date('2026-11-10T00:00:00.000Z');
    expect(calculateDaysUntilDue(due, now)).toBe(6);
  });
});

describe('calculateDaysOverdue', () => {
  it('returns 0 on the due date', () => {
    const now = new Date('2026-11-10T12:00:00.000Z');
    const due = new Date('2026-11-10T00:00:00.000Z');
    expect(calculateDaysOverdue(due, now)).toBe(0);
  });

  it('returns the number of whole days past the due date', () => {
    const now = new Date('2026-11-15T12:00:00.000Z');
    const due = new Date('2026-11-10T00:00:00.000Z');
    expect(calculateDaysOverdue(due, now)).toBe(5);
  });
});

describe('getInstitutionSubscriptionAlert', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows due-soon inside the configured window', async () => {
    const now = new Date('2026-11-05T12:00:00.000Z');
    const due = new Date('2026-11-10T00:00:00.000Z');
    const client = createMockClient({
      invoice: makeInvoice({ status: 'PENDING', dueDate: due }),
      dueSoonDays: '5',
    });

    const result = await getInstitutionSubscriptionAlert('club-1', now, client);

    expect(result.status).toBe('due-soon');
    expect(result.invoice).not.toBeNull();
    if (result.status === 'due-soon') {
      expect(result.invoice.daysUntilDue).toBe(5);
    }
  });

  it('does not show due-soon outside the configured window', async () => {
    const now = new Date('2026-11-04T12:00:00.000Z');
    const due = new Date('2026-11-10T00:00:00.000Z');
    const client = createMockClient({
      invoice: makeInvoice({ status: 'PENDING', dueDate: due }),
      dueSoonDays: '5',
    });

    const result = await getInstitutionSubscriptionAlert('club-1', now, client);

    expect(result.status).toBe('ok');
  });

  it('falls back to the default window when saas_due_soon_days is unset', async () => {
    const now = new Date('2026-11-05T12:00:00.000Z');
    const due = new Date('2026-11-10T00:00:00.000Z');
    const client = createMockClient({
      invoice: makeInvoice({ status: 'PENDING', dueDate: due }),
    });

    const result = await getInstitutionSubscriptionAlert('club-1', now, client);

    expect(client.siteConfig.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { clubId: null, key: 'saas_due_soon_days' } })
    );
    expect(result.status).toBe('due-soon');
  });

  it('returns overdue with the correct day count', async () => {
    const now = new Date('2026-11-15T12:00:00.000Z');
    const due = new Date('2026-11-10T00:00:00.000Z');
    const client = createMockClient({
      invoice: makeInvoice({ status: 'OVERDUE', dueDate: due }),
    });

    const result = await getInstitutionSubscriptionAlert('club-1', now, client);

    expect(result.status).toBe('overdue');
    if (result.status === 'overdue') {
      expect(result.invoice.daysOverdue).toBe(5);
    }
  });

  it('returns ok for paid invoices', async () => {
    const now = new Date('2026-11-05T12:00:00.000Z');
    const due = new Date('2026-11-10T00:00:00.000Z');
    const client = createMockClient({
      invoice: makeInvoice({ status: 'PAID', dueDate: due }),
    });

    const result = await getInstitutionSubscriptionAlert('club-1', now, client);

    expect(result.status).toBe('ok');
  });

  it('only ever returns the requested institution alert (institution scoping)', async () => {
    const now = new Date('2026-11-05T12:00:00.000Z');
    const due = new Date('2026-11-10T00:00:00.000Z');
    const client = createMockClient({
      invoice: makeInvoice({ status: 'PENDING', dueDate: due }),
    });

    const result = await getInstitutionSubscriptionAlert('club-2', now, client);

    expect(result.status).toBe('ok');
    expect(client.saasInvoice.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          institutionId_month_year: {
            institutionId: 'club-2',
            month: 11,
            year: 2026,
          },
        },
      })
    );
  });

  it('respects a custom due-soon window from configuration', async () => {
    const now = new Date('2026-11-08T12:00:00.000Z');
    const due = new Date('2026-11-10T00:00:00.000Z');
    const client = createMockClient({
      invoice: makeInvoice({ status: 'PENDING', dueDate: due }),
      dueSoonDays: '2',
    });

    const result = await getInstitutionSubscriptionAlert('club-1', now, client);

    expect(result.status).toBe('due-soon');
  });
});

describe('getOverdueInstitutions', () => {
  it('returns unique institutions with their oldest overdue invoice', async () => {
    const now = new Date('2026-11-15T12:00:00.000Z');
    const client = createMockClient({
      overdueInvoices: [
        { institutionId: 'club-1', name: 'Club Libre', dueDate: new Date('2026-11-10T00:00:00.000Z') },
        { institutionId: 'club-2', name: 'Club Pro', dueDate: new Date('2026-11-05T00:00:00.000Z') },
        { institutionId: 'club-1', name: 'Club Libre', dueDate: new Date('2026-11-12T00:00:00.000Z') },
      ],
    });

    const result = await getOverdueInstitutions(now, client);

    expect(result).toHaveLength(2);
    const club1 = result.find((r) => r.institutionId === 'club-1');
    const club2 = result.find((r) => r.institutionId === 'club-2');
    expect(club1).toEqual(
      expect.objectContaining({ name: 'Club Libre', count: 2, daysOverdue: 5 })
    );
    expect(club2).toEqual(
      expect.objectContaining({ name: 'Club Pro', count: 1, daysOverdue: 10 })
    );
    expect(result[0].institutionId).toBe('club-2');
  });

  it('returns an empty array when no invoices are overdue', async () => {
    const client = createMockClient({ overdueInvoices: [] });
    const result = await getOverdueInstitutions(new Date(), client);
    expect(result).toEqual([]);
  });
});
