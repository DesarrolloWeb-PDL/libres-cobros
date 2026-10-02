import { z } from 'zod';

export const FeeStatusSchema = z.enum(['PENDING', 'PAID', 'OVERDUE']);

export const CreateFeeSchema = z.object({
  memberId: z.string().cuid(),
  planId: z.string().cuid(),
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

export const PlanSchema = z.object({
  id: z.string().cuid().optional(),
  name: z.string().min(1, 'El nombre es obligatorio'),
  amount: z.number().positive('El monto debe ser mayor a 0'),
  description: z.string().optional(),
  isActive: z.boolean().optional().default(true),
});

export const UpdatePlansSchema = z.object({
  plans: z.array(PlanSchema).optional().default([]),
  deletedIds: z.array(z.string().cuid()).optional().default([]),
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
export type PlanInput = z.infer<typeof PlanSchema>;
export type UpdatePlansInput = z.infer<typeof UpdatePlansSchema>;
export type FeeListQueryInput = z.infer<typeof FeeListQuerySchema>;

export interface PlanListItem {
  id: string;
  name: string;
  amount: number;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlanListResponse {
  data: PlanListItem[];
}

export interface FeeListItem {
  id: string;
  memberId: string;
  member: {
    dni: string;
    firstName: string;
    lastName: string;
  };
  planId: string;
  plan: {
    name: string;
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
  planId: string;
  plan: {
    name: string;
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
