import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { requireClub, AuthError } from '@/lib/access';

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireClub(request);

    if (ctx.role === 'SUPER_ADMIN') {
      return apiError('No autorizado', 403, 'Super admin no tiene club propio', 'FORBIDDEN');
    }

    if (!ctx.clubId) {
      return apiError('No autorizado', 403, 'Admin no tiene club asignado', 'FORBIDDEN');
    }

    const club = await prisma.club.findUnique({
      where: { id: ctx.clubId },
    });

    if (!club) {
      return apiError('Club no encontrado', 404, 'Club ID inválido', 'CLUB_NOT_FOUND');
    }

    return apiSuccess({
      ...club,
      createdAt: club.createdAt.toISOString(),
      updatedAt: club.updatedAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }
    return apiDbError(error, 'Error al obtener el club');
  }
}
