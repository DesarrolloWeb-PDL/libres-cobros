import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { authOptions } from '@/lib/auth';
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

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.role || session.user.role !== 'ADMIN') {
      return apiError('No autorizado', 401);
    }

    const configs = await prisma.feeConfig.findMany({
      orderBy: { category: 'asc' },
    });

    const response: FeeConfigListResponse = {
      data: configs.map(serializeConfig),
    };

    return apiSuccess(response);
  } catch (error) {
    return apiDbError(error, 'Error al listar las configuraciones de cuotas');
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.role || session.user.role !== 'ADMIN') {
      return apiError('No autorizado', 401);
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
          where: { category: config.category },
          data: { amount: config.amount },
        })
      )
    );

    const response: FeeConfigListResponse = {
      data: updated.map(serializeConfig),
    };

    return apiSuccess(response);
  } catch (error) {
    return apiDbError(error, 'Error al actualizar las configuraciones de cuotas');
  }
}
