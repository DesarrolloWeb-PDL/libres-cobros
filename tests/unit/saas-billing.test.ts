import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runSaasBilling, checkTierAlert } from '@/lib/saas-billing';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn().mockResolvedValue({ externalId: 'msg-test' }),
}));

vi.mock('@/lib/whatsapp', () => ({
  sendWhatsAppMessage: vi.fn().mockResolvedValue({ externalId: 'wa-test' }),
}));

const planFree = {
  id: 'plan-free',
  name: 'Up to 50 members',
  minMembers: 0,
  maxMembers: 50,
  priceArs: 0,
  isActive: true,
};

const plan200 = {
  id: 'plan-200',
  name: '51 to 200 members',
  minMembers: 51,
  maxMembers: 200,
  priceArs: 35000,
  isActive: true,
};

const plan800 = {
  id: 'plan-800',
  name: '201 to 800 members',
  minMembers: 201,
  maxMembers: 800,
  priceArs: 85000,
  isActive: true,
};

function makeSubscription(opts: {
  currentPlan: typeof plan200;
  pendingPlan?: typeof plan800;
  institutionId?: string;
}) {
  const institutionId = opts.institutionId ?? 'club-1';
  return {
    id: `sub-${institutionId}`,
    institutionId,
    saasPlanId: opts.currentPlan.id,
    pendingSaasPlanId: opts.pendingPlan?.id ?? null,
    status: 'ACTIVE',
    saasPlan: opts.currentPlan,
    pendingSaasPlan: opts.pendingPlan ?? null,
  };
}

function createMockClient(
  opts: {
    enabled?: string;
    billingDay?: string;
    reminderDays?: string;
    subscriptions?: ReturnType<typeof makeSubscription>[];
    existingInvoice?: Record<string, unknown> | null;
    overdueCount?: number;
    overdueInvoices?: Array<Record<string, unknown>>;
    freePlan?: typeof planFree | null;
    clubFindUniqueError?: Error;
  } = {}
) {
  const {
    enabled = 'true',
    billingDay = '1',
    reminderDays = '1,7,15',
    subscriptions = [],
    existingInvoice = null,
    overdueCount = 0,
    overdueInvoices = [],
    freePlan = planFree,
    clubFindUniqueError,
  } = opts;

  const club = {
    id: 'club-1',
    name: 'Test Club',
    slug: 'test-club',
    status: 'ACTIVE',
    phone: '541112345678',
    saasSubscriptions: subscriptions,
    adminUsers: [{ email: 'admin@club.com', name: 'Admin' }],
  };

  const siteConfigValues: Record<string, string> = {
    saas_billing_enabled: enabled,
    saas_billing_day: billingDay,
    saas_reminder_days: reminderDays,
    resend_api_key: 're_test',
    resend_from_email: 'billing@example.com',
    saas_whatsapp_phone_number_id: 'wa-phone-id',
    saas_whatsapp_access_token: 'wa-token',
    next_public_url: 'https://example.com',
  };

  return {
    siteConfig: {
      findFirst: vi.fn(async ({ where: { key } }: { where: { key: string } }) => {
        const value = siteConfigValues[key];
        return value !== undefined ? { id: `cfg-${key}`, clubId: null, key, value } : null;
      }),
    },
    club: {
      findMany: vi.fn(async () => (subscriptions.length > 0 ? [club] : [])),
      findUnique: vi.fn(async () => {
        if (clubFindUniqueError) throw clubFindUniqueError;
        return club;
      }),
    },
    saasSubscription: {
      update: vi.fn(async (args: { data: Record<string, unknown> }) => ({
        ...subscriptions[0],
        ...args.data,
      })),
    },
    saasInvoice: {
      create: vi.fn(async (args: { data: Record<string, unknown> }) => ({
        id: 'inv-new',
        remindersSent: 0,
        lastReminderAt: null,
        ...args.data,
      })),
      findFirst: vi.fn(async () => existingInvoice),
      findMany: vi.fn(async () => overdueInvoices),
      updateMany: vi.fn(async () => ({ count: overdueCount })),
      update: vi.fn(
        async (args: {
          where: { id: string };
          data: Record<string, unknown>;
        }) => {
          const target = overdueInvoices.find((i) => i.id === args.where.id);
          if (target) {
            if (args.data.lastReminderAt !== undefined) {
              target.lastReminderAt = args.data.lastReminderAt as Date;
            }
            const increment = (args.data.remindersSent as { increment?: number })?.increment;
            if (typeof increment === 'number') {
              target.remindersSent = ((target.remindersSent as number) ?? 0) + increment;
            }
          }
          return { id: args.where.id, ...args.data };
        }
      ),
    },
    saasPlan: {
      findFirst: vi.fn(async () => freePlan),
    },
    adminUser: {
      findMany: vi.fn(async () => []),
    },
    smsLog: {
      create: vi.fn(async () => ({ id: 'log-1' })),
    },
  } as unknown as Parameters<typeof runSaasBilling>[0];
}

