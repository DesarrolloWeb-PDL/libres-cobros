import { z } from 'zod';

export const MassMessageSegmentSchema = z.enum([
  'all',
  'up_to_date',
  'debt',
  'overdue',
]);

export const MassMessageChannelSchema = z.enum(['whatsapp', 'email']);

export const MassMessageFiltersSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  planId: z.string().cuid().optional(),
  search: z.string().optional(),
  segment: MassMessageSegmentSchema.optional().default('all'),
  category: z.string().optional(),
  memberIds: z.array(z.string()).optional(),
  channels: z.array(MassMessageChannelSchema).optional(),
  channel: MassMessageChannelSchema.optional(),
});

export const SendMassMessageByIdsSchema = z.object({
  memberIds: z.array(z.string().cuid()).min(1, 'Seleccioná al menos un socio'),
  message: z.string().min(1, 'El mensaje es obligatorio'),
  channels: z.array(MassMessageChannelSchema).optional(),
  channel: MassMessageChannelSchema.optional(),
});

export const SendMassMessageByFiltersSchema = z.object({
  filters: MassMessageFiltersSchema,
  message: z.string().min(1, 'El mensaje es obligatorio'),
  scheduledAt: z.string().optional(),
  channels: z.array(MassMessageChannelSchema).optional(),
  channel: MassMessageChannelSchema.optional(),
});

export const SendMassMessageSchema = z.union([
  SendMassMessageByIdsSchema,
  SendMassMessageByFiltersSchema,
]);

export type MassMessageSegment = z.infer<typeof MassMessageSegmentSchema>;
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
  status: 'SENT' | 'PARTIAL' | 'FAILED' | 'SCHEDULED' | 'PROCESSING';
  segment?: string;
  category?: string | null;
  scheduledAt?: string | null;
}

export interface MassMessageHistoryResponse {
  data: MassMessageHistoryItem[];
}

export interface SendMassMessageResponse {
  sent: number;
  failed: number;
  scheduled?: boolean;
  campaignId?: string;
  scheduledAt?: string;
}
