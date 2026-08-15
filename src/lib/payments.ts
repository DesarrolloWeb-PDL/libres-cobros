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
 * club-driven commission logic. The club is resolved from the payment's own
 * clubId, so commission rates always come from the club that owns the payment.
 */
export async function confirmPayment(
  paymentId: string,
  opts: ConfirmPaymentOptions = {}
): Promise<ConfirmPaymentResult> {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: paymentId },
      include: { fee: true },
    });

    if (!payment) {
      throw new Error(`Payment ${paymentId} not found`);
    }

    if (payment.status === 'PAID' || payment.fee.status === 'PAID') {
      return { status: 'already-paid' };
    }

    const club = await tx.club.findUnique({
      where: { id: payment.clubId },
    });

    if (!club) {
      throw new Error(`Club ${payment.clubId} not found for payment ${paymentId}`);
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
      status: 'paid',
      paymentId: updatedPayment.id,
      commissionId: commission?.id ?? null,
    };
  });
}
