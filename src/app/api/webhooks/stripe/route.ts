import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { verifyStripeWebhook } from '@/lib/stripe';
import { confirmPayment } from '@/lib/payments';

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('stripe-signature');
    const payload = await request.text();

    const event = await verifyStripeWebhook(payload, signature);

    // Handle payment failure/expiry events
    if (event.type === 'checkout.session.expired' || event.type === 'payment_intent.payment_failed') {
      const session = event.data.object;
      const stripeSessionId = session.id;
      
      const payment = await prisma.payment.findFirst({
        where: { stripeSessionId },
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
      
      return apiSuccess({ received: true, type: event.type, action: 'marked_failed' });
    }

    if (event.type !== 'checkout.session.completed') {
      return apiSuccess({ received: true, type: event.type });
    }

    const session = event.data.object;
    const stripeSessionId = session.id;
    const stripePaymentId =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id ?? null;

    const payment = await prisma.payment.findFirst({
      where: { stripeSessionId },
    });

    if (!payment) {
      return apiError('Pago no encontrado', 404, 'Stripe session ID desconocido', 'PAYMENT_NOT_FOUND');
    }

    const result = await confirmPayment(payment.id, {
      stripePaymentId: stripePaymentId ?? undefined,
    });

    return apiSuccess({ received: true, status: result.status });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Stripe')) {
      return apiError('Firma inválida', 401, error.message, 'INVALID_SIGNATURE');
    }
    return apiDbError(error, 'Error al procesar webhook de Stripe');
  }
}
