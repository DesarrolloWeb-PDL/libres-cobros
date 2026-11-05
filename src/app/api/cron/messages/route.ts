import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import {
  processScheduledMassMessages,
} from '@/lib/mass-message';

function authorizeCron(request: NextRequest): boolean {
  const cronSecret = request.headers.get('x-cron-secret');
  return cronSecret === process.env.CRON_SECRET;
}

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    if (!authorizeCron(request)) {
      return apiError('No autorizado', 401);
    }

    const now = new Date();
    const result = await processScheduledMassMessages(prisma, now);
    return apiSuccess(result);
  } catch (error) {
    return apiDbError(error, 'Error al procesar mensajes programados');
  }
}