import { prisma } from '@/lib/db';
import { createCommission } from '@/lib/commissions';

export type ConfirmPaymentResult =
  | { status: 'already-paid' }
  | { status: 'paid'; paymentId: string; commissionId: string | null };

export interface ConfirmPaymentOptions {
  stripePaymentId?: string;
  mercadopagoPaymentId?: string;
}

/**
 * Marks a payment (and its fee) PAID inside a transaction and runs the
 * institution-driven commission logic. The institution is resolved from the payment's own
 * clubId, so commission rates always come from the institution that owns the payment.
 */
export async function confirmPayment(
  paymentId: string,
  opts: ConfirmPaymentOptions = {}
): Promise<ConfirmPaymentResult> {
  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: paymentId },
      include: { fee: true },
    });

    if (!payment) {
      throw new Error(`Payment ${paymentId} not found`);
    }

    if (payment.status === 'PAID' || payment.fee.status === 'PAID') {
      return { status: 'already-paid' as const };
    }

    const club = await tx.club.findUnique({
      where: { id: payment.clubId },
    });

    if (!club) {
      throw new Error(`Institution ${payment.clubId} not found for payment ${paymentId}`);
    }

    const updatedPayment = await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: 'PAID',
        confirmedAt: new Date(),
        ...(opts.stripePaymentId && { stripePaymentId: opts.stripePaymentId }),
        ...(opts.mercadopagoPaymentId && {
          mercadopagoPaymentId: opts.mercadopagoPaymentId,
        }),
      },
    });

    await tx.fee.update({
      where: { id: payment.feeId },
      data: { status: 'PAID' },
    });

    const commission = await createCommission(tx, updatedPayment, club);

    return {
      status: 'paid' as const,
      paymentId: updatedPayment.id,
      commissionId: commission?.id ?? null,
    };
  });

  // ARCA receipt emission runs AFTER the transaction commits and only for
  // freshly confirmed payments. Dynamic import + try/catch so deployments
  // without ARCA env/config never break the payment flow (emitirReciboC
  // itself never throws; the catch is defense in depth).
  if (result.status === 'paid') {
    try {
      const { emitirReciboC } = await import('@/lib/arca');
      await emitirReciboC(result.paymentId);
    } catch (error) {
      console.error('[arca] receipt emission failed', error);
    }
  }

  return result;
}
