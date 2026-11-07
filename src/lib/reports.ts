import { prisma } from './db';
import { clubWhere } from '@/lib/access';
import type {
  DebtReportItem,
  DebtReportResponse,
  PaymentReportItem,
  PaymentReportResponse,
} from '@/types/report';
import type { CommissionListResponse } from '@/types/commission';
import { computeOverdueAging } from '@/lib/kpis';

export interface DebtReportFilters {
  clubId: string | null;
  month?: number;
  year?: number;
  category?: string;
  page?: number;
  limit?: number;
}

export interface PaymentReportFilters {
  clubId: string | null;
  memberId?: string;
  method?: string;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}

export interface CommissionReportFilters {
  clubId: string | null;
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
    ...clubWhere(filters.clubId),
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
    ...clubWhere(filters.clubId),
    status: 'PAID',
    feeId: { not: null },
    memberId: { not: null },
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
    memberId: payment.memberId as string,
    member: payment.member as { dni: string; firstName: string; lastName: string },
    fee: payment.fee as { month: number; year: number },
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

  const where: Record<string, unknown> = {
    ...clubWhere(filters.clubId),
  };

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
      member: (commission.payment.member ?? { dni: '', firstName: '', lastName: '' }),
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

export interface MorosidadReportFilters {
  clubId: string | null;
  month?: number;
  year?: number;
  category?: string;
  page?: number;
  limit?: number;
}

export interface MorosidadReportBucket {
  key: string;
  label: string;
  count: number;
  amount: number;
  membersCount?: number;
}

export interface MorosidadReportItem {
  memberId: string;
  dni: string;
  firstName: string;
  lastName: string;
  category: string;
  planName: string | null;
  totalDebt: number;
  overdueFees: number;
  daysPastDue: number;
  bucket: string;
  fees: {
    id: string;
    month: number;
    year: number;
    amount: number;
    dueDate: string;
    status: string;
  }[];
}

export interface MorosidadReportResponse {
  data: MorosidadReportItem[];
  total: number;
  page: number;
  limit: number;
  totals: {
    totalDebt: number;
    overdueFees: number;
    membersCount: number;
  };
  buckets: MorosidadReportBucket[];
}

export async function generateMorosidadReport(
  filters: MorosidadReportFilters
): Promise<MorosidadReportResponse> {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;

  const where: Record<string, unknown> = {
    ...clubWhere(filters.clubId),
    status: 'OVERDUE',
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
        },
      },
      plan: { select: { name: true } },
    },
    orderBy: [{ dueDate: 'asc' }],
  });

  const now = new Date();
  const memberMap = new Map<string, MorosidadReportItem>();

  for (const fee of fees) {
    const member = fee.member;
    const due = fee.dueDate;
    const daysPastDue = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    const bucket =
      daysPastDue <= 30 ? '0-30' : daysPastDue <= 60 ? '31-60' : daysPastDue <= 90 ? '61-90' : '90+';

    const feeEntry = {
      id: fee.id,
      month: fee.month,
      year: fee.year,
      amount: fee.amount,
      dueDate: fee.dueDate.toISOString(),
      status: fee.status,
    };

    const existing = memberMap.get(member.id);
    if (existing) {
      existing.fees.push(feeEntry);
      existing.overdueFees += 1;
      existing.totalDebt += fee.amount;
      if (daysPastDue > existing.daysPastDue) {
        existing.daysPastDue = daysPastDue;
        existing.bucket = bucket;
      }
    } else {
      memberMap.set(member.id, {
        memberId: member.id,
        dni: member.dni,
        firstName: member.firstName,
        lastName: member.lastName,
        category: member.category,
        planName: fee.plan?.name ?? null,
        totalDebt: fee.amount,
        overdueFees: 1,
        daysPastDue,
        bucket,
        fees: [feeEntry],
      });
    }
  }

  const allItems = Array.from(memberMap.values());
  const total = allItems.length;
  const paginatedItems = allItems.slice((page - 1) * limit, page * limit);

  const bucketsRaw = computeOverdueAging(
    fees.map((f) => ({ dueDate: f.dueDate, amount: f.amount })),
    now
  );

  const buckets: MorosidadReportBucket[] = bucketsRaw.map((b) => ({
    key: b.key,
    label: b.label,
    count: b.count,
    amount: b.amount,
    membersCount: undefined,
  }));

  const totals = allItems.reduce(
    (acc, item) => {
      acc.totalDebt += item.totalDebt;
      acc.overdueFees += item.overdueFees;
      acc.membersCount += 1;
      return acc;
    },
    { totalDebt: 0, overdueFees: 0, membersCount: 0 }
  );

  return {
    data: paginatedItems,
    total,
    page,
    limit,
    totals,
    buckets,
  };
}

