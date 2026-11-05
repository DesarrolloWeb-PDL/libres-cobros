import { NextRequest } from 'next/server';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { requireInstitution, AuthError } from '@/lib/access';
import { MassMessageFiltersSchema } from '@/types/messaging';
import { countMassMessageRecipients } from '@/lib/mass-message';

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireInstitution(request);

    if (!ctx.institutionId) {
      return apiError(
        'Seleccioná una institución',
        400,
        'Se requiere una institución para contar destinatarios',
        'INSTITUTION_REQUIRED'
      );
    }

    const { searchParams } = request.nextUrl;

    const parsed = MassMessageFiltersSchema.safeParse({
      status: searchParams.get('status') ?? undefined,
      planId: searchParams.get('planId') ?? undefined,
      search: searchParams.get('search') ?? undefined,
      segment: searchParams.get('segment') ?? 'all',
      category: searchParams.get('category') ?? undefined,
    });

    if (!parsed.success) {
      return apiError(
        'Datos inválidos',
        400,
        parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        'VALIDATION_ERROR'
      );
    }

    const total = await countMassMessageRecipients(ctx.institutionId, parsed.data);
    return apiSuccess({ total });
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }
    return apiDbError(error, 'Error al contar destinatarios');
  }
}
