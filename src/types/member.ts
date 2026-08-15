import { z } from 'zod';

export const MemberCategorySchema = z.enum(['ADULT', 'FAMILY', 'MINOR']);
export const MemberStatusSchema = z.enum(['ACTIVE', 'INACTIVE']);

export const MemberFormSchema = z.object({
  dni: z.string().min(1, 'El DNI es obligatorio'),
  firstName: z.string().min(1, 'El nombre es obligatorio'),
  lastName: z.string().min(1, 'El apellido es obligatorio'),
  email: z.string().email('El email no es válido').optional().or(z.literal('')),
  phone: z.string().optional(),
  category: MemberCategorySchema.default('ADULT'),
  notes: z.string().optional(),
});

export const CreateMemberSchema = MemberFormSchema.extend({
  status: MemberStatusSchema.default('ACTIVE'),
});

export const UpdateMemberSchema = CreateMemberSchema.partial();

export const MemberImportRowSchema = CreateMemberSchema;

export type MemberFormInput = z.infer<typeof MemberFormSchema>;
export type CreateMemberInput = z.infer<typeof CreateMemberSchema>;
export type UpdateMemberInput = z.infer<typeof UpdateMemberSchema>;
export type MemberImportRowInput = z.infer<typeof MemberImportRowSchema>;

export interface MemberListItem {
  id: string;
  dni: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  category: string;
  status: string;
  joinDate: string;
  notes: string | null;
}

export interface MemberListResponse {
  data: MemberListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface MemberImportResult {
  imported: number;
  errors: { row: number; message: string }[];
}