export interface ByConceptReportFilters {
  clubId: string | null;
  month?: number;
  year?: number;
  category?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface ByConceptReportItem {
  concept: string;
  category: string | null;
  planId: string | null;
  planName: string | null;
  feeCount: number;
  totalAmount: number;
  pendingAmount: number;
  overdueAmount: number;
  paidAmount: number;
}

export interface ByConceptReportResponse {
  data: ByConceptReportItem[];
  total: number;
  page: number;
  limit: number;
  totals: {
    feeCount: number;
    totalAmount: number;
    pendingAmount: number;
    overdueAmount: number;
    paidAmount: number;
  };
}

export async function generateByConceptReport(
  filters: ByConceptReportFilters
): Promise<ByConceptReportResponse> {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;

  const where: Record<string, unknown> = {
    ...clubWhere(filters.clubId),
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

  if (filters.status) {
    where.status = filters.status;
  }

  const fees = await prisma.fee.findMany({
    where,
    include: {
      member: { select: { category: true } },
      plan: { select: { id: true, name: true } },
    },
    orderBy: [{ plan: { name: 'asc' } }],
  });

  const groupMap = new Map<string, ByConceptReportItem>();

  for (const fee of fees) {
    const planId = fee.plan?.id ?? null;
    const planName = fee.plan?.name ?? null;
    const category = fee.member?.category ?? null;
    const key = `${planId ?? 'none'}|${category ?? 'none'}`;
    const concept = planName ?? category ?? 'Sin concepto';

    const existing = groupMap.get(key);
    const amount = fee.amount;
    const isPending = fee.status === 'PENDING';
    const isOverdue = fee.status === 'OVERDUE';
    const isPaid = fee.status === 'PAID';

    if (existing) {
      existing.feeCount += 1;
      existing.totalAmount += amount;
      if (isPending) existing.pendingAmount += amount;
      if (isOverdue) existing.overdueAmount += amount;
      if (isPaid) existing.paidAmount += amount;
    } else {
      groupMap.set(key, {
        concept,
        category,
        planId,
        planName,
        feeCount: 1,
        totalAmount: amount,
        pendingAmount: isPending ? amount : 0,
        overdueAmount: isOverdue ? amount : 0,
        paidAmount: isPaid ? amount : 0,
      });
    }
  }

  const allItems = Array.from(groupMap.values());
  const total = allItems.length;
  const paginatedItems = allItems.slice((page - 1) * limit, page * limit);

  const totals = allItems.reduce(
    (acc, item) => {
      acc.feeCount += item.feeCount;
      acc.totalAmount += item.totalAmount;
      acc.pendingAmount += item.pendingAmount;
      acc.overdueAmount += item.overdueAmount;
      acc.paidAmount += item.paidAmount;
      return acc;
    },
    { feeCount: 0, totalAmount: 0, pendingAmount: 0, overdueAmount: 0, paidAmount: 0 }
  );

  return {
    data: paginatedItems,
    total,
    page,
    limit,
    totals,
  };
}

// Aliases for compatibility with alternate naming.
export const generateAgingReport = generateMorosidadReport;
export const generateOverdueAgingReport = generateMorosidadReport;
export const generateMorosityReport = generateMorosidadReport;
export const generateConceptReport = generateByConceptReport;
export const generateFeesByConceptReport = generateByConceptReport;
export const generateByPlanReport = generateByConceptReport;
export const generateByCategoryReport = generateByConceptReport;
