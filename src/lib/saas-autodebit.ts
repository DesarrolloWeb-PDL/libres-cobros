import { DateTime } from 'luxon';
import { getPlatformSiteConfigValue } from '@/lib/site-config';
import {
  verifyMercadoPagoWebhook,
  getMercadoPagoPayment,
  createMpPreapproval,
  createMercadoPagoPreference,
} from '@/lib/mercadopago';
import {
  verifyStripeWebhook,
  getInvoiceSubscriptionId,
  createStripeSubscription,
} from '@/lib/stripe';
import type Stripe from 'stripe';
import type { PrismaClient, Prisma } from '@prisma/client';

export type SaasAutoDebitClient = PrismaClient | Prisma.TransactionClient;

export interface SaasInvoicePeriod {
  month: number;
  year: number;
}

export interface ConfirmSaasInvoiceOptions {
  method: 'mercadopago' | 'stripe' | 'bank_transfer';
  gatewayPaymentId?: string;
  transferRef?: string;
}

export type ConfirmSaasInvoiceResult =
  | { status: 'paid'; invoiceId: string }
  | { status: 'already-paid'; invoiceId: string };

export interface SettleSaasAutoDebitInput {
  autoDebit: {
    id: string;
    institutionId: string;
    gateway: string;
    status: string;
    amount: number;
  };
  method: 'mercadopago' | 'stripe';
  gatewayPaymentId?: string;
}

export interface CreateSaasAutoDebitEnrollmentInput {
  institutionId: string;
  institutionName: string;
  gateway: 'mercadopago' | 'stripe';
  amount: number;
  payerEmail?: string;
  returnUrl: string;
}

export interface CreateSaasOneOffPreferenceInput {
  invoiceId: string;
  amount: number;
  institutionName: string;
  returnUrl: string;
}

function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_URL ?? 'http://localhost:3000';
}

/**
 * Computes the next fixed billing day anchor in UTC.
 * The gateway first charge lands on this day, matching the platform billing day.
 */
export function getSaasBillingAnchor(
  billingDay: number | string,
  from: Date = new Date()
): Date {
  let day = typeof billingDay === 'string' ? parseInt(billingDay, 10) : billingDay;
  if (Number.isNaN(day) || day < 1) day = 1;
  if (day > 28) day = 28;

  const current = DateTime.fromJSDate(from, { zone: 'utc' }).startOf('day');
  const thisMonth = DateTime.utc(current.year, current.month, day).startOf('day');
  const anchor = thisMonth > current ? thisMonth : thisMonth.plus({ months: 1 });
  return anchor.toJSDate();
}

