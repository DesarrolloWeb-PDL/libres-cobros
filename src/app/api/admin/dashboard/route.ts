import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.role || session.user.role !== 'ADMIN') {
      return apiError('Unauthorized', 401);
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [
      totalSocios,
      cuotasPendientes,
      cuotasVencidas,
      pagosMes,
      comisionesMes,
    ] = await Promise.all([
      prisma.member.count(),
      prisma.fee.count({ where: { status: 'PENDING' } }),
      prisma.fee.count({ where: { status: 'OVERDUE' } }),
      prisma.payment.count({
        where: {
          status: 'PAID',
          confirmedAt: {
            gte: startOfMonth,
            lt: endOfMonth,
          },
        },
      }),
      prisma.commission.count({
        where: {
          createdAt: {
            gte: startOfMonth,
            lt: endOfMonth,
          },
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
    return apiDbError(error, 'Failed to load dashboard metrics');
  }
}
