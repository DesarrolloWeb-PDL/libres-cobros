import MercadoPagoConfig, { Preference, Payment, WebhookSignatureValidator } from 'mercadopago';
import type { PreferenceRequest } from 'mercadopago/dist/clients/preference/commonTypes';

function getMercadoPagoConfig(): MercadoPagoConfig {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

  if (!accessToken) {
    throw new Error('MERCADOPAGO_ACCESS_TOKEN is not configured');
  }

  return new MercadoPagoConfig({ accessToken });
}

function getPreferenceClient(): Preference {
  return new Preference(getMercadoPagoConfig());
}

function getPaymentClient(): Payment {
  return new Payment(getMercadoPagoConfig());
}

export interface CreateMercadoPagoPreferenceInput {
  paymentId: string;
  feeId: string;
  amount: number;
  memberName: string;
  successUrl: string;
  failureUrl: string;
  pendingUrl: string;
  notificationUrl: string;
}

export async function createMercadoPagoPreference(
  input: CreateMercadoPagoPreferenceInput
): Promise<{ preferenceId: string; initPoint: string | undefined }> {
  const client = getPreferenceClient();

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
  paymentId: string | number
): Promise<{
  id: string;
  status: string;
  externalReference: string | null;
  metadata: Record<string, unknown> | null;
}> {
  const client = getPaymentClient();
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

export function verifyMercadoPagoWebhook(
  input: VerifyMercadoPagoWebhookInput
): void {
  const secret = process.env.MERCADOPAGO_CLIENT_SECRET;

  if (!secret) {
    throw new Error('MERCADOPAGO_CLIENT_SECRET is not configured');
  }

  WebhookSignatureValidator.validate({
    xSignature: input.xSignature,
    xRequestId: input.xRequestId,
    dataId: input.dataId,
    secret,
  });
}
