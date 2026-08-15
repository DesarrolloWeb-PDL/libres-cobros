import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';

function getTodayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function authorizeCron(request: NextRequest): boolean {
  const cronSecret = request.headers.get('x-cron-secret');
  return cronSecret === process.env.CRON_SECRET;
}

export async function GET(request: NextRequest) {
  try {
    if (!authorizeCron(request)) {
      return apiError('No autorizado', 401);
    }

    const today = getTodayUtc();

    const result = await prisma.fee.updateMany({
      where: {
        status: 'PENDING',
        dueDate: { lt: today },
      },
      data: { status: 'OVERDUE' },
    });

    return apiSuccess({ updated: result.count });
  } catch (error) {
    return apiDbError(error, 'Error al marcar cuotas vencidas');
  }
}
