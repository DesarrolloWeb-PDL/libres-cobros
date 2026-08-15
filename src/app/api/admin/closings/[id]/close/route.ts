import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { authOptions } from '@/lib/auth';
import { getCommissionRate } from '@/lib/commissions';

function getMonthBounds(month: number, year: number) {
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 1, 0, 0, 0, 0);
  return { start, end };
}

type CloseTransactionResult =
  | { success: false; error: string; status: number }
  | {
      success: true;
      id: string;
      status: string;
      totalPayments: number;
      totalCommissions: number;
      commissionCount: number;
      commissionRate: number;
    };

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.role || session.user.role !== 'ADMIN') {
      return apiError('No autorizado', 401);
    }

    const { id } = await params;

    const result = await prisma.$transaction<CloseTransactionResult>(async (tx) => {
      const closing = await tx.monthlyClosing.findUnique({
        where: { id },
      });

      if (!closing) {
        return { success: false, error: 'Cierre no encontrado', status: 404 };
      }

      if (closing.status === 'CLOSED') {
        return { success: false, error: 'El período ya fue cerrado', status: 409 };
      }

      const { start, end } = getMonthBounds(closing.month, closing.year);

      const commissions = await tx.commission.findMany({
        where: {
          periodId: null,
          createdAt: {
            gte: start,
            lt: end,
          },
        },
        include: {
          payment: {
            select: { amount: true },
          },
        },
      });

      const totalCommissions = commissions.reduce((sum, c) => sum + c.amount, 0);
      const totalPayments = commissions.reduce(
        (sum, c) => sum + c.payment.amount,
        0
      );

      const weightedRate =
        totalCommissions > 0
          ? commissions.reduce((sum, c) => sum + c.amount * c.rate, 0) /
            totalCommissions
          : await getCommissionRate(tx);

      if (commissions.length > 0) {
        await tx.commission.updateMany({
          where: {
            id: {
              in: commissions.map((c) => c.id),
            },
          },
          data: {
            periodId: id,
          },
        });
      }

      const updated = await tx.monthlyClosing.update({
        where: { id },
        data: {
          status: 'CLOSED',
          totalPayments,
          totalCommissions,
          commissionRate: weightedRate,
          closedAt: new Date(),
        },
      });

      return {
        success: true,
        id: updated.id,
        status: updated.status,
        totalPayments: updated.totalPayments,
        totalCommissions: updated.totalCommissions,
        commissionCount: commissions.length,
        commissionRate: updated.commissionRate,
      };
    });

    if (!result.success) {
      return apiError(result.error, result.status);
    }

    return apiSuccess(result);
  } catch (error) {
    return apiDbError(error, 'Error al cerrar el período');
  }
}
