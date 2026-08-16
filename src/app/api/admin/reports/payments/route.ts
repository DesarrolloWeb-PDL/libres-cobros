import { NextRequest } from 'next/server';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { requireClub, AuthError } from '@/lib/access';
import { generatePaymentReport } from '@/lib/reports';
import { PaymentReportQuerySchema } from '@/types/report';

export async function GET(request: NextRequest) {
  try {
    await requireClub(request);

    const { searchParams } = request.nextUrl;

    const parsed = PaymentReportQuerySchema.safeParse({
      memberId: searchParams.get('memberId') ?? undefined,
      method: searchParams.get('method') ?? undefined,
      from: searchParams.get('from') ?? undefined,
      to: searchParams.get('to') ?? undefined,
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

    const { memberId, method, from, to, page, limit } = parsed.data;

    const report = await generatePaymentReport({
      memberId,
      method,
      from,
      to,
      page,
      limit,
    });

    return apiSuccess(report);
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }
    return apiDbError(error, 'Error al generar el reporte de pagos');
  }
}