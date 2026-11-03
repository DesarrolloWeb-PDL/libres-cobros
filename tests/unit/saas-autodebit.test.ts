import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  findOrCreateSaasInvoice,
  confirmSaasInvoice,
  settleSaasAutoDebitCharge,
  getSaasBillingAnchor,
  processSaasMercadoPagoWebhook,
  processSaasStripeEvent,
} from '@/lib/saas-autodebit';

vi.mock('@/lib/site-config', () => ({
  getPlatformSiteConfigValue: vi.fn(),
  getPlatformSiteConfigValues: vi.fn(),
}));

vi.mock('@/lib/mercadopago', () => ({
  verifyMercadoPagoWebhook: vi.fn(),
  getMercadoPagoPayment: vi.fn(),
  createMpPreapproval: vi.fn(),
  createMercadoPagoPreference: vi.fn(),
  cancelMpPreapproval: vi.fn(),
}));

vi.mock('@/lib/stripe', () => ({
  verifyStripeWebhook: vi.fn(),
  createStripeSubscription: vi.fn(),
  cancelStripeSubscription: vi.fn(),
  getInvoiceSubscriptionId: vi.fn(),
  getInvoicePaymentIntentId: vi.fn(),
}));

vi.mock('@/lib/arca', () => ({
  emitirComprobanteSaas: vi.fn().mockResolvedValue({ estado: 'AUTORIZADO', cae: '123' }),
}));

import * as siteConfig from '@/lib/site-config';
import * as mercadopago from '@/lib/mercadopago';
import * as stripe from '@/lib/stripe';
import * as arca from '@/lib/arca';

vi.mock('@/lib/access', () => ({
  requireInstitution: vi.fn(),
  AuthError: class AuthError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
      this.name = 'AuthError';
    }
  },
  institutionWhere: vi.fn(() => ({})),
}));

vi.mock('@/lib/db', () => {
  const invoices: Array<Record<string, unknown>> = [];
  const client = {
    saasInvoice: {
      findUnique: vi.fn(async ({ where: { id } }: { where: { id: string } }) => {
        return invoices.find((i) => i.id === id) ?? null;
      }),
      update: vi.fn(async (args: { where: { id: string }; data: Record<string, unknown> }) => {
        const target = invoices.find((i) => i.id === args.where.id);
        if (target) Object.assign(target, args.data);
        return { id: args.where.id, ...args.data };
      }),
    },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(client)),
  };
  (globalThis as unknown as Record<string, unknown>).__saasAutodebitPrismaMock = client;
  return { prisma: client };
});

import * as access from '@/lib/access';
import { POST as payInvoiceRoute } from '@/app/api/admin/saas/invoices/[id]/pay/route';

const institutionId = 'club-1';
const plan200 = { id: 'plan-200', priceArs: 35000 };

