import { z } from 'zod';

export const FeeStatusSchema = z.enum(['PENDING', 'PAID', 'OVERDUE']);

export const CreateFeeSchema = z.object({
  memberId: z.string().cuid(),
  feeConfigId: z.string().cuid(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  amount: z.number().positive(),
  dueDate: z.coerce.date(),
  status: FeeStatusSchema.default('PENDING'),
});

export const GenerateFeesSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
});

export const UpdateFeeConfigsSchema = z.object({
  configs: z
    .array(
      z.object({
        category: z.string().min(1),
        amount: z.number().positive('El monto debe ser mayor a 0'),
      })
    )
    .min(1),
});

export const FeeListQuerySchema = z.object({
  memberId: z.string().cuid().optional(),
  search: z.string().optional(),
  status: FeeStatusSchema.optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateFeeInput = z.infer<typeof CreateFeeSchema>;
export type GenerateFeesInput = z.infer<typeof GenerateFeesSchema>;
export type UpdateFeeConfigsInput = z.infer<typeof UpdateFeeConfigsSchema>;
export type FeeListQueryInput = z.infer<typeof FeeListQuerySchema>;

export interface FeeConfigListItem {
  id: string;
  category: string;
  amount: number;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FeeConfigListResponse {
  data: FeeConfigListItem[];
}

export interface FeeListItem {
  id: string;
  memberId: string;
  member: {
    dni: string;
    firstName: string;
    lastName: string;
  };
  feeConfigId: string;
  feeConfig: {
    category: string;
  };
  month: number;
  year: number;
  amount: number;
  dueDate: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeeListResponse {
  data: FeeListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface GenerateFeesResult {
  created: number;
  skipped: number;
  month: number;
  year: number;
}

export interface MemberFeeItem {
  id: string;
  memberId: string;
  feeConfigId: string;
  feeConfig: {
    category: string;
  };
  month: number;
  year: number;
  amount: number;
  dueDate: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface MemberFeesResponse {
  member: {
    id: string;
    dni: string;
    firstName: string;
    lastName: string;
  };
  fees: MemberFeeItem[];
}
