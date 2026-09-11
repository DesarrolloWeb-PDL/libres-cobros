import type { Prisma, Club, Commission } from '@prisma/client';

/**
 * Institution-driven commission creation.
 *
 * PERCENTAGE institutions charge `club.commissionValue` percent of each confirmed
 * payment; the rate is snapshotted on the Commission row so later rate changes
 * do not alter historical commissions. FIXED institutions charge nothing per payment
 * (they generate one ProviderInvoice per month at closing) and return null.
 */
export async function createCommission(
  tx: Prisma.TransactionClient,
  payment: { id: string; feeId: string; clubId: string; amount: number },
  club: Club
): Promise<Commission | null> {
  if (club.commissionType === 'FIXED') {
    return null;
  }

  const rate = club.commissionValue;
  const amount = Math.round(payment.amount * rate) / 100;

  return tx.commission.create({
    data: {
      clubId: club.id,
      paymentId: payment.id,
      feeId: payment.feeId,
      amount,
      rate,
    },
  });
}
