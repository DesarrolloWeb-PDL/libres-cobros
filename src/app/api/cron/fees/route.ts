import { NextRequest } from 'next/server';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { generateMonthlyFees } from '@/lib/fees';
import { GenerateFeesSchema } from '@/types/fee';

function authorizeCron(request: NextRequest): boolean {
  const cronSecret = request.headers.get('x-cron-secret');
  return cronSecret === process.env.CRON_SECRET;
}

function getCurrentPeriod(): { month: number; year: number } {
  const now = new Date();
  return { month: now.getUTCMonth() + 1, year: now.getUTCFullYear() };
}

export async function GET(request: NextRequest) {
  try {
    if (!authorizeCron(request)) {
      return apiError('No autorizado', 401);
    }

    const { month, year } = getCurrentPeriod();
    const result = await generateMonthlyFees(month, year);

    return apiSuccess(result);
  } catch (error) {
    return apiDbError(error, 'Error al generar las cuotas mensuales');
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!authorizeCron(request)) {
      return apiError('No autorizado', 401);
    }

    const body = await request.json().catch(() => ({}));
    const parsed = GenerateFeesSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        'Datos inválidos',
        400,
        parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        'VALIDATION_ERROR'
      );
    }

    const { month, year } = parsed.data;
    const result = await generateMonthlyFees(month, year);

    return apiSuccess(result);
  } catch (error) {
    return apiDbError(error, 'Error al generar las cuotas mensuales');
  }
}
