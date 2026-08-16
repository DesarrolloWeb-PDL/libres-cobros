import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { requireClub, clubWhere, AuthError } from '@/lib/access';
import { UpdateFeeConfigsSchema } from '@/types/fee';
import type { FeeConfigListItem, FeeConfigListResponse } from '@/types/fee';

function serializeConfig(config: {
  id: string;
  category: string;
  amount: number;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): FeeConfigListItem {
  return {
    ...config,
    createdAt: config.createdAt.toISOString(),
    updatedAt: config.updatedAt.toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireClub(request);

    const configs = await prisma.feeConfig.findMany({
      where: clubWhere(ctx.clubId),
      orderBy: { category: 'asc' },
    });

    const response: FeeConfigListResponse = {
      data: configs.map(serializeConfig),
    };

    return apiSuccess(response);
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }
    return apiDbError(error, 'Error al listar las configuraciones de cuotas');
  }
}

export async function PUT(request: NextRequest) {
  try {
    const ctx = await requireClub(request);

    if (!ctx.clubId) {
      return apiError(
        'Seleccione un club',
        400,
        'Se requiere un club para actualizar las configuraciones',
        'CLUB_REQUIRED'
      );
    }

    const body = await request.json();
    const parsed = UpdateFeeConfigsSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        'Datos inválidos',
        400,
        parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        'VALIDATION_ERROR'
      );
    }

    const { configs } = parsed.data;

    const updated = await prisma.$transaction(
      configs.map((config) =>
        prisma.feeConfig.update({
          where: { clubId_category: { clubId: ctx.clubId!, category: config.category } },
          data: { amount: config.amount },
        })
      )
    );

    const response: FeeConfigListResponse = {
      data: updated.map(serializeConfig),
    };

    return apiSuccess(response);
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }
    return apiDbError(error, 'Error al actualizar las configuraciones de cuotas');
  }
}
