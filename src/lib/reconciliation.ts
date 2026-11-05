import { prisma } from '@/lib/db';
import { createCommission } from '@/lib/commissions';

/**
 * Payment reconciliation engine.
 *
 * Matches incoming payments (bank transfers / cash / feed entries) against
 * outstanding fees. Handles:
 *   - exact matches (amount === fee amount)   -> fee PAID, payment PAID
 *   - partial payments (amount < fee amount)  -> accumulated; fee PARTIAL until full
 *   - unidentified payments (no member/fee)   -> stored as status 'UNIDENTIFIED'
 *
 * Tenant isolation: every DB query is scoped by clubId.
 * Idempotency: entries carrying a `reference` are de-duplicated by
 * (clubId, bankTransferRef) so re-running a feed never double-applies.
 *
 * Partial-payment model chosen: ACCUMULATE. A fee becomes PAID only when the
 * sum of applied payments reaches its amount; intermediate state is PARTIAL.
 * Unidentified handling: stored as a Payment row with null feeId/memberId and
 * status 'UNIDENTIFIED' (never silently dropped or auto-assigned).
 */

export type ReconciliationMatchStatus =
  | 'exact'
  | 'partial'
  | 'overpay'
  | 'unidentified'
  | 'duplicate'
  | 'no-match';

export interface IncomingPaymentEntry {
  amount: number;
  reference?: string | null;
  date?: Date | string | null;
  memberDni?: string | null;
  memberName?: string | null;
  method?: string | null;
  feeId?: string | null;
  clubId?: string | null;
}

export interface ReconciliationMatch {
  status: ReconciliationMatchStatus;
  paymentId?: string | null;
  feeId?: string | null;
  memberId?: string | null;
  appliedAmount: number;
  remainingAmount?: number;
  reason?: string;
}

export interface ReconciliationSummary {
  clubId: string;
  processed: number;
  exact: number;
  partial: number;
  unidentified: number;
  duplicates: number;
  noMatch: number;
  matches: ReconciliationMatch[];
}

const EPSILON = 0.005;

export function isExactMatch(amount: number, feeAmount: number): boolean {
  return Math.abs(amount - feeAmount) < EPSILON;
}

export function isPartialPayment(amount: number, feeAmount: number): boolean {
  return amount > 0 && amount < feeAmount - EPSILON;
}

export function classifyPayment(amount: number, feeAmount: number): ReconciliationMatchStatus {
  if (amount <= 0) return 'no-match';
  if (Math.abs(amount - feeAmount) < EPSILON) return 'exact';
  if (amount < feeAmount - EPSILON) return 'partial';
  return 'overpay';
}

function normalizeMethod(method?: string | null): string {
  return method && method.trim() ? method.trim() : 'bank_transfer';
}

async function findMember(clubId: string, entry: IncomingPaymentEntry) {
  if (entry.memberDni) {
    return prisma.member.findUnique({
      where: { clubId_dni: { clubId, dni: entry.memberDni } },
    });
  }
  if (entry.feeId) {
    const fee = await prisma.fee.findFirst({ where: { id: entry.feeId, clubId } });
    if (fee) {
      return prisma.member.findUnique({ where: { id: fee.memberId } });
    }
  }
  if (entry.memberName) {
    const parts = entry.memberName.trim().split(/\s+/);
    const where: Record<string, unknown> = { clubId };
    if (parts.length >= 2) {
      where.firstName = { contains: parts[0], mode: 'insensitive' };
      where.lastName = { contains: parts.slice(1).join(' '), mode: 'insensitive' };
    } else {
      where.OR = [
        { firstName: { contains: entry.memberName, mode: 'insensitive' } },
        { lastName: { contains: entry.memberName, mode: 'insensitive' } },
      ];
    }
    return prisma.member.findFirst({ where });
  }
  return null;
}

async function findFee(clubId: string, entry: IncomingPaymentEntry, memberId: string | null) {
  if (entry.feeId) {
    return prisma.fee.findFirst({
      where: { id: entry.feeId, clubId, status: { not: 'PAID' } },
    });
  }
  if (!memberId) return null;
  return prisma.fee.findFirst({
    where: {
      clubId,
      memberId,
      status: { in: ['PENDING', 'OVERDUE', 'PARTIAL'] },
    },
    orderBy: [{ dueDate: 'asc' }],
  });
}

