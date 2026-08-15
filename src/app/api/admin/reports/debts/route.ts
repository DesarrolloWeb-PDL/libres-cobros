import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { authOptions } from '@/lib/auth';
import { generateDebtReport } from '@/lib/reports';
import { DebtReportQuerySchema } from '@/types/report';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.role || session.user.role !== 'ADMIN') {
      return apiError('No autorizado', 401);
    }

    const { searchParams } = request.nextUrl;

    const parsed = DebtReportQuerySchema.safeParse({
      month: searchParams.get('month') ?? undefined,
      year: searchParams.get('year') ?? undefined,
      category: searchParams.get('category') ?? undefined,
      page: searchParams.get('page') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    });

    if (!parsed.success) {
      return apiError(
        'Parámetros inválidos',
        400,
        parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        'VALIDATION_ERROR'
      );
    }

    const { month, year, category, page, limit } = parsed.data;

    const report = await generateDebtReport({ month, year, category, page, limit });

    return apiSuccess(report);
  } catch (error) {
    return apiDbError(error, 'Error al generar el reporte de deudas');
  }
}
