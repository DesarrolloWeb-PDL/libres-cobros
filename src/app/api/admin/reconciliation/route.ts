import { NextRequest } from 'next/server';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { requireInstitution, AuthError } from '@/lib/access';
import { reconcileBankFeed, listUnidentifiedPayments } from '@/lib/reconciliation';

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireInstitution(request);
    if (!ctx.institutionId) {
      return apiError('Se requiere institución', 400, 'Institution required', 'INSTITUTION_REQUIRED');
    }
    const unidentified = await listUnidentifiedPayments(ctx.institutionId);
    return apiSuccess({ data: unidentified });
  } catch (error) {
    if (error instanceof AuthError) return apiError(error.message, error.status);
    return apiDbError(error, 'Error al listar pagos no identificados');
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireInstitution(request);
    if (!ctx.institutionId) {
      return apiError('Se requiere institución', 400, 'Institution required', 'INSTITUTION_REQUIRED');
    }
    const body = await request.json().catch(() => ({}));
    const entries = Array.isArray(body?.entries) ? body.entries : [];
    const result = await reconcileBankFeed(ctx.institutionId, entries);
    return apiSuccess(result);
  } catch (error) {
    if (error instanceof AuthError) return apiError(error.message, error.status);
    return apiDbError(error, 'Error al conciliar pagos');
  }
}
