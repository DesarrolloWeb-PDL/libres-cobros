import { NextRequest } from 'next/server';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { requireClub, AuthError } from '@/lib/access';
import { generateCommissionReport } from '@/lib/reports';
import { CommissionReportQuerySchema } from '@/types/report';

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireClub(request);

    const { searchParams } = request.nextUrl;

    const parsed = CommissionReportQuerySchema.safeParse({
      month: searchParams.get('month') ?? undefined,
      year: searchParams.get('year') ?? undefined,
      periodId: searchParams.get('periodId') ?? undefined,
      unassigned: searchParams.get('unassigned') ?? undefined,
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

    const { month, year, periodId, unassigned, page, limit } = parsed.data;

    const report = await generateCommissionReport({
      clubId: ctx.clubId,
      month,
      year,
      periodId,
      unassigned,
      page,
      limit,
    });

    return apiSuccess(report);
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }
    return apiDbError(error, 'Error al listar las comisiones');
  }
}