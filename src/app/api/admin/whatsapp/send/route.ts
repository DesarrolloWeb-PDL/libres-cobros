import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { authOptions } from '@/lib/auth';
import { sendBulkReminders } from '@/lib/whatsapp';
import { MemberCategorySchema } from '@/types/member';
import { FeeStatusSchema } from '@/types/fee';

const SendBulkSchema = z.object({
  category: MemberCategorySchema.optional(),
  status: FeeStatusSchema.optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.role || session.user.role !== 'ADMIN') {
      return apiError('No autorizado', 401);
    }

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

    const now = new Date();
    const targetMonth = month ?? now.getMonth() + 1;
    const targetYear = year ?? now.getFullYear();

    const members = await prisma.member.findMany({
      where: {
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

    return apiSuccess({
      ...result,
      total: memberIds.length,
      month: targetMonth,
      year: targetYear,
    });
  } catch (error) {
    return apiDbError(error, 'Error al enviar recordatorios');
  }
}
