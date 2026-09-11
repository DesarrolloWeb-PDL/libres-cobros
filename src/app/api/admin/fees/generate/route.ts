import { NextRequest } from 'next/server';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { requireInstitution, AuthError } from '@/lib/access';
import { generateMonthlyFees } from '@/lib/fees';
import { GenerateFeesSchema } from '@/types/fee';

export async function POST(request: NextRequest) {
  try {
    const { institutionId } = await requireInstitution(request);

    if (!institutionId) {
      return apiError('Seleccione una institución para generar cuotas', 400);
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
    const result = await generateMonthlyFees(institutionId, month, year);

    return apiSuccess(result);
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }
    return apiDbError(error, 'Error al generar las cuotas');
  }
}
