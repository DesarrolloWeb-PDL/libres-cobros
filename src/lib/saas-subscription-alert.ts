import { DateTime } from 'luxon';
import { prisma } from '@/lib/db';
import type { PrismaClient, Prisma, SaasInvoice } from '@prisma/client';

export const DEFAULT_DUE_SOON_DAYS = 5;

export type SubscriptionAlertInvoice = Pick<
  SaasInvoice,
  'id' | 'amount' | 'dueDate' | 'month' | 'year'
>;

export type SubscriptionAlertState =
  | { status: 'ok'; invoice: null }
  | {
      status: 'due-soon';
      invoice: SubscriptionAlertInvoice & { daysUntilDue: number };
    }
  | {
      status: 'overdue';
      invoice: SubscriptionAlertInvoice & { daysOverdue: number };
    };

export type OverdueInstitution = {
  institutionId: string;
  name: string;
  count: number;
  oldestDueDate: Date;
  daysOverdue: number;
};

type AlertClient = PrismaClient | Prisma.TransactionClient;

export function getCurrentBillingPeriod(now = new Date()) {
  const art = DateTime.fromJSDate(now, {
    zone: 'America/Argentina/Buenos_Aires',
  }).startOf('day');
  return { month: art.month, year: art.year };
}

export function startOfDayUtc(date: Date): DateTime {
  return DateTime.fromJSDate(date, { zone: 'utc' }).startOf('day');
}

export function calculateDaysUntilDue(dueDate: Date, now = new Date()): number {
  const today = startOfDayUtc(now);
  const due = startOfDayUtc(dueDate);
  return Math.floor(due.diff(today, 'days').days);
}

export function calculateDaysOverdue(dueDate: Date, now = new Date()): number {
  const today = startOfDayUtc(now);
  const due = startOfDayUtc(dueDate);
  return Math.max(0, Math.floor(today.diff(due, 'days').days));
}

export async function getDueSoonDays(
  client: AlertClient = prisma
): Promise<number> {
  const config = await client.siteConfig.findFirst({
    where: { clubId: null, key: 'saas_due_soon_days' },
  });
  const raw = config?.value ?? '';
  const parsed = parseInt(raw.trim(), 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    return DEFAULT_DUE_SOON_DAYS;
  }
  return parsed;
}

export async function getInstitutionSubscriptionAlert(
  institutionId: string,
  now = new Date(),
  client: AlertClient = prisma
): Promise<SubscriptionAlertState> {
  const { month, year } = getCurrentBillingPeriod(now);

  const invoice = await client.saasInvoice.findUnique({
    where: { institutionId_month_year: { institutionId, month, year } },
  });

  if (!invoice) {
    return { status: 'ok', invoice: null };
  }

  if (invoice.status === 'OVERDUE') {
    return {
      status: 'overdue',
      invoice: {
        id: invoice.id,
        amount: invoice.amount,
        dueDate: invoice.dueDate,
        month: invoice.month,
        year: invoice.year,
        daysOverdue: calculateDaysOverdue(invoice.dueDate, now),
      },
    };
  }

  if (invoice.status === 'PENDING') {
    const daysUntilDue = calculateDaysUntilDue(invoice.dueDate, now);
    const window = await getDueSoonDays(client);
    if (daysUntilDue >= 0 && daysUntilDue <= window) {
      return {
        status: 'due-soon',
        invoice: {
          id: invoice.id,
          amount: invoice.amount,
          dueDate: invoice.dueDate,
          month: invoice.month,
          year: invoice.year,
          daysUntilDue,
        },
      };
    }
  }

  return { status: 'ok', invoice: null };
}

export async function getOverdueInstitutions(
  now = new Date(),
  client: AlertClient = prisma
): Promise<OverdueInstitution[]> {
  const invoices = await client.saasInvoice.findMany({
    where: { status: 'OVERDUE' },
    include: {
      institution: {
        select: { id: true, name: true },
      },
    },
    orderBy: { dueDate: 'asc' },
  });

  const map = new Map<string, OverdueInstitution>();

  for (const invoice of invoices) {
    const existing = map.get(invoice.institutionId);
    const dueDate = invoice.dueDate;
    if (!existing) {
      map.set(invoice.institutionId, {
        institutionId: invoice.institutionId,
        name: invoice.institution.name,
        count: 1,
        oldestDueDate: dueDate,
        daysOverdue: calculateDaysOverdue(dueDate, now),
      });
    } else {
      existing.count += 1;
      if (dueDate < existing.oldestDueDate) {
        existing.oldestDueDate = dueDate;
        existing.daysOverdue = calculateDaysOverdue(dueDate, now);
      }
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => b.daysOverdue - a.daysOverdue || a.name.localeCompare(b.name)
  );
}
