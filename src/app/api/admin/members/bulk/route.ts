import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { requireInstitution, institutionWhere, AuthError } from '@/lib/access';

const BulkMemberActionSchema = z.object({
  memberIds: z.array(z.string().cuid()).min(1, 'Seleccioná al menos un socio'),
  action: z.enum(['activate', 'deactivate']),
});

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireInstitution(request);
    const body = await request.json();
    const parsed = BulkMemberActionSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('Datos inválidos', 400, parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '), 'VALIDATION_ERROR');
    }

    const { memberIds, action } = parsed.data;
    const status = action === 'activate' ? 'ACTIVE' : 'INACTIVE';

    const result = await prisma.member.updateMany({
      where: { id: { in: memberIds }, ...institutionWhere(ctx.institutionId) },
      data: { status },
    });

    return apiSuccess({ updated: result.count, status });
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }
    return apiDbError(error, 'Error al actualizar los socios');
  }
}

export async function PATCH(request: NextRequest) {
  return POST(request);
}