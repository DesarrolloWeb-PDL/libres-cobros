import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { authOptions } from '@/lib/auth';
import { generateMonthlyFees } from '@/lib/fees';
import { GenerateFeesSchema } from '@/types/fee';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.role || session.user.role !== 'ADMIN') {
      return apiError('No autorizado', 401);
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
    const result = await generateMonthlyFees(month, year);

    return apiSuccess(result);
  } catch (error) {
    return apiDbError(error, 'Error al generar las cuotas');
  }
}