function createMockClient(
  opts: {
    existingInvoice?: Record<string, unknown> | null;
    autoDebit?: Record<string, unknown> | null;
    subscription?: Record<string, unknown> | null;
  } = {}
) {
  const invoices: Array<Record<string, unknown>> = opts.existingInvoice
    ? [opts.existingInvoice]
    : [];
  const autoDebits: Array<Record<string, unknown>> = opts.autoDebit
    ? [opts.autoDebit]
    : [];
  const subscriptions: Array<Record<string, unknown>> = opts.subscription
    ? [opts.subscription]
    : [];

  const client = {
    saasInvoice: {
      findUnique: vi.fn(async ({ where: { id } }: { where: { id: string } }) => {
        return invoices.find((i) => i.id === id) ?? null;
      }),
      findFirst: vi.fn(
        async ({
          where,
        }: {
          where: { institutionId?: string; month?: number; year?: number };
        }) => {
          return (
            invoices.find(
              (i) =>
                i.institutionId === where.institutionId &&
                i.month === where.month &&
                i.year === where.year
            ) ?? null
          );
        }
      ),
      create: vi.fn(async (args: { data: Record<string, unknown> }) => {
        const invoice = {
          id: 'inv-new',
          remindersSent: 0,
          lastReminderAt: null,
          status: 'PENDING',
          ...args.data,
        };
        invoices.push(invoice);
        return invoice;
      }),
      update: vi.fn(async (args: { where: { id: string }; data: Record<string, unknown> }) => {
        const target = invoices.find((i) => i.id === args.where.id);
        if (target) {
          Object.assign(target, args.data);
        }
        return { id: args.where.id, ...args.data };
      }),
      updateMany: vi.fn(async () => ({ count: 0 })),
    },
    saasAutoDebit: {
      findUnique: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        if ('id' in where) {
          return autoDebits.find((a) => a.id === where.id) ?? null;
        }
        if (where.institutionId) {
          return autoDebits.find((a) => a.institutionId === where.institutionId) ?? null;
        }
        if (where.gateway_gatewaySubscriptionId) {
          const gw = where.gateway_gatewaySubscriptionId as {
            gateway: string;
            gatewaySubscriptionId: string;
          };
          return (
            autoDebits.find(
              (a) => a.gateway === gw.gateway && a.gatewaySubscriptionId === gw.gatewaySubscriptionId
            ) ?? null
          );
        }
        return null;
      }),
      update: vi.fn(async (args: { where: { id: string }; data: Record<string, unknown> }) => {
        const target = autoDebits.find((a) => a.id === args.where.id);
        if (target) {
          Object.assign(target, args.data);
        }
        return { id: args.where.id, ...args.data };
      }),
      upsert: vi.fn(async (args: { create: Record<string, unknown>; update: Record<string, unknown> }) => {
        const existing = autoDebits.find(
          (a) => a.institutionId === args.create.institutionId
        );
        if (existing) {
          Object.assign(existing, args.update);
          return existing;
        }
        const created = { id: 'ad-new', ...args.create };
        autoDebits.push(created);
        return created;
      }),
    },
    saasSubscription: {
      findUnique: vi.fn(async () => subscriptions[0] ?? null),
    },
    club: {
      findUnique: vi.fn(async () => ({
        id: institutionId,
        name: 'Test Club',
        cuit: '30712345678',
        ivaCondicion: 'RI',
      })),
    },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(client)),
  } as unknown as Parameters<typeof findOrCreateSaasInvoice>[0];

  return client;
}

describe('getSaasBillingAnchor', () => {
  it('returns the next billing day in the future', () => {
    const anchor = getSaasBillingAnchor(15, new Date('2026-11-02T00:00:00Z'));
    expect(anchor.toISOString()).toBe('2026-11-15T00:00:00.000Z');
  });

  it('rolls to next month when today is past the billing day', () => {
    const anchor = getSaasBillingAnchor(15, new Date('2026-11-16T00:00:00Z'));
    expect(anchor.toISOString()).toBe('2026-12-15T00:00:00.000Z');
  });

  it('clamps billing day to 28', () => {
    const anchor = getSaasBillingAnchor(31, new Date('2026-11-01T00:00:00Z'));
    expect(anchor.getUTCDate()).toBe(28);
  });
});

const activeSubscription = { id: 'sub-1', institutionId, saasPlanId: plan200.id };

describe('findOrCreateSaasInvoice', () => {
  it('creates an invoice when none exists for the period', async () => {
    const client = createMockClient({ subscription: activeSubscription });
    const invoice = await findOrCreateSaasInvoice(client, institutionId, 35000, {
      month: 11,
      year: 2026,
    });

    expect(invoice.institutionId).toBe(institutionId);
    expect(invoice.month).toBe(11);
    expect(invoice.year).toBe(2026);
    expect(invoice.amount).toBe(35000);
    expect(invoice.status).toBe('PENDING');
    expect(client.saasInvoice.create).toHaveBeenCalledTimes(1);
  });

  it('returns an existing invoice for the same period without creating a duplicate', async () => {
    const existing = {
      id: 'inv-existing',
      institutionId,
      month: 11,
      year: 2026,
      amount: 35000,
      status: 'PENDING',
    };
    const client = createMockClient({
      existingInvoice: existing,
      subscription: activeSubscription,
    });
    const invoice = await findOrCreateSaasInvoice(client, institutionId, 35000, {
      month: 11,
      year: 2026,
    });

    expect(invoice.id).toBe('inv-existing');
    expect(client.saasInvoice.create).not.toHaveBeenCalled();
  });
});

