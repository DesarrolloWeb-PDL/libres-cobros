import MercadoPagoConfig, { Preference, Payment, WebhookSignatureValidator } from 'mercadopago';
import type { PreferenceRequest } from 'mercadopago/dist/clients/preference/commonTypes';

function createMercadoPagoConfig(accessToken: string): MercadoPagoConfig {
  return new MercadoPagoConfig({ accessToken });
}

export interface CreateMercadoPagoPreferenceInput {
  paymentId: string;
  feeId: string;
  amount: number;
  memberName: string;
  /** Club slug carried in preference metadata for webhook club resolution. */
  clubSlug: string;
  /** Per-club access token resolved from the club's SiteConfig. */
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
        title: 'Cuota mensual del club',
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
}> {
  const client = new Payment(createMercadoPagoConfig(accessToken));
  const response = await client.get({ id: paymentId });

  return {
    id: String(response.id ?? paymentId),
    status: response.status ?? 'unknown',
    externalReference: response.external_reference ?? null,
    metadata: response.metadata ?? null,
  };
}

export interface VerifyMercadoPagoWebhookInput {
  xSignature: string | string[] | null | undefined;
  xRequestId: string | string[] | null | undefined;
  dataId: string | string[] | null | undefined;
}

/**
 * Validates the MercadoPago IPN signature against the club's client secret.
 * The secret is resolved per club from SiteConfig BEFORE any payment lookup.
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
