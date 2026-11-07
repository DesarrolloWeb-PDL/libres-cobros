import { prisma } from '@/lib/db';
import { institutionWhere } from '@/lib/access';
import type { InstitutionKpis, OverdueAgingBucket, PlatformKpis } from '@/types/kpi';

function getMonthBounds(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  end.setHours(0, 0, 0, 0);
  return { start, end };
}

function getPreviousMonthBounds(date: Date, monthsAgo: number) {
  const start = new Date(date.getFullYear(), date.getMonth() - monthsAgo, 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date.getFullYear(), date.getMonth() - monthsAgo + 1, 1);
  end.setHours(0, 0, 0, 0);
  return { start, end };
}

/** Pure: percentage of members up to date (0..100), one decimal. */
export function sociosAlDiaPercent(upToDate: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((upToDate / total) * 1000) / 10;
}

/** Pure: month-over-month change in percent; null when not comparable. */
export function monthOverMonthPercent(current: number, previous: number): number | null {
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

const OVERDUE_AGING_BUCKET_DEFS: Array<{ key: string; label: string; maxDays: number | null }> = [
  { key: '0-30', label: '0-30 días', maxDays: 30 },
  { key: '31-60', label: '31-60 días', maxDays: 60 },
  { key: '61-90', label: '61-90 días', maxDays: 90 },
  { key: '90+', label: '90+ días', maxDays: null },
];

/** Pure: bucket overdue fees by days past due. */
export function computeOverdueAging(
  fees: Array<{ dueDate: Date | string; amount: number }>,
  now: Date = new Date()
): OverdueAgingBucket[] {
  const buckets: OverdueAgingBucket[] = OVERDUE_AGING_BUCKET_DEFS.map((def) => ({
    key: def.key,
    bucket: def.key,
    label: def.label,
    count: 0,
    amount: 0,
  }));

  for (const fee of fees) {
    const due = fee.dueDate instanceof Date ? fee.dueDate : new Date(fee.dueDate);
    const daysPastDue = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    const index =
      daysPastDue <= 30 ? 0 : daysPastDue <= 60 ? 1 : daysPastDue <= 90 ? 2 : 3;
    buckets[index].count += 1;
    buckets[index].amount += fee.amount;
  }

  return buckets;
}

export const computeAgingBuckets = computeOverdueAging;
export const getOverdueAging = computeOverdueAging;
export const computeOverdueAgingBuckets = computeOverdueAging;

export async function getInstitutionKpis(
  institutionId: string | null,
  now: Date = new Date()
): Promise<InstitutionKpis> {
  const scope = institutionWhere(institutionId);
  const { start: startOfMonth, end: endOfMonth } = getMonthBounds(now);
  const { start: startPrev, end: endPrev } = getPreviousMonthBounds(now, 1);

  const [
    activeMembers,
    upToDateMembers,
    currentPayments,
    previousPayments,
    overdueFeeRows,
  ] = await Promise.all([
    prisma.member.count({ where: { status: 'ACTIVE', ...scope } }),
    prisma.member.count({
      where: {
        status: 'ACTIVE',
        ...scope,
        fees: { none: { status: 'OVERDUE' } },
      },
    }),
    prisma.payment.aggregate({
      where: { status: 'PAID', confirmedAt: { gte: startOfMonth, lt: endOfMonth }, ...scope },
      _sum: { amount: true },
      _count: { id: true },
    }),
    prisma.payment.aggregate({
      where: { status: 'PAID', confirmedAt: { gte: startPrev, lt: endPrev }, ...scope },
      _sum: { amount: true },
      _count: { id: true },
    }),
    prisma.fee.findMany({
      where: { status: 'OVERDUE', ...scope },
      select: { dueDate: true, amount: true },
    }),
  ]);

  const collectionsCurrentMonth = currentPayments._sum.amount ?? 0;
  const collectionsPreviousMonth = previousPayments._sum.amount ?? 0;

  const overdueAging = computeOverdueAging(overdueFeeRows, now);
  const overdueFeesCount = overdueAging.reduce((sum, bucket) => sum + bucket.count, 0);
  const overdueFeesAmount = overdueAging.reduce((sum, bucket) => sum + bucket.amount, 0);

  const overdueAgingBuckets = overdueAging.reduce<Record<string, { count: number; amount: number }>>(
    (acc, bucket) => {
      acc[bucket.key] = { count: bucket.count, amount: bucket.amount };
      return acc;
    },
    {}
  );

  return {
    activeMembers,
    upToDateMembers,
    sociosAlDiaPercent: sociosAlDiaPercent(upToDateMembers, activeMembers),
    collectionsCurrentMonth,
    collectionsPreviousMonth,
    collectionsChangePercent: monthOverMonthPercent(collectionsCurrentMonth, collectionsPreviousMonth),
    overdueFeesCount,
    overdueFeesAmount,
    overdueAging,
    overdueAgingBuckets,
    agingBuckets: overdueAging,
    overdueByAging: overdueAgingBuckets,
    overdue0to30Count: overdueAging[0].count,
    overdue0to30Amount: overdueAging[0].amount,
    overdue31to60Count: overdueAging[1].count,
    overdue31to60Amount: overdueAging[1].amount,
    overdue61to90Count: overdueAging[2].count,
    overdue61to90Amount: overdueAging[2].amount,
    overdue90PlusCount: overdueAging[3].count,
    overdue90PlusAmount: overdueAging[3].amount,
    paymentsThisMonthCount: currentPayments._count.id,
    paymentsThisMonthAmount: collectionsCurrentMonth,
    generatedAt: now.toISOString(),
  };
}

export async function getPlatformKpis(now: Date = new Date()): Promise<PlatformKpis> {
  const { start, end } = getMonthBounds(now);
  const [institutionsCount, payments] = await Promise.all([
    prisma.club.count(),
    prisma.payment.aggregate({
      where: { status: 'PAID', confirmedAt: { gte: start, lt: end } },
      _sum: { amount: true },
      _count: { id: true },
    }),
  ]);

  return {
    institutionsCount,
    totalCollectionsThisMonth: payments._sum.amount ?? 0,
    totalPaymentsThisMonthCount: payments._count.id,
    generatedAt: now.toISOString(),
  };
}