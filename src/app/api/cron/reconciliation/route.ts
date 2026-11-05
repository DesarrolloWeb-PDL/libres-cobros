import { NextRequest } from 'next/server';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { reconcileAllClubs } from '@/lib/reconciliation';

function authorizeCron(request: NextRequest): boolean {
  const cronSecret = request.headers.get('x-cron-secret');
  return cronSecret === process.env.CRON_SECRET;
}

export async function GET(request: NextRequest) {
  try {
    if (!authorizeCron(request)) {
      return apiError('No autorizado', 401);
    }
    const results = await reconcileAllClubs();
    return apiSuccess({ clubs: results });
  } catch (error) {
    return apiDbError(error, 'Error al conciliar pagos');
  }
}
