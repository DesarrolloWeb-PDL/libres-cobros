import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { processSaasMercadoPagoWebhook } from '@/lib/saas-autodebit';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const xSignature = request.headers.get('x-signature');
    const xRequestId = request.headers.get('x-request-id');
    const dataId = request.nextUrl.searchParams.get('data.id') ?? request.nextUrl.searchParams.get('id');

    const result = await processSaasMercadoPagoWebhook(prisma, {
      xSignature,
      xRequestId,
      dataId,
    });

    return apiSuccess(result);
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('signature') || error.message.includes('Signature'))
    ) {
      return apiError('Firma inválida', 401, error.message, 'INVALID_SIGNATURE');
    }
    return apiDbError(error, 'Error al procesar webhook de MercadoPago');
  }
}