describe('runSaasBilling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns early when saas_billing_enabled is not true', async () => {
    const client = createMockClient({ enabled: 'false' });
    const result = await runSaasBilling(client, new Date('2026-11-01T03:00:00Z'));

    expect(result.enabled).toBe(false);
    expect(result.created).toBe(0);
    expect(client.club.findMany).not.toHaveBeenCalled();
  });

  it('is a no-op when the run date is not the configured billing day', async () => {
    const client = createMockClient({ billingDay: '15' });
    const result = await runSaasBilling(client, new Date('2026-11-01T03:00:00Z'));

    expect(result.isBillingDay).toBe(false);
    expect(result.created).toBe(0);
    expect(client.saasInvoice.create).not.toHaveBeenCalled();
  });

  it('creates one invoice per active subscription on the billing day', async () => {
    const client = createMockClient({
      subscriptions: [makeSubscription({ currentPlan: plan200 })],
    });
    const result = await runSaasBilling(client, new Date('2026-11-01T03:00:00Z'));

    expect(result.created).toBe(1);
    expect(client.saasInvoice.create).toHaveBeenCalledTimes(1);
    expect(client.saasInvoice.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          institutionId: 'club-1',
          saasPlanId: plan200.id,
          amount: 35000,
          month: 11,
          year: 2026,
          status: 'PENDING',
          dueDate: expect.any(Date),
        }),
      })
    );
  });

  it('skips ARS 0 plans and does not create an invoice', async () => {
    const client = createMockClient({
      subscriptions: [makeSubscription({ currentPlan: planFree })],
    });
    const result = await runSaasBilling(client, new Date('2026-11-01T03:00:00Z'));

    expect(result.skippedZero).toBe(1);
    expect(result.created).toBe(0);
    expect(client.saasInvoice.create).not.toHaveBeenCalled();
  });

  it('is idempotent for the same institution, month and year', async () => {
    const client = createMockClient({
      subscriptions: [makeSubscription({ currentPlan: plan200 })],
      existingInvoice: {
        id: 'inv-existing',
        institutionId: 'club-1',
        month: 11,
        year: 2026,
      },
    });
    const result = await runSaasBilling(client, new Date('2026-11-01T03:00:00Z'));

    expect(result.created).toBe(0);
    expect(result.existing).toBe(1);
    expect(client.saasInvoice.create).not.toHaveBeenCalled();
  });

  it('applies an approved pending plan change and bills the new price', async () => {
    const sub = makeSubscription({ currentPlan: plan200, pendingPlan: plan800 });
    const client = createMockClient({ subscriptions: [sub] });
    const result = await runSaasBilling(client, new Date('2026-11-01T03:00:00Z'));

    expect(client.saasSubscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          saasPlanId: plan800.id,
          pendingSaasPlanId: null,
        },
      })
    );
    expect(result.created).toBe(1);
    expect(client.saasInvoice.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          saasPlanId: plan800.id,
          amount: 85000,
        }),
      })
    );
  });

  it('sweeps PENDING invoices past their due date to OVERDUE', async () => {
    const client = createMockClient({ overdueCount: 3 });
    const result = await runSaasBilling(client, new Date('2026-11-01T03:00:00Z'));

    expect(client.saasInvoice.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'PENDING',
          dueDate: { lt: expect.any(Date) },
        }),
        data: { status: 'OVERDUE' },
      })
    );
    expect(result.overdue).toBe(3);
  });

  it('sends reminders on configured cadence days and dedupes same-day runs', async () => {
    const invoice = {
      id: 'inv-1',
      institutionId: 'club-1',
      amount: 35000,
      dueDate: new Date('2026-10-21T00:00:00.000Z'),
      lastReminderAt: null,
      remindersSent: 0,
      status: 'OVERDUE',
      institution: {
        id: 'club-1',
        name: 'Test Club',
        phone: '541112345678',
        adminUsers: [{ email: 'admin@club.com', name: 'Admin' }],
      },
      saasPlan: plan200,
    };
    const client = createMockClient({
      subscriptions: [makeSubscription({ currentPlan: plan200 })],
      overdueInvoices: [invoice],
      reminderDays: '1,7,15',
    });

    const result = await runSaasBilling(client, new Date('2026-10-22T00:00:00.000Z'));
    expect(result.remindersSent).toBe(1);
    expect(client.saasInvoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'inv-1' },
        data: expect.objectContaining({
          lastReminderAt: expect.any(Date),
          remindersSent: { increment: 1 },
        }),
      })
    );

    const result2 = await runSaasBilling(client, new Date('2026-10-22T15:00:00.000Z'));
    expect(result2.remindersSent).toBe(0);
  });

  it('sends WhatsApp reminders when platform credentials are configured and institution has a phone', async () => {
    const invoice = {
      id: 'inv-1',
      institutionId: 'club-1',
      amount: 35000,
      dueDate: new Date('2026-10-21T00:00:00.000Z'),
      lastReminderAt: null,
      remindersSent: 0,
      status: 'OVERDUE',
      institution: {
        id: 'club-1',
        name: 'Test Club',
        phone: '541112345678',
        adminUsers: [{ email: 'admin@club.com', name: 'Admin' }],
      },
      saasPlan: plan200,
    };
    const client = createMockClient({
      subscriptions: [makeSubscription({ currentPlan: plan200 })],
      overdueInvoices: [invoice],
      reminderDays: '1,7,15',
    });

    const result = await runSaasBilling(client, new Date('2026-10-22T00:00:00.000Z'));
    expect(result.whatsappRemindersSent).toBe(1);
    expect(result.whatsappReminderErrors).toBe(0);
    expect(sendWhatsAppMessage).toHaveBeenCalledWith(
      'wa-phone-id',
      'wa-token',
      '541112345678',
      expect.stringContaining('Test Club')
    );
    expect(client.smsLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          clubId: 'club-1',
          memberId: null,
          type: 'saas_invoice_reminder_whatsapp',
          status: 'SENT',
          externalId: 'wa-test',
        }),
      })
    );
  });

  it('skips WhatsApp when the institution has no phone', async () => {
    const invoice = {
      id: 'inv-1',
      institutionId: 'club-1',
      amount: 35000,
      dueDate: new Date('2026-10-21T00:00:00.000Z'),
      lastReminderAt: null,
      remindersSent: 0,
      status: 'OVERDUE',
      institution: {
        id: 'club-1',
        name: 'Test Club',
        phone: null,
        adminUsers: [{ email: 'admin@club.com', name: 'Admin' }],
      },
      saasPlan: plan200,
    };
    const client = createMockClient({
      subscriptions: [makeSubscription({ currentPlan: plan200 })],
      overdueInvoices: [invoice],
      reminderDays: '1,7,15',
    });

    const result = await runSaasBilling(client, new Date('2026-10-22T00:00:00.000Z'));
    expect(result.remindersSent).toBe(1);
    expect(result.whatsappRemindersSent).toBe(0);
    expect(sendWhatsAppMessage).not.toHaveBeenCalled();
  });

  it('logs WhatsApp failures without breaking email reminders or the cron', async () => {
    vi.mocked(sendWhatsAppMessage).mockRejectedValueOnce(new Error('WhatsApp down'));

    const invoice = {
      id: 'inv-1',
      institutionId: 'club-1',
      amount: 35000,
      dueDate: new Date('2026-10-21T00:00:00.000Z'),
      lastReminderAt: null,
      remindersSent: 0,
      status: 'OVERDUE',
      institution: {
        id: 'club-1',
        name: 'Test Club',
        phone: '541112345678',
        adminUsers: [{ email: 'admin@club.com', name: 'Admin' }],
      },
      saasPlan: plan200,
    };
    const client = createMockClient({
      subscriptions: [makeSubscription({ currentPlan: plan200 })],
      overdueInvoices: [invoice],
      reminderDays: '1,7,15',
    });

    const result = await runSaasBilling(client, new Date('2026-10-22T00:00:00.000Z'));
    expect(result.remindersSent).toBe(1);
    expect(result.whatsappRemindersSent).toBe(0);
    expect(result.whatsappReminderErrors).toBe(1);
    expect(client.smsLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          clubId: 'club-1',
          type: 'saas_invoice_reminder_whatsapp',
          status: 'FAILED',
          error: 'WhatsApp down',
        }),
      })
    );
    expect(client.saasInvoice.update).toHaveBeenCalled();
  });

  it('does not send WhatsApp reminders when platform credentials are missing', async () => {
    const invoice = {
      id: 'inv-1',
      institutionId: 'club-1',
      amount: 35000,
      dueDate: new Date('2026-10-21T00:00:00.000Z'),
      lastReminderAt: null,
      remindersSent: 0,
      status: 'OVERDUE',
      institution: {
        id: 'club-1',
        name: 'Test Club',
        phone: '541112345678',
        adminUsers: [{ email: 'admin@club.com', name: 'Admin' }],
      },
      saasPlan: plan200,
    };
    const client = createMockClient({
      subscriptions: [makeSubscription({ currentPlan: plan200 })],
      overdueInvoices: [invoice],
      reminderDays: '1,7,15',
    });
    const config = client.siteConfig.findFirst as ReturnType<typeof vi.fn>;
    config.mockImplementation(async ({ where: { key } }: { where: { key: string } }) => {
      const values: Record<string, string | undefined> = {
        saas_billing_enabled: 'true',
        saas_billing_day: '1',
        saas_reminder_days: '1,7,15',
        resend_api_key: 're_test',
        resend_from_email: 'billing@example.com',
        saas_whatsapp_phone_number_id: '',
        saas_whatsapp_access_token: '',
        next_public_url: 'https://example.com',
      };
      const value = values[key];
      return value !== undefined ? { id: `cfg-${key}`, clubId: null, key, value } : null;
    });

    const result = await runSaasBilling(client, new Date('2026-10-22T00:00:00.000Z'));
    expect(result.remindersSent).toBe(1);
    expect(result.whatsappRemindersSent).toBe(0);
    expect(sendWhatsAppMessage).not.toHaveBeenCalled();
  });
});

