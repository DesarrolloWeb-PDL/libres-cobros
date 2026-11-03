import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { verifySaasStripeWebhook, processSaasStripeEvent } from '@/lib/saas-autodebit';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('stripe-signature');
    const payload = await request.text();

    const event = await verifySaasStripeWebhook(payload, signature);
    const result = await processSaasStripeEvent(prisma, event);

    return apiSuccess(result);
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('signature') || error.message.includes('Signature'))
    ) {
      return apiError('Firma inválida', 401, error.message, 'INVALID_SIGNATURE');
    }
    return apiDbError(error, 'Error al procesar webhook de Stripe');
  }
}
