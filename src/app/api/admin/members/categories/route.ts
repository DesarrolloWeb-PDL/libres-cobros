import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { requireInstitution, institutionWhere, AuthError } from '@/lib/access';

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireInstitution(request);

    const rows = await prisma.member.groupBy({
      by: ['category'],
      where: institutionWhere(ctx.institutionId),
      orderBy: { category: 'asc' },
    });

    const categories = rows.map((row) => row.category);
    return apiSuccess({ data: categories });
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }
    return apiDbError(error, 'Error al cargar las categorías de socios');
  }
}
