import { z } from 'zod';
import { MemberCategorySchema } from './member';
import { PaymentMethodSchema } from './payment';

export const DebtReportQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  category: MemberCategorySchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(1000).default(20),
});

export const PaymentReportQuerySchema = z.object({
  memberId: z.string().cuid().optional(),
  method: PaymentMethodSchema.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(1000).default(20),
});

export const CommissionReportQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  periodId: z.string().cuid().optional(),
  unassigned: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(1000).default(20),
});

export const ExportReportQuerySchema = z.object({
  type: z.enum(['debts', 'payments', 'commissions']),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  category: MemberCategorySchema.optional(),
  memberId: z.string().cuid().optional(),
  method: PaymentMethodSchema.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  periodId: z.string().cuid().optional(),
});

export type DebtReportQueryInput = z.infer<typeof DebtReportQuerySchema>;
export type PaymentReportQueryInput = z.infer<typeof PaymentReportQuerySchema>;
export type CommissionReportQueryInput = z.infer<typeof CommissionReportQuerySchema>;
export type ExportReportQueryInput = z.infer<typeof ExportReportQuerySchema>;

export interface DebtReportItem {
  memberId: string;
  dni: string;
  firstName: string;
  lastName: string;
  category: string;
  phone: string | null;
  email: string | null;
  pendingFees: number;
  overdueFees: number;
  totalDebt: number;
  fees: {
    id: string;
    month: number;
    year: number;
    amount: number;
    dueDate: string;
    status: string;
  }[];
}

export interface DebtReportResponse {
  data: DebtReportItem[];
  total: number;
  page: number;
  limit: number;
  totals: {
    totalDebt: number;
    pendingFees: number;
    overdueFees: number;
    membersCount: number;
  };
}

export interface PaymentReportItem {
  id: string;
  memberId: string;
  member: {
    dni: string;
    firstName: string;
    lastName: string;
  };
  fee: {
    month: number;
    year: number;
  };
  amount: number;
  method: string;
  confirmedAt: string;
  createdAt: string;
}

export interface PaymentReportResponse {
  data: PaymentReportItem[];
  total: number;
  page: number;
  limit: number;
  totals: {
    amount: number;
    count: number;
  };
}

export interface ReportFilterValues {
  month: string;
  year: string;
  category: string;
  method: string;
  status: string;
  from: string;
  to: string;
}

export interface ExcelRow {
  [key: string]: string | number | null;
}
