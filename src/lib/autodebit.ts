import { prisma } from '@/lib/db';
import { confirmPayment, type ConfirmPaymentOptions } from '@/lib/payments';

export interface SettleAutoDebitChargeInput {
  clubId: string;
  autoDebitId: string;
  memberId: string;
  /** Monthly amount locked on the AutoDebit subscription. */
  amount: number;
  method: 'mercadopago' | 'stripe';
  confirmOptions: ConfirmPaymentOptions;
}

export type SettleAutoDebitChargeResult =
  | { status: 'confirmed'; paymentId: string; commissionId: string | null }
  | { status: 'already_paid' }
  | { status: 'fee_already_paid' }
  | { status: 'plan_not_found' };

/**
 * Settles one auto-debit charge for the current month: finds or creates the
 * month's fee (Fee is unique per member+month+year, so this is idempotent),
 * creates the PENDING Payment, and hands off to `confirmPayment` — the shared
 * gateway-agnostic confirmation brain. Never duplicates commission logic.
 */
export async function settleAutoDebitCharge(
  input: SettleAutoDebitChargeInput
): Promise<SettleAutoDebitChargeResult> {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  let fee = await prisma.fee.findUnique({
    where: {
      memberId_month_year: {
        memberId: input.memberId,
        month,
        year,
      },
    },
  });

  if (!fee) {
    // Fee.planId is a required FK: prefer the member's own plan, fall back to
    // the institution's cheapest active plan, and refuse to create an orphan
    // fee when the institution has no plans at all.
    const member = await prisma.member.findUnique({
      where: { id: input.memberId },
      select: { planId: true },
    });

    const plan = member?.planId
      ? await prisma.plan.findFirst({
          where: { id: member.planId, clubId: input.clubId },
        })
      : await prisma.plan.findFirst({
          where: { clubId: input.clubId, isActive: true },
          orderBy: { amount: 'asc' },
        });

    if (!plan) {
      return { status: 'plan_not_found' };
    }

    fee = await prisma.fee.create({
      data: {
        clubId: input.clubId,
        memberId: input.memberId,
        planId: plan.id,
        month,
        year,
        amount: input.amount,
        dueDate: now,
        status: 'PENDING',
      },
    });
  }

  if (fee.status === 'PAID') {
    return { status: 'fee_already_paid' };
  }

  const payment = await prisma.payment.create({
    data: {
      clubId: input.clubId,
      feeId: fee.id,
      memberId: input.memberId,
      amount: input.amount,
      method: input.method,
      status: 'PENDING',
      ...(input.confirmOptions.stripePaymentId && {
        stripePaymentId: input.confirmOptions.stripePaymentId,
      }),
      ...(input.confirmOptions.mercadopagoPaymentId && {
        mercadopagoPaymentId: input.confirmOptions.mercadopagoPaymentId,
      }),
    },
  });

  const result = await confirmPayment(payment.id, input.confirmOptions);

  if (result.status === 'already-paid') {
    return { status: 'already_paid' };
  }

  return {
    status: 'confirmed',
    paymentId: result.paymentId,
    commissionId: result.commissionId,
  };
}

/**
 * Advances the AutoDebit's next billing date to the first day of the next
 * month after a successful charge.
 */
export async function advanceAutoDebitBilling(autoDebitId: string): Promise<void> {
  const next = new Date();
  next.setMonth(next.getMonth() + 1);

  await prisma.autoDebit.update({
    where: { id: autoDebitId },
    data: { nextBillingAt: next },
  });
}
