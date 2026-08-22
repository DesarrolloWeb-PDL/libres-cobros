import { z } from 'zod';

export const ClubCommissionTypeSchema = z.enum(['PERCENTAGE', 'FIXED']);
export const ClubStatusSchema = z.enum(['ACTIVE', 'INACTIVE']);

export const CreateClubSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  slug: z
    .string()
    .min(1, 'El slug es obligatorio')
    .regex(/^[a-z0-9-]+$/, 'El slug solo admite minúsculas, números y guiones'),
  commissionType: ClubCommissionTypeSchema.default('PERCENTAGE'),
  commissionValue: z.number().default(0),
  status: ClubStatusSchema.default('ACTIVE'),
});

export const UpdateClubSchema = CreateClubSchema.partial();

export type CreateClubInput = z.infer<typeof CreateClubSchema>;
export type UpdateClubInput = z.infer<typeof UpdateClubSchema>;

export interface ClubListItem {
  id: string;
  name: string;
  slug: string;
  commissionType: string;
  commissionValue: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClubListResponse {
  data: ClubListItem[];
}