describe('confirmSaasInvoice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('marks a PENDING invoice as PAID before triggering emission', async () => {
    const invoice = {
      id: 'inv-1',
      institutionId,
      saasPlanId: plan200.id,
      amount: 35000,
      status: 'PENDING',
      month: 11,
      year: 2026,
    };
    const client = createMockClient({ existingInvoice: invoice });

    const emitSpy = vi.spyOn(arca, 'emitirComprobanteSaas');

    const result = await confirmSaasInvoice(client, 'inv-1', {
      method: 'mercadopago',
      gatewayPaymentId: 'mp-123',
    });

    expect(result.status).toBe('paid');
    expect(client.saasInvoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'inv-1' },
        data: expect.objectContaining({
          status: 'PAID',
          paymentMethod: 'mercadopago',
          gatewayPaymentId: 'mp-123',
          paidAt: expect.any(Date),
        }),
      })
    );

    // Emission must be invoked after the invoice is marked PAID.
    expect(emitSpy).toHaveBeenCalledWith('inv-1');
    const updateCallOrder = (client.saasInvoice.update as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0];
    const emitCallOrder = emitSpy.mock.invocationCallOrder[0];
    expect(emitCallOrder).toBeGreaterThan(updateCallOrder);
  });

  it('is idempotent for an already PAID invoice', async () => {
    const invoice = {
      id: 'inv-1',
      institutionId,
      status: 'PAID',
      amount: 35000,
      month: 11,
      year: 2026,
    };
    const client = createMockClient({ existingInvoice: invoice });

    const result = await confirmSaasInvoice(client, 'inv-1', {
      method: 'bank_transfer',
      transferRef: 'REF-123',
    });

    expect(result.status).toBe('already-paid');
    expect(client.saasInvoice.update).not.toHaveBeenCalled();
  });

  it('keeps the invoice PAID even when emission fails', async () => {
    const invoice = {
      id: 'inv-1',
      institutionId,
      saasPlanId: plan200.id,
      amount: 35000,
      status: 'PENDING',
      month: 11,
      year: 2026,
    };
    const client = createMockClient({ existingInvoice: invoice });
    vi.spyOn(arca, 'emitirComprobanteSaas').mockRejectedValue(new Error('ARCA down'));

    const result = await confirmSaasInvoice(client, 'inv-1', {
      method: 'bank_transfer',
      transferRef: 'REF-123',
    });

    expect(result.status).toBe('paid');
    expect(client.saasInvoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'PAID' }),
      })
    );
  });
});

describe('settleSaasAutoDebitCharge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('promotes a PENDING_AUTH MP auto-debit to ACTIVE and settles the invoice', async () => {
    const autoDebit = {
      id: 'ad-1',
      institutionId,
      gateway: 'mercadopago',
      gatewaySubscriptionId: 'mp-sub-1',
      status: 'PENDING_AUTH',
      amount: 35000,
    };
    const client = createMockClient({ autoDebit, subscription: activeSubscription });

    const result = await settleSaasAutoDebitCharge(client, {
      autoDebit,
      method: 'mercadopago',
      gatewayPaymentId: 'mp-pay-1',
    });

    expect(client.saasAutoDebit.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'ad-1' },
        data: { status: 'ACTIVE' },
      })
    );
    expect(result.status).toBe('paid');
    expect(client.saasInvoice.create).toHaveBeenCalled();
  });

  it('reuses an existing period invoice for an ACTIVE auto-debit', async () => {
    const autoDebit = {
      id: 'ad-1',
      institutionId,
      gateway: 'stripe',
      gatewaySubscriptionId: 'stripe-sub-1',
      status: 'ACTIVE',
      amount: 35000,
    };
    const existing = {
      id: 'inv-existing',
      institutionId,
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      amount: 35000,
      status: 'PENDING',
    };
    const client = createMockClient({
      autoDebit,
      existingInvoice: existing,
      subscription: activeSubscription,
    });

    const result = await settleSaasAutoDebitCharge(client, {
      autoDebit,
      method: 'stripe',
      gatewayPaymentId: 'stripe-pay-1',
    });

    expect(result.status).toBe('paid');
    expect(result.invoiceId).toBe('inv-existing');
    expect(client.saasInvoice.create).not.toHaveBeenCalled();
  });

  it('is idempotent when the period invoice is already PAID', async () => {
    const autoDebit = {
      id: 'ad-1',
      institutionId,
      gateway: 'mercadopago',
      gatewaySubscriptionId: 'mp-sub-1',
      status: 'ACTIVE',
      amount: 35000,
    };
    const existing = {
      id: 'inv-paid',
      institutionId,
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      amount: 35000,
      status: 'PAID',
    };
    const client = createMockClient({
      autoDebit,
      existingInvoice: existing,
      subscription: activeSubscription,
    });

    const result = await settleSaasAutoDebitCharge(client, {
      autoDebit,
      method: 'mercadopago',
      gatewayPaymentId: 'mp-pay-1',
    });

    expect(result.status).toBe('already-paid');
  });
});

describe('processSaasMercadoPagoWebhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(siteConfig.getPlatformSiteConfigValue).mockImplementation(async (key) => {
      if (key === 'mercadopago_client_secret') return 'mp-secret';
      if (key === 'mercadopago_access_token') return 'mp-token';
      return '';
    });
  });

  it('settles an auto-debit charge via preapproval id', async () => {
    const autoDebit = {
      id: 'ad-1',
      institutionId,
      gateway: 'mercadopago',
      gatewaySubscriptionId: 'mp-sub-1',
      status: 'PENDING_AUTH',
      amount: 35000,
    };
    const client = createMockClient({ autoDebit, subscription: activeSubscription });
    vi.mocked(mercadopago.getMercadoPagoPayment).mockResolvedValue({
      id: 'mp-pay-1',
      status: 'approved',
      externalReference: null,
      metadata: null,
      transactionAmount: 35000,
      preapprovalId: 'mp-sub-1',
    });

    const result = await processSaasMercadoPagoWebhook(client, {
      xSignature: 'sig',
      xRequestId: 'req',
      dataId: 'mp-pay-1',
    });

    expect(mercadopago.verifyMercadoPagoWebhook).toHaveBeenCalledWith(
      { xSignature: 'sig', xRequestId: 'req', dataId: 'mp-pay-1' },
      'mp-secret'
    );
    expect(result.action).toBe('autodebit_confirmed');
    expect(client.saasAutoDebit.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'ACTIVE' } })
    );
  });

  it('settles a one-off payment via external_reference invoice id', async () => {
    const invoice = {
      id: 'inv-oneoff',
      institutionId,
      amount: 35000,
      status: 'PENDING',
      month: 11,
      year: 2026,
    };
    const client = createMockClient({ existingInvoice: invoice });
    vi.mocked(mercadopago.getMercadoPagoPayment).mockResolvedValue({
      id: 'mp-pay-2',
      status: 'approved',
      externalReference: 'inv-oneoff',
      metadata: null,
      transactionAmount: 35000,
      preapprovalId: null,
    });

    const result = await processSaasMercadoPagoWebhook(client, {
      xSignature: 'sig',
      xRequestId: 'req',
      dataId: 'mp-pay-2',
    });

    expect(result.action).toBe('invoice_confirmed');
    expect(client.saasInvoice.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'inv-oneoff' } })
    );
  });

  it('marks the auto-debit as FAILED on rejected charges', async () => {
    const autoDebit = {
      id: 'ad-1',
      institutionId,
      gateway: 'mercadopago',
      gatewaySubscriptionId: 'mp-sub-1',
      status: 'ACTIVE',
      amount: 35000,
    };
    const client = createMockClient({ autoDebit });
    vi.mocked(mercadopago.getMercadoPagoPayment).mockResolvedValue({
      id: 'mp-pay-3',
      status: 'rejected',
      externalReference: null,
      metadata: null,
      transactionAmount: 35000,
      preapprovalId: 'mp-sub-1',
    });

    const result = await processSaasMercadoPagoWebhook(client, {
      xSignature: 'sig',
      xRequestId: 'req',
      dataId: 'mp-pay-3',
    });

    expect(result.action).toBe('autodebit_failed');
    expect(client.saasAutoDebit.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'FAILED' } })
    );
  });
});

