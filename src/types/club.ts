import { z } from 'zod';

export const InstitutionCommissionTypeSchema = z.enum(['PERCENTAGE', 'FIXED']);
export const InstitutionStatusSchema = z.enum(['ACTIVE', 'INACTIVE']);

export const CreateInstitutionSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  siglas: z.string().optional(),
  slug: z
    .string()
    .min(1, 'El slug es obligatorio')
    .regex(/^[a-z0-9-]+$/, 'El slug solo admite minúsculas, números y guiones'),
  commissionType: InstitutionCommissionTypeSchema.default('PERCENTAGE'),
  commissionValue: z.number().default(0),
  status: InstitutionStatusSchema.default('ACTIVE'),
});

export const UpdateInstitutionSchema = CreateInstitutionSchema.partial();

export type CreateInstitutionInput = z.infer<typeof CreateInstitutionSchema>;
export type UpdateInstitutionInput = z.infer<typeof UpdateInstitutionSchema>;

export interface InstitutionListItem {
  id: string;
  name: string;
  siglas?: string | null;
  slug: string;
  commissionType: string;
  commissionValue: number;
  status: string;
  // Institution customization fields
  logoUrl?: string | null;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InstitutionListResponse {
  data: InstitutionListItem[];
}

// Backward-compatible aliases
export const ClubCommissionTypeSchema = InstitutionCommissionTypeSchema;
export const ClubStatusSchema = InstitutionStatusSchema;
export const CreateClubSchema = CreateInstitutionSchema;
export const UpdateClubSchema = UpdateInstitutionSchema;
export type CreateClubInput = CreateInstitutionInput;
export type UpdateClubInput = UpdateInstitutionInput;
export type ClubListItem = InstitutionListItem;
export type ClubListResponse = InstitutionListResponse;