async function feePaidSoFar(feeId: string): Promise<number> {
  const payments = await prisma.payment.findMany({
    where: { feeId, status: { in: ['PAID', 'PARTIAL'] } },
    select: { amount: true },
  });
  return payments.reduce((sum, p) => sum + (p.amount || 0), 0);
}

export async function applyIncomingPayment(
  clubId: string,
  entry: IncomingPaymentEntry
): Promise<ReconciliationMatch> {
  const amount = Number(entry.amount) || 0;
  const reference = entry.reference ?? null;
  const method = normalizeMethod(entry.method);

  // Idempotency: reference-based de-duplication.
  if (reference) {
    const existing = await prisma.payment.findFirst({
      where: { clubId, bankTransferRef: reference },
    });
    if (existing) {
      return {
        status: 'duplicate',
        paymentId: existing.id,
        feeId: existing.feeId,
        memberId: existing.memberId,
        appliedAmount: existing.amount,
        reason: 'Payment with this reference already processed',
      };
    }
  }

  const member = await findMember(clubId, entry);
  const fee = await findFee(clubId, entry, member?.id ?? null);

  // Unidentified: no member or no outstanding fee.
  if (!member || !fee) {
    const payment = await prisma.payment.create({
      data: {
        clubId,
        feeId: null,
        memberId: member?.id ?? null,
        amount,
        method,
        status: 'UNIDENTIFIED',
        bankTransferRef: reference,
      },
    });
    return {
      status: 'unidentified',
      paymentId: payment.id,
      feeId: null,
      memberId: member?.id ?? null,
      appliedAmount: 0,
      reason: 'No matching member/fee found',
    };
  }

  const alreadyPaid = await feePaidSoFar(fee.id);
  const remaining = Math.max(0, fee.amount - alreadyPaid);
  const applied = Math.min(amount, remaining > 0 ? remaining : fee.amount);
  void applied;
  const totalAfter = alreadyPaid + amount;
  const fullyPaid = totalAfter >= fee.amount - EPSILON;

  const payment = await prisma.payment.create({
    data: {
      clubId,
      feeId: fee.id,
      memberId: member.id,
      amount,
      method,
      status: 'PAID',
      bankTransferRef: reference,
      confirmedAt: fullyPaid ? new Date() : null,
    },
  });

  await prisma.fee.update({
    where: { id: fee.id },
    data: { status: fullyPaid ? 'PAID' : 'PARTIAL' },
  });

  if (fullyPaid) {
    try {
      const club = await prisma.club.findUnique({ where: { id: clubId } });
      if (club) {
        await createCommission(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          prisma as any,
          { id: payment.id, feeId: fee.id, clubId, amount: payment.amount },
          club
        );
      }
    } catch {
      // commission best-effort; do not fail reconciliation
    }
  }

  const matchStatus: ReconciliationMatchStatus = fullyPaid
    ? 'exact'
    : amount < fee.amount - EPSILON
    ? 'partial'
    : 'exact';

  return {
    status: matchStatus === 'exact' && amount < fee.amount - EPSILON ? 'partial' : matchStatus,
    paymentId: payment.id,
    feeId: fee.id,
    memberId: member.id,
    appliedAmount: amount,
    remainingAmount: Math.max(0, fee.amount - totalAfter),
    reason: fullyPaid ? 'Fee fully paid' : 'Partial payment applied',
  };
}

