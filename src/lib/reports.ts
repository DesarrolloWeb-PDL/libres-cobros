import { prisma } from './db';
import type {
  DebtReportItem,
  DebtReportResponse,
  PaymentReportItem,
  PaymentReportResponse,
} from '@/types/report';
import type { CommissionListResponse } from '@/types/commission';

export interface DebtReportFilters {
  month?: number;
  year?: number;
  category?: string;
  page?: number;
  limit?: number;
}

export interface PaymentReportFilters {
  memberId?: string;
  method?: string;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}

export interface CommissionReportFilters {
  month?: number;
  year?: number;
  periodId?: string;
  unassigned?: boolean;
  page?: number;
  limit?: number;
}

export async function generateDebtReport(
  filters: DebtReportFilters
): Promise<DebtReportResponse> {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;

  const where: Record<string, unknown> = {
    status: { in: ['PENDING', 'OVERDUE'] },
  };

  if (filters.month !== undefined) {
    where.month = filters.month;
  }

  if (filters.year !== undefined) {
    where.year = filters.year;
  }

  if (filters.category) {
    where.member = { category: filters.category };
  }

  const fees = await prisma.fee.findMany({
    where,
    include: {
      member: {
        select: {
          id: true,
          dni: true,
          firstName: true,
          lastName: true,
          category: true,
          phone: true,
          email: true,
        },
      },
    },
    orderBy: [{ member: { lastName: 'asc' } }, { year: 'desc' }, { month: 'desc' }],
  });

  const memberMap = new Map<string, DebtReportItem>();

  for (const fee of fees) {
    const member = fee.member;
    const existing = memberMap.get(member.id);

    const feeEntry = {
      id: fee.id,
      month: fee.month,
      year: fee.year,
      amount: fee.amount,
      dueDate: fee.dueDate.toISOString(),
      status: fee.status,
    };

    if (existing) {
      existing.fees.push(feeEntry);
      if (fee.status === 'PENDING') {
        existing.pendingFees += 1;
      } else if (fee.status === 'OVERDUE') {
        existing.overdueFees += 1;
      }
      existing.totalDebt += fee.amount;
    } else {
      memberMap.set(member.id, {
        memberId: member.id,
        dni: member.dni,
        firstName: member.firstName,
        lastName: member.lastName,
        category: member.category,
        phone: member.phone,
        email: member.email,
        pendingFees: fee.status === 'PENDING' ? 1 : 0,
        overdueFees: fee.status === 'OVERDUE' ? 1 : 0,
        totalDebt: fee.amount,
        fees: [feeEntry],
      });
    }
  }

  const allItems = Array.from(memberMap.values());
  const total = allItems.length;
  const paginatedItems = allItems.slice((page - 1) * limit, page * limit);

  const totals = allItems.reduce(
    (acc, item) => {
      acc.totalDebt += item.totalDebt;
      acc.pendingFees += item.pendingFees;
      acc.overdueFees += item.overdueFees;
      acc.membersCount += 1;
      return acc;
    },
    {
      totalDebt: 0,
      pendingFees: 0,
      overdueFees: 0,
      membersCount: 0,
    }
  );

  return {
    data: paginatedItems,
    total,
    page,
    limit,
    totals,
  };
}

export async function generatePaymentReport(
  filters: PaymentReportFilters
): Promise<PaymentReportResponse> {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;

  const where: Record<string, unknown> = {
    status: 'PAID',
  };

  if (filters.memberId) {
    where.memberId = filters.memberId;
  }

  if (filters.method) {
    where.method = filters.method;
  }

  if (filters.from || filters.to) {
    where.createdAt = {};
    if (filters.from) {
      (where.createdAt as Record<string, unknown>).gte = filters.from;
    }
    if (filters.to) {
      (where.createdAt as Record<string, unknown>).lte = filters.to;
    }
  }

  const [payments, total, aggregate] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        member: {
          select: { dni: true, firstName: true, lastName: true },
        },
        fee: {
          select: { month: true, year: true },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.payment.count({ where }),
    prisma.payment.aggregate({
      where,
      _sum: { amount: true },
      _count: { id: true },
    }),
  ]);

  const data: PaymentReportItem[] = payments.map((payment) => ({
    id: payment.id,
    memberId: payment.memberId,
    member: payment.member,
    fee: payment.fee,
    amount: payment.amount,
    method: payment.method,
    confirmedAt: payment.confirmedAt?.toISOString() ?? payment.createdAt.toISOString(),
    createdAt: payment.createdAt.toISOString(),
  }));

  return {
    data,
    total,
    page,
    limit,
    totals: {
      amount: aggregate._sum.amount ?? 0,
      count: aggregate._count.id,
    },
  };
}

export async function generateCommissionReport(
  filters: CommissionReportFilters
): Promise<CommissionListResponse> {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;

  const where: Record<string, unknown> = {};

  if (filters.periodId) {
    where.periodId = filters.periodId;
  } else if (filters.unassigned) {
    where.periodId = null;
  }

  if (filters.month !== undefined && filters.year !== undefined) {
    const start = new Date(filters.year, filters.month - 1, 1, 0, 0, 0, 0);
    const end = new Date(filters.year, filters.month, 1, 0, 0, 0, 0);
    where.createdAt = { gte: start, lt: end };
  }

  const [commissions, total, aggregate] = await Promise.all([
    prisma.commission.findMany({
      where,
      include: {
        fee: {
          select: { month: true, year: true },
        },
        payment: {
          select: {
            method: true,
            amount: true,
            member: {
              select: { dni: true, firstName: true, lastName: true },
            },
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.commission.count({ where }),
    prisma.commission.aggregate({
      where,
      _sum: { amount: true },
      _count: { id: true },
    }),
  ]);

  const totalPaymentAmount = commissions.reduce((sum, c) => sum + c.payment.amount, 0);

  return {
    data: commissions.map((commission) => ({
      id: commission.id,
      paymentId: commission.paymentId,
      feeId: commission.feeId,
      amount: commission.amount,
      rate: commission.rate,
      periodId: commission.periodId,
      createdAt: commission.createdAt.toISOString(),
      member: commission.payment.member,
      fee: commission.fee,
      payment: {
        method: commission.payment.method,
        amount: commission.payment.amount,
      },
    })),
    total,
    page,
    limit,
    totals: {
      amount: aggregate._sum.amount ?? 0,
      paymentAmount: totalPaymentAmount,
      count: aggregate._count.id,
    },
  };
}
