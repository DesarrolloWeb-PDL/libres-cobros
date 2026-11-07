import { NextRequest } from 'next/server';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { requireInstitution, AuthError } from '@/lib/access';
import { generateMorosidadReport } from '@/lib/reports';

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireInstitution(request);

    const { searchParams } = request.nextUrl;

    const report = await generateMorosidadReport({
      clubId: ctx.institutionId,
      month: searchParams.get('month') ? Number(searchParams.get('month')) : undefined,
      year: searchParams.get('year') ? Number(searchParams.get('year')) : undefined,
      category: searchParams.get('category') ?? undefined,
      page: searchParams.get('page') ? Number(searchParams.get('page')) : undefined,
      limit: searchParams.get('limit') ? Number(searchParams.get('limit')) : undefined,
    });

    return apiSuccess(report);
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }
    return apiDbError(error, 'Error al generar el reporte de morosidad');
  }
}