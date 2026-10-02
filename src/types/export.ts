import { z } from 'zod';
import { EXPORT_TABLES } from '@/lib/export';

export const ExportQuerySchema = z.object({
  tables: z
    .string()
    .min(1)
    .transform((value) => value.split(',').map((item) => item.trim()))
    .refine(
      (items) => items.every((item) => EXPORT_TABLES.includes(item as typeof EXPORT_TABLES[number])),
      { message: 'Una o más tablas no son válidas' }
    )
    .transform((items) => items as typeof EXPORT_TABLES[number][]),
  format: z.enum(['csv', 'json']).default('json'),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type ExportQueryInput = z.infer<typeof ExportQuerySchema>;

export interface ExportDataResponse {
  tables: Record<string, Record<string, unknown>[]>;
  exportedAt: string;
}