function currentPeriod(): SaasInvoicePeriod {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

async function getSubscriptionPlanId(
  client: SaasAutoDebitClient,
  institutionId: string
): Promise<string> {
  const subscription = await client.saasSubscription.findUnique({
    where: { institutionId },
    include: { saasPlan: true },
  });

  if (!subscription?.saasPlanId) {
    throw new Error(`No active SaaS subscription found for institution ${institutionId}`);
  }

  return subscription.saasPlanId;
}

/**
 * Finds the institution's invoice for the given period, or creates one at the
 * locked auto-debit amount. Used by webhook settlement paths.
 */
export async function findOrCreateSaasInvoice(
  client: SaasAutoDebitClient,
  institutionId: string,
  amount: number,
  period: SaasInvoicePeriod = currentPeriod()
) {
  const existing = await client.saasInvoice.findFirst({
    where: {
      institutionId,
      month: period.month,
      year: period.year,
    },
  });

  if (existing) {
    return existing;
  }

  const saasPlanId = await getSubscriptionPlanId(client, institutionId);
  const dueDate = DateTime.utc(period.year, period.month, 1)
    .plus({ months: 1 })
    .minus({ days: 1 })
    .toJSDate();

  return client.saasInvoice.create({
    data: {
      institutionId,
      saasPlanId,
      month: period.month,
      year: period.year,
      amount,
      dueDate,
      status: 'PENDING',
    },
  });
}

/**
 * Confirms a SaaS invoice as PAID and triggers ARCA emission post-commit.
 * Emission failures are swallowed so they never revert the PAID status.
 */
export async function confirmSaasInvoice(
  client: SaasAutoDebitClient,
  invoiceId: string,
  options: ConfirmSaasInvoiceOptions
): Promise<ConfirmSaasInvoiceResult> {
  const result = await client.$transaction(async (tx) => {
    const invoice = await tx.saasInvoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new Error(`SaaS invoice ${invoiceId} not found`);
    }

    if (invoice.status === 'PAID') {
      return { status: 'already-paid' as const, invoiceId };
    }

    const updateData: Prisma.SaasInvoiceUpdateInput = {
      status: 'PAID',
      paidAt: new Date(),
      paymentMethod: options.method,
    };

    if (options.gatewayPaymentId) {
      updateData.gatewayPaymentId = options.gatewayPaymentId;
    }

    if (options.transferRef) {
      updateData.transferRef = options.transferRef;
    }

    await tx.saasInvoice.update({
      where: { id: invoiceId },
      data: updateData,
    });

    return { status: 'paid' as const, invoiceId };
  });

  // ARCA emission runs AFTER the transaction commits and must never break the
  // payment flow. Phase 5 implements emitirComprobanteSaas in arca.ts; until
  // then the dynamic import gracefully degrades to a no-op.
  if (result.status === 'paid') {
    try {
      const arca = await import('@/lib/arca');
      if (typeof arca.emitirComprobanteSaas === 'function') {
        await arca.emitirComprobanteSaas(result.invoiceId);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[saas-autodebit] emission failed for invoice ${result.invoiceId}: ${message}`);
    }
  }

  return result;
}

/**
 * Settles an auto-debit charge: promotes PENDING_AUTH authorizations to ACTIVE,
 * finds or creates the period invoice, and confirms it.
 */
export async function settleSaasAutoDebitCharge(
  client: SaasAutoDebitClient,
  input: SettleSaasAutoDebitInput
): Promise<ConfirmSaasInvoiceResult> {
  if (input.autoDebit.status === 'PENDING_AUTH' && input.method === 'mercadopago') {
    await client.saasAutoDebit.update({
      where: { id: input.autoDebit.id },
      data: { status: 'ACTIVE' },
    });
  }

  const invoice = await findOrCreateSaasInvoice(
    client,
    input.autoDebit.institutionId,
    input.autoDebit.amount
  );

  return confirmSaasInvoice(client, invoice.id, {
    method: input.method,
    gatewayPaymentId: input.gatewayPaymentId,
  });
}

async function resolvePlatformMercadoPagoCredentials(): Promise<{
  clientSecret: string;
  accessToken: string;
}> {
  const [clientSecret, accessToken] = await Promise.all([
    getPlatformSiteConfigValue('mercadopago_client_secret'),
    getPlatformSiteConfigValue('mercadopago_access_token'),
  ]);

  if (!clientSecret || !accessToken) {
    throw new Error('Platform MercadoPago credentials are not configured');
  }

  return { clientSecret, accessToken };
}

async function resolvePlatformStripeCredentials(): Promise<{ webhookSecret: string }> {
  const webhookSecret = await getPlatformSiteConfigValue('stripe_webhook_secret');
  if (!webhookSecret) {
    throw new Error('Platform Stripe webhook secret is not configured');
  }
  return { webhookSecret };
}

export interface ProcessSaasMercadoPagoWebhookInput {
  xSignature: string | string[] | null | undefined;
  xRequestId: string | string[] | null | undefined;
  dataId: string | string[] | null | undefined;
}

export interface ProcessWebhookResult {
  received: boolean;
  action: string;
  status?: string;
  invoiceId?: string;
}

/**
 * Processes a platform MercadoPago webhook (no club_slug).
 * Auto-debit charges are resolved by preapproval id; one-off payments by external_reference.
 */
export async function processSaasMercadoPagoWebhook(
  client: SaasAutoDebitClient,
  input: ProcessSaasMercadoPagoWebhookInput
): Promise<ProcessWebhookResult> {
  const { clientSecret, accessToken } = await resolvePlatformMercadoPagoCredentials();

  const dataId = typeof input.dataId === 'string' ? input.dataId : null;

  verifyMercadoPagoWebhook(
    {
      xSignature: input.xSignature,
      xRequestId: input.xRequestId,
      dataId,
    },
    clientSecret
  );

  if (!dataId) {
    throw new Error('Missing payment id in webhook');
  }

  const payment = await getMercadoPagoPayment(dataId, accessToken);

  if (payment.preapprovalId) {
    const autoDebit = await client.saasAutoDebit.findUnique({
      where: {
        gateway_gatewaySubscriptionId: {
          gateway: 'mercadopago',
          gatewaySubscriptionId: payment.preapprovalId,
        },
      },
    });

    if (!autoDebit) {
      return { received: true, action: 'autodebit_not_found' };
    }

    if (payment.status === 'approved') {
      const result = await settleSaasAutoDebitCharge(client, {
        autoDebit,
        method: 'mercadopago',
        gatewayPaymentId: payment.id,
      });
      return {
        received: true,
        action: 'autodebit_confirmed',
        status: result.status,
        invoiceId: result.invoiceId,
      };
    }

    if (payment.status === 'rejected' || payment.status === 'cancelled') {
      await client.saasAutoDebit.update({
        where: { id: autoDebit.id },
        data: { status: 'FAILED' },
      });
      return { received: true, action: 'autodebit_failed' };
    }

    return { received: true, action: 'ignored', status: payment.status };
  }

  const invoiceId = payment.externalReference ?? (payment.metadata?.invoiceId as string | undefined);

  if (payment.status === 'rejected' || payment.status === 'cancelled') {
    if (invoiceId) {
      await client.saasInvoice.updateMany({
        where: { id: invoiceId, status: { not: 'PAID' } },
        data: { status: 'PENDING' },
      });
    }
    return { received: true, action: 'marked_failed', status: payment.status };
  }

  if (payment.status !== 'approved') {
    return { received: true, action: 'ignored', status: payment.status };
  }

  if (!invoiceId) {
    return { received: true, action: 'invoice_not_found' };
  }

  const result = await confirmSaasInvoice(client, invoiceId, {
    method: 'mercadopago',
    gatewayPaymentId: payment.id,
  });

  return {
    received: true,
    action: 'invoice_confirmed',
    status: result.status,
    invoiceId: result.invoiceId,
  };
}

async function findSaasAutoDebitBySubscription(
  client: SaasAutoDebitClient,
  subscriptionId: string
) {
  return client.saasAutoDebit.findUnique({
    where: {
      gateway_gatewaySubscriptionId: {
        gateway: 'stripe',
        gatewaySubscriptionId: subscriptionId,
      },
    },
  });
}

/**
 * Processes a platform Stripe webhook (no club_slug).
 * Auto-debit charges are resolved by subscription id.
 */
export async function processSaasStripeEvent(
  client: SaasAutoDebitClient,
  event: Stripe.Event
): Promise<ProcessWebhookResult> {
  if (event.type === 'invoice.paid') {
    const invoice = event.data.object as Stripe.Invoice;
    const subscriptionId = getInvoiceSubscriptionId(invoice);

    if (!subscriptionId) {
      return { received: true, action: 'ignored' };
    }

    const autoDebit = await findSaasAutoDebitBySubscription(client, subscriptionId);
    if (!autoDebit) {
      return { received: true, action: 'autodebit_not_found' };
    }

    const result = await settleSaasAutoDebitCharge(client, {
      autoDebit,
      method: 'stripe',
    });

    return {
      received: true,
      action: 'autodebit_confirmed',
      status: result.status,
      invoiceId: result.invoiceId,
    };
  }

  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as Stripe.Invoice;
    const subscriptionId = getInvoiceSubscriptionId(invoice);
    if (subscriptionId) {
      const autoDebit = await findSaasAutoDebitBySubscription(client, subscriptionId);
      if (autoDebit) {
        await client.saasAutoDebit.update({
          where: { id: autoDebit.id },
          data: { status: 'FAILED' },
        });
      }
    }
    return { received: true, action: 'autodebit_failed' };
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscriptionId = event.data.object.id;
    const autoDebit = await findSaasAutoDebitBySubscription(client, subscriptionId);
    if (autoDebit) {
      await client.saasAutoDebit.update({
        where: { id: autoDebit.id },
        data: { status: 'CANCELLED' },
      });
    }
    return { received: true, action: 'autodebit_cancelled' };
  }

  return { received: true, action: 'ignored' };
}

/**
 * Creates a platform-scoped MercadoPago preference for a one-off invoice payment.
 */
export async function createSaasOneOffPreference(
  input: CreateSaasOneOffPreferenceInput
): Promise<{ preferenceId: string; initPoint: string | undefined }> {
  const accessToken = await getPlatformSiteConfigValue('mercadopago_access_token');
  if (!accessToken) {
    throw new Error('Platform MercadoPago access token is not configured');
  }

  const notificationUrl = `${getSiteUrl()}/api/webhooks/platform/mercadopago`;

  return createMercadoPagoPreference({
    paymentId: input.invoiceId,
    feeId: input.invoiceId,
    amount: input.amount,
    memberName: input.institutionName,
    clubSlug: '',
    accessToken,
    successUrl: input.returnUrl,
    failureUrl: input.returnUrl,
    pendingUrl: input.returnUrl,
    notificationUrl,
  });
}

async function resolveBillingDay(): Promise<number> {
  const raw = await getPlatformSiteConfigValue('saas_billing_day', '1');
  const parsed = parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed < 1) return 1;
  return Math.min(28, parsed);
}

async function upsertSaasAutoDebit(
  client: SaasAutoDebitClient,
  data: {
    institutionId: string;
    gateway: string;
    gatewaySubscriptionId: string;
    status: string;
    amount: number;
    payerEmail?: string;
    nextBillingAt?: Date | null;
  }
) {
  return client.saasAutoDebit.upsert({
    where: { institutionId: data.institutionId },
    create: {
      institutionId: data.institutionId,
      gateway: data.gateway,
      gatewaySubscriptionId: data.gatewaySubscriptionId,
      status: data.status,
      amount: data.amount,
      payerEmail: data.payerEmail ?? null,
      nextBillingAt: data.nextBillingAt ?? null,
    },
    update: {
      gateway: data.gateway,
      gatewaySubscriptionId: data.gatewaySubscriptionId,
      status: data.status,
      amount: data.amount,
      payerEmail: data.payerEmail ?? null,
      nextBillingAt: data.nextBillingAt ?? null,
    },
  });
}

/**
 * Creates a platform-scoped auto-debit enrollment for an institution.
 * MercadoPago returns an in-memory authorization URL; Stripe is active immediately.
 */
export async function createSaasAutoDebitEnrollment(
  client: SaasAutoDebitClient,
  input: CreateSaasAutoDebitEnrollmentInput
): Promise<{ autoDebit: { id: string }; authorizationUrl?: string | null; managementUrl?: string | null }> {
  const billingDay = await resolveBillingDay();
  const anchor = getSaasBillingAnchor(billingDay);
  const notificationUrl = `${getSiteUrl()}/api/webhooks/platform/mercadopago`;

  if (input.gateway === 'mercadopago') {
    const accessToken = await getPlatformSiteConfigValue('mercadopago_access_token');
    if (!accessToken) {
      throw new Error('Platform MercadoPago access token is not configured');
    }
    if (!input.payerEmail) {
      throw new Error('Payer email is required for MercadoPago auto-debit');
    }

    const preapproval = await createMpPreapproval({
      accessToken,
      payerEmail: input.payerEmail,
      amount: input.amount,
      clubName: input.institutionName,
      clubSlug: 'saas',
      memberId: input.institutionId,
      returnUrl: input.returnUrl,
      notificationUrl,
      startDate: anchor.toISOString(),
    });

    const autoDebit = await upsertSaasAutoDebit(client, {
      institutionId: input.institutionId,
      gateway: 'mercadopago',
      gatewaySubscriptionId: preapproval.preapprovalId,
      status: 'PENDING_AUTH',
      amount: input.amount,
      payerEmail: input.payerEmail,
      nextBillingAt: null,
    });

    return { autoDebit, authorizationUrl: preapproval.initPoint };
  }

  const secretKey = await getPlatformSiteConfigValue('stripe_secret_key');
  if (!secretKey) {
    throw new Error('Platform Stripe secret key is not configured');
  }
  if (!input.payerEmail) {
    throw new Error('Payer email is required for Stripe auto-debit');
  }

  const subscription = await createStripeSubscription({
    secretKey,
    memberEmail: input.payerEmail,
    amount: input.amount,
    clubSlug: 'saas',
    memberId: input.institutionId,
    returnUrl: input.returnUrl,
    billingCycleAnchor: anchor,
  });

  const autoDebit = await upsertSaasAutoDebit(client, {
    institutionId: input.institutionId,
    gateway: 'stripe',
    gatewaySubscriptionId: subscription.subscriptionId,
    status: 'ACTIVE',
    amount: input.amount,
    payerEmail: input.payerEmail,
    nextBillingAt: anchor,
  });

  return { autoDebit, managementUrl: subscription.customerPortalUrl };
}

/**
 * Verifies a platform Stripe webhook payload and parses the event.
 */
export async function verifySaasStripeWebhook(
  payload: string | Buffer,
  signature: string | null
): Promise<Stripe.Event> {
  const { webhookSecret } = await resolvePlatformStripeCredentials();
  return verifyStripeWebhook(payload, signature, webhookSecret);
}
