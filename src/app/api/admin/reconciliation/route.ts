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

    const { searchParams } = request.nextUrl;
    const method = searchParams.get('method') ?? undefined;
    const status = searchParams.get('status') ?? undefined;
    const from = searchParams.get('from') ?? undefined;
    const to = searchParams.get('to') ?? undefined;
    const search = searchParams.get('search') ?? searchParams.get('member') ?? undefined;

    let unidentified = await listUnidentifiedPayments(ctx.institutionId);

    if (method) {
      unidentified = unidentified.filter((p) => p.method === method);
    }
    if (status) {
      unidentified = unidentified.filter((p) => p.status === status);
    }
    if (from) {
      const fromDate = new Date(from);
      unidentified = unidentified.filter((p) => new Date(p.createdAt) >= fromDate);
    }
    if (to) {
      const toDate = new Date(to);
      unidentified = unidentified.filter((p) => new Date(p.createdAt) <= toDate);
    }
    if (search) {
      const term = search.toLowerCase();
      unidentified = unidentified.filter((p) => {
        // listUnidentifiedPayments returns rows without member relation by default;
        // fall back to bankTransferRef matching when member data is absent.
        const ref = (p.bankTransferRef ?? '').toLowerCase();
        return ref.includes(term);
      });
    }

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