describe('processSaasStripeEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('settles an auto-debit charge from invoice.paid', async () => {
    const autoDebit = {
      id: 'ad-1',
      institutionId,
      gateway: 'stripe',
      gatewaySubscriptionId: 'stripe-sub-1',
      status: 'ACTIVE',
      amount: 35000,
    };
    const client = createMockClient({ autoDebit, subscription: activeSubscription });
    vi.mocked(stripe.getInvoiceSubscriptionId).mockReturnValue('stripe-sub-1');

    const event = {
      type: 'invoice.paid',
      data: {
        object: { id: 'in_1', subscription: 'stripe-sub-1' },
      },
    } as unknown as Parameters<typeof processSaasStripeEvent>[1];

    const result = await processSaasStripeEvent(client, event);

    expect(result.action).toBe('autodebit_confirmed');
    expect(client.saasInvoice.create).toHaveBeenCalled();
  });

  it('marks the auto-debit as FAILED on invoice.payment_failed', async () => {
    const autoDebit = {
      id: 'ad-1',
      institutionId,
      gateway: 'stripe',
      gatewaySubscriptionId: 'stripe-sub-1',
      status: 'ACTIVE',
      amount: 35000,
    };
    const client = createMockClient({ autoDebit, subscription: activeSubscription });
    vi.mocked(stripe.getInvoiceSubscriptionId).mockReturnValue('stripe-sub-1');

    const event = {
      type: 'invoice.payment_failed',
      data: {
        object: { id: 'in_1', subscription: 'stripe-sub-1' },
      },
    } as unknown as Parameters<typeof processSaasStripeEvent>[1];

    const result = await processSaasStripeEvent(client, event);

    expect(result.action).toBe('autodebit_failed');
    expect(client.saasAutoDebit.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'FAILED' } })
    );
  });
});

describe('POST /api/admin/saas/invoices/[id]/pay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const prismaMock = (globalThis as unknown as Record<string, unknown>).__saasAutodebitPrismaMock as {
      saasInvoice: { findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
      $transaction: ReturnType<typeof vi.fn>;
    };
    prismaMock.saasInvoice.findUnique.mockReset();
    prismaMock.saasInvoice.update.mockReset();
    prismaMock.$transaction.mockReset();
    prismaMock.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn(prismaMock)
    );
  });

  function buildRequest(body: Record<string, unknown>) {
    return new NextRequest('http://localhost/api/admin/saas/invoices/inv-1/pay', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
    });
  }

  it('rejects non-super-admins with 403', async () => {
    vi.mocked(access.requireInstitution).mockResolvedValue({
      role: 'ADMIN',
      institutionId: 'club-1',
    });

    const response = await payInvoiceRoute(buildRequest({ transferRef: 'REF-1' }), {
      params: Promise.resolve({ id: 'inv-1' }),
    });

    expect(response.status).toBe(403);
  });

  it('allows super-admins to confirm a bank transfer with transferRef', async () => {
    const prismaMock = (globalThis as unknown as Record<string, unknown>).__saasAutodebitPrismaMock as {
      saasInvoice: {
        findUnique: ReturnType<typeof vi.fn>;
        update: ReturnType<typeof vi.fn>;
      };
      $transaction: ReturnType<typeof vi.fn>;
    };

    vi.mocked(access.requireInstitution).mockResolvedValue({
      role: 'SUPER_ADMIN',
      institutionId: null,
    });

    prismaMock.saasInvoice.findUnique.mockResolvedValue({
      id: 'inv-1',
      institutionId,
      amount: 35000,
      status: 'PENDING',
    });

    const response = await payInvoiceRoute(buildRequest({ transferRef: 'REF-1' }), {
      params: Promise.resolve({ id: 'inv-1' }),
    });

    expect(response.status).toBe(200);
    expect(prismaMock.saasInvoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'inv-1' },
        data: expect.objectContaining({
          status: 'PAID',
          paymentMethod: 'bank_transfer',
          transferRef: 'REF-1',
        }),
      })
    );
  });
});
