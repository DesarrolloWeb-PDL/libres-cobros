import { z } from 'zod';

export const CreateCommissionSchema = z.object({
  paymentId: z.string().cuid(),
  feeId: z.string().cuid(),
  amount: z.number().nonnegative(),
  rate: z.number().nonnegative(),
  periodId: z.string().cuid().optional(),
});

export const CommissionListQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  periodId: z.string().cuid().optional(),
  unassigned: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(1000).default(20),
});

export const MonthlyClosingCreateSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
});

export const WhatsAppSendSchema = z.object({
  category: z.enum(['ADULT', 'FAMILY', 'MINOR']).optional(),
  status: z.enum(['PENDING', 'PAID', 'OVERDUE']).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});

export type CreateCommissionInput = z.infer<typeof CreateCommissionSchema>;
export type CommissionListQueryInput = z.infer<typeof CommissionListQuerySchema>;
export type MonthlyClosingCreateInput = z.infer<typeof MonthlyClosingCreateSchema>;
export type WhatsAppSendInput = z.infer<typeof WhatsAppSendSchema>;

export interface CommissionListItem {
  id: string;
  paymentId: string;
  feeId: string;
  member: {
    dni: string;
    firstName: string;
    lastName: string;
  };
  fee: {
    month: number;
    year: number;
  };
  payment: {
    method: string;
    amount: number;
  };
  amount: number;
  rate: number;
  periodId: string | null;
  createdAt: string;
}

export interface CommissionListResponse {
  data: CommissionListItem[];
  total: number;
  page: number;
  limit: number;
  totals: {
    amount: number;
    paymentAmount: number;
    count: number;
  };
}

export interface MonthlyClosingListItem {
  id: string;
  month: number;
  year: number;
  status: string;
  totalPayments: number;
  totalCommissions: number;
  commissionRate: number;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MonthlyClosingListResponse {
  data: MonthlyClosingListItem[];
}

export interface MonthlyClosingResult {
  id: string;
  status: string;
  totalPayments: number;
  totalCommissions: number;
  commissionCount: number;
  commissionRate: number;
}
