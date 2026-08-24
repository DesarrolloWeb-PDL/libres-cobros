import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { requireClub, clubWhere, AuthError } from '@/lib/access';
import { sendBulkReminders, getConfiguredChannel } from '@/lib/sms';
import { MemberCategorySchema } from '@/types/member';
import { FeeStatusSchema } from '@/types/fee';

const SendBulkSchema = z.object({
  category: MemberCategorySchema.optional(),
  status: FeeStatusSchema.optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  channel: z.enum(['sms', 'whatsapp']).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireClub(request);

    const body = await request.json();
    const parsed = SendBulkSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        'Datos inválidos',
        400,
        parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        'VALIDATION_ERROR'
      );
    }

    const { category, status, month, year } = parsed.data;

    // Detectar canal configurado
    const configuredChannel = ctx.clubId
      ? await getConfiguredChannel(ctx.clubId)
      : parsed.data.channel ?? 'whatsapp';

    const now = new Date();
    const targetMonth = month ?? now.getMonth() + 1;
    const targetYear = year ?? now.getFullYear();

    const members = await prisma.member.findMany({
      where: {
        ...clubWhere(ctx.clubId),
        phone: { not: null },
        ...(category && { category }),
        fees: {
          some: {
            status: status ?? { in: ['PENDING', 'OVERDUE'] },
            month: targetMonth,
            year: targetYear,
          },
        },
      },
      select: { id: true, phone: true },
    });

    const memberIds = members
      .filter((m) => m.phone && m.phone.trim() !== '')
      .map((m) => m.id);

    const result = await sendBulkReminders(memberIds);

    const channelLabel = configuredChannel === 'whatsapp' ? 'WhatsApp' : 'SMS';
    return apiSuccess({
      ...result,
      channel: configuredChannel,
      total: memberIds.length,
      month: targetMonth,
      year: targetYear,
      message: `${channelLabel}: ${result.sent} enviados, ${result.failed} fallidos, ${result.skipped} omitidos`,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }
    return apiDbError(error, 'Error al enviar recordatorios');
  }
}
