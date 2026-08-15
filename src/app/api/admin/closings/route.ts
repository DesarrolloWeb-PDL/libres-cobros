import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { requireClub, clubWhere, AuthError } from '@/lib/access';

const CreateClosingSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
});

function serializeClosing(closing: {
  id: string;
  month: number;
  year: number;
  status: string;
  totalPayments: number;
  totalCommissions: number;
  commissionRate: number;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...closing,
    closedAt: closing.closedAt?.toISOString() ?? null,
    createdAt: closing.createdAt.toISOString(),
    updatedAt: closing.updatedAt.toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireClub(request);

    const closings = await prisma.monthlyClosing.findMany({
      where: clubWhere(ctx.clubId),
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    return apiSuccess({ data: closings.map(serializeClosing) });
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }
    return apiDbError(error, 'Error al listar los cierres');
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireClub(request);

    if (!ctx.clubId) {
      return apiError(
        'Seleccione un club',
        400,
        'Se requiere un club para crear el cierre',
        'CLUB_REQUIRED'
      );
    }

    const body = await request.json();
    const parsed = CreateClosingSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        'Datos inválidos',
        400,
        parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        'VALIDATION_ERROR'
      );
    }

    const { month, year } = parsed.data;

    const existing = await prisma.monthlyClosing.findUnique({
      where: { clubId_month_year: { clubId: ctx.clubId, month, year } },
    });

    if (existing) {
      return apiError(
        'Ya existe un cierre para el período seleccionado',
        409,
        'Use el cierre existente para cerrar el período',
        'CLOSING_ALREADY_EXISTS'
      );
    }

    const club = await prisma.club.findUnique({
      where: { id: ctx.clubId },
    });

    if (!club) {
      return apiError('Club no encontrado', 404, 'Club ID inválido', 'CLUB_NOT_FOUND');
    }

    const closing = await prisma.monthlyClosing.create({
      data: {
        clubId: ctx.clubId,
        month,
        year,
        status: 'OPEN',
        commissionRate: club.commissionValue,
      },
    });

    return apiSuccess(serializeClosing(closing));
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }
    return apiDbError(error, 'Error al crear el cierre');
  }
}
