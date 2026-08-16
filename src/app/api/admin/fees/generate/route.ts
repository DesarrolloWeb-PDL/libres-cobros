import { NextRequest } from 'next/server';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { requireClub, AuthError } from '@/lib/access';
import { generateMonthlyFees } from '@/lib/fees';
import { GenerateFeesSchema } from '@/types/fee';

export async function POST(request: NextRequest) {
  try {
    const { clubId } = await requireClub(request);

    if (!clubId) {
      return apiError('Seleccione un club para generar cuotas', 400);
    }

    const body = await request.json();
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
    const result = await generateMonthlyFees(clubId, month, year);

    return apiSuccess(result);
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }
    return apiDbError(error, 'Error al generar las cuotas');
  }
}
