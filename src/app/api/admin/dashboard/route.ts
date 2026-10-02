import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { requireInstitution, institutionWhere, AuthError } from '@/lib/access';
import type { DashboardData } from '@/types/dashboard';

const MONTH_LABELS = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

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

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireInstitution(request);

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const { start: startOfMonth, end: endOfMonth } = getMonthBounds(now);

    const scope = institutionWhere(ctx.institutionId);

    const currentMonthFeeWhere = {
      ...scope,
      month: currentMonth,
      year: currentYear,
    };

    const [
      activeMembers,
      newMembersThisMonth,
      feesGenerated,
      feesPaid,
      feesPending,
      feesOverdue,
      incomeCollected,
      incomePending,
      incomeOverdue,
      commissionsTotal,
      recentPayments,
    ] = await Promise.all([
      prisma.member.count({ where: { status: 'ACTIVE', ...scope } }),
      prisma.member.count({
        where: {
          joinDate: { gte: startOfMonth, lt: endOfMonth },
          ...scope,
        },
      }),
      prisma.fee.aggregate({
        where: currentMonthFeeWhere,
        _count: { id: true },
        _sum: { amount: true },
      }),
      prisma.fee.aggregate({
        where: { status: 'PAID', ...currentMonthFeeWhere },
        _count: { id: true },
        _sum: { amount: true },
      }),
      prisma.fee.aggregate({
        where: { status: 'PENDING', ...currentMonthFeeWhere },
        _count: { id: true },
        _sum: { amount: true },
      }),
      prisma.fee.aggregate({
        where: { status: 'OVERDUE', ...currentMonthFeeWhere },
        _count: { id: true },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: {
          status: 'PAID',
          confirmedAt: { gte: startOfMonth, lt: endOfMonth },
          ...scope,
        },
        _sum: { amount: true },
      }),
      prisma.fee.aggregate({
        where: { status: 'PENDING', ...currentMonthFeeWhere },
        _sum: { amount: true },
      }),
      prisma.fee.aggregate({
        where: { status: 'OVERDUE', ...currentMonthFeeWhere },
        _sum: { amount: true },
      }),
      prisma.commission.aggregate({
        where: {
          createdAt: { gte: startOfMonth, lt: endOfMonth },
          ...scope,
        },
        _sum: { amount: true },
      }),
      prisma.payment.findMany({
        where: {
          status: 'PAID',
          ...scope,
        },
        include: {
          member: {
            select: { firstName: true, lastName: true },
          },
        },
        orderBy: [{ confirmedAt: 'desc' }, { createdAt: 'desc' }],
        take: 10,
      }),
    ]);

    const historyMonths: { month: number; year: number; label: string; amount: number }[] = [];
    const historyQueries = [];
    for (let i = 5; i >= 0; i--) {
      const { start, end } = getPreviousMonthBounds(now, i);
      const labelIndex = start.getMonth();
      historyQueries.push(
        prisma.payment.aggregate({
          where: {
            status: 'PAID',
            confirmedAt: { gte: start, lt: end },
            ...scope,
          },
          _sum: { amount: true },
        }).then((result) => ({
          month: labelIndex + 1,
          year: start.getFullYear(),
          label: `${MONTH_LABELS[labelIndex]} ${start.getFullYear()}`,
          amount: result._sum.amount ?? 0,
        }))
      );
    }
    historyMonths.push(...(await Promise.all(historyQueries)));

    const data: DashboardData = {
      activeMembers,
      newMembersThisMonth,
      fees: {
        generated: {
          count: feesGenerated._count.id,
          amount: feesGenerated._sum.amount ?? 0,
        },
        paid: {
          count: feesPaid._count.id,
          amount: feesPaid._sum.amount ?? 0,
        },
        pending: {
          count: feesPending._count.id,
          amount: feesPending._sum.amount ?? 0,
        },
        overdue: {
          count: feesOverdue._count.id,
          amount: feesOverdue._sum.amount ?? 0,
        },
      },
      income: {
        collected: incomeCollected._sum.amount ?? 0,
        pending: incomePending._sum.amount ?? 0,
        overdue: incomeOverdue._sum.amount ?? 0,
      },
      commissions: commissionsTotal._sum.amount ?? 0,
      history: historyMonths,
      recentPayments: recentPayments.map((payment) => ({
        id: payment.id,
        memberName: `${payment.member.firstName} ${payment.member.lastName}`,
        amount: payment.amount,
        method: payment.method,
        confirmedAt: payment.confirmedAt?.toISOString() ?? null,
        createdAt: payment.createdAt.toISOString(),
      })),
    };

    return apiSuccess(data);
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }
    return apiDbError(error, 'Failed to load dashboard metrics');
  }
}
