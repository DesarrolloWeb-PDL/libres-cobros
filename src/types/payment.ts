import { z } from 'zod';

export const PaymentMethodSchema = z.enum([
  'stripe',
  'mercadopago',
  'bank_transfer',
]);
export const PaymentStatusSchema = z.enum([
  'PENDING',
  'PAID',
  'FAILED',
  'REFUNDED',
]);

export const CreatePaymentSchema = z.object({
  feeId: z.string().cuid(),
  memberId: z.string().cuid(),
  amount: z.number().positive(),
  method: PaymentMethodSchema,
  bankTransferRef: z.string().optional(),
});

export const PaymentListQuerySchema = z.object({
  memberId: z.string().cuid().optional(),
  search: z.string().optional(),
  method: PaymentMethodSchema.optional(),
  status: PaymentStatusSchema.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreatePaymentInput = z.infer<typeof CreatePaymentSchema>;
export type PaymentListQueryInput = z.infer<typeof PaymentListQuerySchema>;

export interface PaymentListItem {
  id: string;
  feeId: string;
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
  status: string;
  stripeSessionId: string | null;
  mercadopagoPreferenceId: string | null;
  bankTransferRef: string | null;
  confirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentListResponse {
  data: PaymentListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface MemberPaymentItem {
  id: string;
  feeId: string;
  fee: {
    month: number;
    year: number;
  };
  amount: number;
  method: string;
  status: string;
  bankTransferRef: string | null;
  confirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MemberPaymentsResponse {
  member: {
    id: string;
    dni: string;
    firstName: string;
    lastName: string;
  };
  payments: MemberPaymentItem[];
}
