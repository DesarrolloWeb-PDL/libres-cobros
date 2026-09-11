import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { requireInstitution, AuthError } from '@/lib/access';

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireInstitution(request);

    if (ctx.role === 'SUPER_ADMIN') {
      return apiError('No autorizado', 403, 'Super admin no tiene institución propia', 'FORBIDDEN');
    }

    if (!ctx.institutionId) {
      return apiError('No autorizado', 403, 'Admin no tiene institución asignada', 'FORBIDDEN');
    }

    const institution = await prisma.club.findUnique({
      where: { id: ctx.institutionId },
    });

    if (!institution) {
      return apiError('Institución no encontrada', 404, 'ID de institución inválido', 'INSTITUTION_NOT_FOUND');
    }

    return apiSuccess({
      ...institution,
      createdAt: institution.createdAt.toISOString(),
      updatedAt: institution.updatedAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }
    return apiDbError(error, 'Error al obtener la institución');
  }
}