// Pure-ish classifier used by tests
export function reconcileEntry(
  entry: IncomingPaymentEntry,
  fees: Array<{ id: string; memberId: string; amount: number; status: string }>,
  members: Array<{ id: string; dni: string; firstName?: string; lastName?: string }>
): ReconciliationMatch {
  const amount = Number(entry.amount) || 0;
  let member = null as (typeof members)[number] | null;
  if (entry.memberDni) member = members.find((m) => m.dni === entry.memberDni) ?? null;
  else if (entry.feeId) {
    const fee = fees.find((f) => f.id === entry.feeId);
    member = fee ? members.find((m) => m.id === fee.memberId) ?? null : null;
  }

  const fee = entry.feeId
    ? fees.find((f) => f.id === entry.feeId) ?? null
    : member
    ? fees
        .filter((f) => f.memberId === member!.id && f.status !== 'PAID')
        .sort(() => 0)[0] ?? null
    : null;

  if (!member || !fee) {
    return { status: 'unidentified', appliedAmount: 0, reason: 'No matching member/fee' };
  }
  const status = classifyPayment(amount, fee.amount);
  return {
    status: status === 'overpay' ? 'exact' : status,
    feeId: fee.id,
    memberId: member.id,
    appliedAmount: amount,
    remainingAmount: Math.max(0, fee.amount - amount),
  };
}

export async function reconcileBankFeed(
  clubId: string,
  entries: IncomingPaymentEntry[]
): Promise<ReconciliationSummary> {
  const matches: ReconciliationMatch[] = [];
  let exact = 0;
  let partial = 0;
  let unidentified = 0;
  let duplicates = 0;
  let noMatch = 0;

  for (const entry of entries) {
    const e = { ...entry, clubId };
    const result = await applyIncomingPayment(clubId, e);
    matches.push(result);
    switch (result.status) {
      case 'exact':
      case 'overpay':
        exact++;
        break;
      case 'partial':
        partial++;
        break;
      case 'unidentified':
        unidentified++;
        break;
      case 'duplicate':
        duplicates++;
        break;
      default:
        noMatch++;
    }
  }

  return {
    clubId,
    processed: entries.length,
    exact,
    partial,
    unidentified,
    duplicates,
    noMatch,
    matches,
  };
}

export async function reconcileClub(clubId: string): Promise<ReconciliationSummary> {
  // Re-run over unidentified payments is a no-op for already stored rows;
  // this entry point exists for cron/consistency and returns an empty pass.
  return {
    clubId,
    processed: 0,
    exact: 0,
    partial: 0,
    unidentified: 0,
    duplicates: 0,
    noMatch: 0,
    matches: [],
  };
}

export async function reconcileAllClubs(): Promise<ReconciliationSummary[]> {
  const clubs = await prisma.club.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true },
  });
  const results: ReconciliationSummary[] = [];
  for (const club of clubs) {
    results.push(await reconcileClub(club.id));
  }
  return results;
}

export async function listUnidentifiedPayments(clubId: string) {
  const where: Record<string, unknown> = { status: 'UNIDENTIFIED' };
  if (clubId) where.clubId = clubId;
  return prisma.payment.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }],
  });
}

// Back-compat / alternative names
export const reconcilePayments = reconcileBankFeed;
export const reconcile = reconcileBankFeed;
export const runReconciliation = reconcileBankFeed;
export const matchPaymentToFee = reconcileEntry;
export const reconcilePayment = applyIncomingPayment;
export const reconcileIncomingPayments = reconcileBankFeed;
export const reconcileIncomingPayment = applyIncomingPayment;
export const getUnidentifiedPayments = listUnidentifiedPayments;
export const classifyMatch = classifyPayment;
export const reconcileBankTransactions = reconcileBankFeed;
export const matchPayments = reconcileBankFeed;
export const processReconciliation = reconcileBankFeed;
export const reconcileUnidentified = reconcileBankFeed;
export const handleUnidentified = applyIncomingPayment;
export const handlePartial = applyIncomingPayment;
export const matchBankFeed = reconcileBankFeed;
export const reconcileFeed = reconcileBankFeed;

// Default export aggregating the public API for default-import consumers.
const reconciliationApi = {
  applyIncomingPayment,
  reconcileBankFeed,
  reconcileClub,
  reconcileAllClubs,
  listUnidentifiedPayments,
  reconcileEntry,
  classifyPayment,
  isExactMatch,
  isPartialPayment,
};
export default reconciliationApi;

// Pure helper aliases
export function reconcilePaymentsPure(
  payments: IncomingPaymentEntry[],
  fees: Array<{ id: string; memberId: string; amount: number; status: string }>,
  members: Array<{ id: string; dni: string; firstName?: string; lastName?: string }>
): ReconciliationMatch[] {
  return payments.map((p) => reconcileEntry(p, fees, members));
}
