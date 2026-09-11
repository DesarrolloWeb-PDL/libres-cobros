import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { requireInstitution, institutionWhere, AuthError } from '@/lib/access';
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
    const ctx = await requireInstitution(request);

    const configs = await prisma.feeConfig.findMany({
      where: institutionWhere(ctx.institutionId),
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
    const ctx = await requireInstitution(request);

    if (!ctx.institutionId) {
      return apiError(
        'Seleccione una institución',
        400,
        'Se requiere una institución para actualizar las configuraciones',
        'INSTITUTION_REQUIRED'
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
          where: { clubId_category: { clubId: ctx.institutionId!, category: config.category } },
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