describe('checkTierAlert', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not alert at the free tier boundary (50 members)', async () => {
    const client = createMockClient({ subscriptions: [], freePlan: planFree });
    const result = await checkTierAlert('club-1', 50, undefined, client);
    expect(result.alert).toBe(false);
    expect(result.maxMembers).toBe(50);
  });

  it('alerts above the free tier boundary (51 members) when unsubscribed', async () => {
    const client = createMockClient({ subscriptions: [], freePlan: planFree });
    const result = await checkTierAlert('club-1', 51, undefined, client);
    expect(result.alert).toBe(true);
    expect(result.maxMembers).toBe(50);
  });

  it('does not alert at the 51-200 tier boundary (200 members)', async () => {
    const client = createMockClient({
      subscriptions: [makeSubscription({ currentPlan: plan200 })],
    });
    const result = await checkTierAlert('club-1', 200, undefined, client);
    expect(result.alert).toBe(false);
    expect(result.maxMembers).toBe(200);
  });

  it('alerts above the 51-200 tier boundary (201 members)', async () => {
    const client = createMockClient({
      subscriptions: [makeSubscription({ currentPlan: plan200 })],
    });
    const result = await checkTierAlert('club-1', 201, undefined, client);
    expect(result.alert).toBe(true);
    expect(result.maxMembers).toBe(200);
  });

  it('does not alert at the 201-800 tier boundary (800 members)', async () => {
    const client = createMockClient({
      subscriptions: [makeSubscription({ currentPlan: plan800 })],
    });
    const result = await checkTierAlert('club-1', 800, undefined, client);
    expect(result.alert).toBe(false);
    expect(result.maxMembers).toBe(800);
  });

  it('alerts above the 201-800 tier boundary (801 members)', async () => {
    const client = createMockClient({
      subscriptions: [makeSubscription({ currentPlan: plan800 })],
    });
    const result = await checkTierAlert('club-1', 801, undefined, client);
    expect(result.alert).toBe(true);
    expect(result.maxMembers).toBe(800);
  });

  it('never throws, even when the database fails', async () => {
    const client = createMockClient({ clubFindUniqueError: new Error('database down') });
    const result = await checkTierAlert('club-1', 100, undefined, client);
    expect(result.alert).toBe(false);
    expect(result.error).toBe('database down');
  });
});
