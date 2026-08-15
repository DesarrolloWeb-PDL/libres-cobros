import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { verifyMercadoPagoWebhook, getMercadoPagoPayment } from '@/lib/mercadopago';
import { confirmPayment } from '@/lib/payments';

export async function POST(request: NextRequest) {
  try {
    const xSignature = request.headers.get('x-signature');
    const xRequestId = request.headers.get('x-request-id');
    const { searchParams } = request.nextUrl;
    const dataId = searchParams.get('data.id') ?? searchParams.get('id');

    verifyMercadoPagoWebhook({
      xSignature,
      xRequestId,
      dataId,
    });

    if (!dataId) {
      return apiError('ID de pago no recibido', 400, 'data.id is required', 'MISSING_PAYMENT_ID');
    }

    const mpPayment = await getMercadoPagoPayment(dataId);

    // Handle rejected/cancelled payments
    if (mpPayment.status === 'rejected' || mpPayment.status === 'cancelled') {
      const payment = await prisma.payment.findFirst({
        where: {
          OR: [
            { mercadopagoPreferenceId: mpPayment.externalReference },
            ...(mpPayment.metadata?.paymentId
              ? [{ id: String(mpPayment.metadata.paymentId) }]
              : []),
          ],
        },
      });

      if (payment && payment.status !== 'FAILED') {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'FAILED' },
        });
        
        await prisma.fee.update({
          where: { id: payment.feeId },
          data: { status: 'PENDING' },
        });
      }

      return apiSuccess({
        received: true,
        status: mpPayment.status,
        action: 'marked_failed',
      });
    }

    if (mpPayment.status !== 'approved') {
      return apiSuccess({
        received: true,
        status: mpPayment.status,
        action: 'ignored',
      });
    }

    const payment = await prisma.payment.findFirst({
      where: {
        OR: [
          { mercadopagoPreferenceId: mpPayment.externalReference },
          ...(mpPayment.metadata?.paymentId
            ? [{ id: String(mpPayment.metadata.paymentId) }]
            : []),
        ],
      },
    });

    if (!payment) {
      return apiError('Pago no encontrado', 404, 'MercadoPago payment no vinculado', 'PAYMENT_NOT_FOUND');
    }

    const result = await confirmPayment(payment.id, {
      mercadopagoPaymentId: mpPayment.id,
    });

    return apiSuccess({ received: true, status: result.status });
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
