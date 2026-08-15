import { prisma } from '@/lib/db';
import { createCommission } from '@/lib/commissions';

export type ConfirmPaymentResult =
  | { status: 'already-paid' }
  | { status: 'paid'; paymentId: string; commissionId: string };

export interface ConfirmPaymentOptions {
  stripePaymentId?: string;
  mercadopagoPaymentId?: string;
}

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

    const commission = await createCommission(tx, updatedPayment);

    return {
      status: 'paid',
      paymentId: updatedPayment.id,
      commissionId: commission.id,
    };
  });
}
