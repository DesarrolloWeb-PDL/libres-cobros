import { prisma } from '@/lib/db';
import { institutionWhere } from '@/lib/access';
import type { InstitutionKpis, PlatformKpis } from '@/types/kpi';

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
    overdueFees,
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
    prisma.fee.aggregate({
      where: { status: 'OVERDUE', ...scope },
      _sum: { amount: true },
      _count: { id: true },
    }),
  ]);

  const collectionsCurrentMonth = currentPayments._sum.amount ?? 0;
  const collectionsPreviousMonth = previousPayments._sum.amount ?? 0;

  return {
    activeMembers,
    upToDateMembers,
    sociosAlDiaPercent: sociosAlDiaPercent(upToDateMembers, activeMembers),
    collectionsCurrentMonth,
    collectionsPreviousMonth,
    collectionsChangePercent: monthOverMonthPercent(collectionsCurrentMonth, collectionsPreviousMonth),
    overdueFeesCount: overdueFees._count.id,
    overdueFeesAmount: overdueFees._sum.amount ?? 0,
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