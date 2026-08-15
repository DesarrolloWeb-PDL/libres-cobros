import type { Prisma } from '@prisma/client';

export async function getCommissionRate(
  tx: Prisma.TransactionClient
): Promise<number> {
  const config = await tx.siteConfig.findUnique({
    where: { key: 'commission_rate' },
  });

  if (!config || config.value === '') {
    return 0;
  }

  const parsed = parseFloat(config.value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export async function createCommission(
  tx: Prisma.TransactionClient,
  payment: {
    id: string;
    feeId: string;
    amount: number;
  }
) {
  const rate = await getCommissionRate(tx);
  const amount = Math.round(payment.amount * rate) / 100;

  return tx.commission.create({
    data: {
      paymentId: payment.id,
      feeId: payment.feeId,
      amount,
      rate,
    },
  });
}
