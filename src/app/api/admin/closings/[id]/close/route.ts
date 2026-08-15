import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { requireClub, AuthError } from '@/lib/access';

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
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireClub(request);

    const { id } = await params;

    const result = await prisma.$transaction<CloseTransactionResult>(async (tx) => {
      const closing = await tx.monthlyClosing.findUnique({
        where: { id },
        include: { club: true },
      });

      if (!closing) {
        return { success: false, error: 'Cierre no encontrado', status: 404 };
      }

      // Scope check: the closing must belong to the caller's club.
      if (ctx.clubId && closing.clubId !== ctx.clubId) {
        return { success: false, error: 'Cierre no encontrado', status: 404 };
      }

      if (closing.status === 'CLOSED') {
        return { success: false, error: 'El período ya fue cerrado', status: 409 };
      }

      const { start, end } = getMonthBounds(closing.month, closing.year);

      if (closing.club.commissionType === 'FIXED') {
        // FIXED clubs charge no per-payment commission; closing generates a
        // single ProviderInvoice for the period (upsert: never duplicated).
        await tx.providerInvoice.upsert({
          where: {
            clubId_month_year: {
              clubId: closing.clubId,
              month: closing.month,
              year: closing.year,
            },
          },
          update: {},
          create: {
            clubId: closing.clubId,
            month: closing.month,
            year: closing.year,
            amount: closing.club.commissionValue,
            status: 'ISSUED',
          },
        });

        const updated = await tx.monthlyClosing.update({
          where: { id },
          data: {
            status: 'CLOSED',
            totalPayments: 0,
            totalCommissions: 0,
            commissionRate: closing.club.commissionValue,
            closedAt: new Date(),
          },
        });

        return {
          success: true,
          id: updated.id,
          status: updated.status,
          totalPayments: updated.totalPayments,
          totalCommissions: updated.totalCommissions,
          commissionCount: 0,
          commissionRate: updated.commissionRate,
        };
      }

      // PERCENTAGE club: collect this club's unassigned commissions of the
      // period. Other clubs' commissions are excluded via clubId.
      const commissions = await tx.commission.findMany({
        where: {
          clubId: closing.clubId,
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
          : closing.club.commissionValue;

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
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }
    return apiDbError(error, 'Error al cerrar el período');
  }
}
