import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { requireClub, clubWhere, AuthError } from '@/lib/access';

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireClub(request);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const scope = clubWhere(ctx.clubId);

    const [
      totalSocios,
      cuotasPendientes,
      cuotasVencidas,
      pagosMes,
      comisionesMes,
    ] = await Promise.all([
      prisma.member.count({ where: scope }),
      prisma.fee.count({ where: { status: 'PENDING', ...scope } }),
      prisma.fee.count({ where: { status: 'OVERDUE', ...scope } }),
      prisma.payment.count({
        where: {
          status: 'PAID',
          confirmedAt: {
            gte: startOfMonth,
            lt: endOfMonth,
          },
          ...scope,
        },
      }),
      prisma.commission.count({
        where: {
          createdAt: {
            gte: startOfMonth,
            lt: endOfMonth,
          },
          ...scope,
        },
      }),
    ]);

    return apiSuccess({
      totalSocios,
      cuotasPendientes,
      cuotasVencidas,
      pagosMes,
      comisionesMes,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }
    return apiDbError(error, 'Failed to load dashboard metrics');
  }
}
