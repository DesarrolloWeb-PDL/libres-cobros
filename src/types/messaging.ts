import { z } from 'zod';

export const MassMessageFiltersSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  planId: z.string().cuid().optional(),
  search: z.string().optional(),
});

export const SendMassMessageByIdsSchema = z.object({
  memberIds: z.array(z.string().cuid()).min(1, 'Seleccioná al menos un socio'),
  message: z.string().min(1, 'El mensaje es obligatorio'),
});

export const SendMassMessageByFiltersSchema = z.object({
  filters: MassMessageFiltersSchema,
  message: z.string().min(1, 'El mensaje es obligatorio'),
});

export const SendMassMessageSchema = z.union([
  SendMassMessageByIdsSchema,
  SendMassMessageByFiltersSchema,
]);

export type MassMessageFilters = z.infer<typeof MassMessageFiltersSchema>;
export type SendMassMessageInput = z.infer<typeof SendMassMessageSchema>;

export interface MassMessageHistoryItem {
  id: string;
  message: string;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  sentAt: string;
  status: 'SENT' | 'PARTIAL' | 'FAILED';
}

export interface MassMessageHistoryResponse {
  data: MassMessageHistoryItem[];
}

export interface SendMassMessageResponse {
  sent: number;
  failed: number;
}
