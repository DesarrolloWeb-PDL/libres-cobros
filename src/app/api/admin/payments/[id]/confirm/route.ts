import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { requireClub, AuthError } from '@/lib/access';
import { confirmPayment } from '@/lib/payments';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireClub(request);

    const { id } = await params;

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { fee: true },
    });

    if (!payment) {
      return apiError('Pago no encontrado', 404, 'Payment ID inválido', 'PAYMENT_NOT_FOUND');
    }

    // Scope check: the payment must belong to the caller's club.
    if (ctx.clubId && payment.clubId !== ctx.clubId) {
      return apiError('Pago no encontrado', 404, 'Payment ID inválido', 'PAYMENT_NOT_FOUND');
    }

    if (payment.method !== 'bank_transfer') {
      return apiError(
        'Solo se pueden confirmar transferencias bancarias',
        409,
        'Invalid method',
        'INVALID_PAYMENT_METHOD'
      );
    }

    if (payment.status !== 'PENDING') {
      return apiError(
        'El pago ya fue procesado',
        409,
        `Status actual: ${payment.status}`,
        'PAYMENT_NOT_PENDING'
      );
    }

    const result = await confirmPayment(payment.id);

    return apiSuccess({ status: result.status });
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }
    return apiDbError(error, 'Error al confirmar la transferencia');
  }
}