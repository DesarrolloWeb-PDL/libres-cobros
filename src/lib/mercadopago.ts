import MercadoPagoConfig, {
  Preference,
  Payment,
  PreApproval,
  WebhookSignatureValidator,
} from 'mercadopago';
import type { PreferenceRequest } from 'mercadopago/dist/clients/preference/commonTypes';
import type { PreApprovalRequest } from 'mercadopago/dist/clients/preApproval/commonTypes';

function createMercadoPagoConfig(accessToken: string): MercadoPagoConfig {
  return new MercadoPagoConfig({ accessToken });
}

export interface CreateMercadoPagoPreferenceInput {
  paymentId: string;
  feeId: string;
  amount: number;
  memberName: string;
  /** Institution slug carried in preference metadata for webhook institution resolution. */
  clubSlug: string;
  /** Per-institution access token resolved from the institution's SiteConfig. */
  accessToken: string;
  successUrl: string;
  failureUrl: string;
  pendingUrl: string;
  notificationUrl: string;
}

export async function createMercadoPagoPreference(
  input: CreateMercadoPagoPreferenceInput
): Promise<{ preferenceId: string; initPoint: string | undefined }> {
  const client = new Preference(createMercadoPagoConfig(input.accessToken));

  const body: PreferenceRequest = {
    items: [
      {
        id: input.feeId,
        title: 'Cuota mensual de la institución',
        description: `Cuota - Ref: ${input.feeId}`,
        quantity: 1,
        currency_id: 'ARS',
        unit_price: input.amount,
      },
    ],
    payer: {
      name: input.memberName,
    },
    external_reference: input.feeId,
    metadata: {
      paymentId: input.paymentId,
      feeId: input.feeId,
      clubSlug: input.clubSlug,
    },
    back_urls: {
      success: input.successUrl,
      failure: input.failureUrl,
      pending: input.pendingUrl,
    },
    auto_return: 'approved',
    notification_url: input.notificationUrl,
  };

  const response = await client.create({ body });

  return {
    preferenceId: response.id ?? '',
    initPoint: response.init_point,
  };
}

export async function getMercadoPagoPayment(
  paymentId: string | number,
  accessToken: string
): Promise<{
  id: string;
  status: string;
  externalReference: string | null;
  metadata: Record<string, unknown> | null;
  transactionAmount: number | null;
  /** Set when the charge was originated by a Preapproval (auto-debit). */
  preapprovalId: string | null;
}> {
  const client = new Payment(createMercadoPagoConfig(accessToken));
  const response = await client.get({ id: paymentId });

  return {
    id: String(response.id ?? paymentId),
    status: response.status ?? 'unknown',
    externalReference: response.external_reference ?? null,
    metadata: response.metadata ?? null,
    transactionAmount: response.transaction_amount ?? null,
    // `preapproval_id` is returned by the API for auto-debit charges but is not
    // declared on the SDK's PaymentResponse type yet.
    preapprovalId: (response as { preapproval_id?: string }).preapproval_id ?? null,
  };
}

export interface CreateMpPreapprovalInput {
  /** Per-institution access token resolved from the institution's SiteConfig. */
  accessToken: string;
  payerEmail: string;
  /** Monthly ARS amount. */
  amount: number;
  clubName: string;
  /** Institution slug carried in external_reference for webhook institution resolution. */
  clubSlug: string;
  memberId: string;
  /** Where the member returns after authorizing. */
  returnUrl: string;
  /** Webhook URL with `?club_slug=` query param. */
  notificationUrl: string;
}

export async function createMpPreapproval(
  input: CreateMpPreapprovalInput
): Promise<{ preapprovalId: string; initPoint: string | null }> {
  const client = new PreApproval(createMercadoPagoConfig(input.accessToken));

  // `notification_url` is accepted by the Preapproval API but not declared on
  // the SDK's PreApprovalRequest type yet.
  const body: PreApprovalRequest & { notification_url: string } = {
    reason: `Cuota mensual - ${input.clubName}`,
    external_reference: `${input.clubSlug}:${input.memberId}`,
    payer_email: input.payerEmail,
    back_url: input.returnUrl,
    status: 'pending',
    auto_recurring: {
      frequency: 1,
      frequency_type: 'months',
      transaction_amount: input.amount,
      currency_id: 'ARS',
    },
    notification_url: input.notificationUrl,
  };

  const response = await client.create({ body });

  return {
    preapprovalId: String(response.id ?? ''),
    initPoint: response.init_point ?? null,
  };
}

export async function cancelMpPreapproval(
  preapprovalId: string,
  accessToken: string
): Promise<void> {
  const client = new PreApproval(createMercadoPagoConfig(accessToken));
  await client.update({ id: preapprovalId, body: { status: 'cancelled' } });
}

export async function getMpPreapproval(
  preapprovalId: string,
  accessToken: string
): Promise<{
  id: string;
  status: string;
  payerEmail: string | null;
  autoRecurring: { transaction_amount: number } | null;
}> {
  const client = new PreApproval(createMercadoPagoConfig(accessToken));
  const response = await client.get({ id: preapprovalId });

  return {
    id: String(response.id ?? preapprovalId),
    status: response.status ?? 'unknown',
    payerEmail: response.payer_email ?? null,
    autoRecurring:
      response.auto_recurring?.transaction_amount != null
        ? { transaction_amount: response.auto_recurring.transaction_amount }
        : null,
  };
}

export interface VerifyMercadoPagoWebhookInput {
  xSignature: string | string[] | null | undefined;
  xRequestId: string | string[] | null | undefined;
  dataId: string | string[] | null | undefined;
}

/**
 * Validates the MercadoPago IPN signature against the institution's client secret.
 * The secret is resolved per institution from SiteConfig BEFORE any payment lookup.
 */
export function verifyMercadoPagoWebhook(
  input: VerifyMercadoPagoWebhookInput,
  secret: string
): void {
  if (!secret) {
    throw new Error('MercadoPago client secret is not configured');
  }

  WebhookSignatureValidator.validate({
    xSignature: input.xSignature,
    xRequestId: input.xRequestId,
    dataId: input.dataId,
    secret,
  });
}
