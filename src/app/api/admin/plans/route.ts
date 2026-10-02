import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { requireInstitution, institutionWhere, AuthError } from '@/lib/access';
import { UpdatePlansSchema } from '@/types/fee';
import type { PlanListItem, PlanListResponse } from '@/types/fee';
import { Prisma } from '@prisma/client';

function serializePlan(plan: {
  id: string;
  name: string;
  amount: number;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): PlanListItem {
  return {
    ...plan,
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireInstitution(request);

    const plans = await prisma.plan.findMany({
      where: institutionWhere(ctx.institutionId),
      orderBy: { name: 'asc' },
    });

    const response: PlanListResponse = {
      data: plans.map(serializePlan),
    };

    return apiSuccess(response);
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }
    return apiDbError(error, 'Error al listar los planes');
  }
}

export async function PUT(request: NextRequest) {
  try {
    const ctx = await requireInstitution(request);

    if (!ctx.institutionId) {
      return apiError(
        'Seleccione una institución',
        400,
        'Se requiere una institución para actualizar los planes',
        'INSTITUTION_REQUIRED'
      );
    }

    const body = await request.json();
    const parsed = UpdatePlansSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        'Datos inválidos',
        400,
        parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        'VALIDATION_ERROR'
      );
    }

    const { plans, deletedIds } = parsed.data;

    const updateIds = plans.filter((p) => p.id).map((p) => p.id!);
    if (updateIds.length > 0) {
      const existingCount = await prisma.plan.count({
        where: { id: { in: updateIds }, clubId: ctx.institutionId! },
      });
      if (existingCount !== updateIds.length) {
        return apiError('Plan no encontrado', 404, 'Uno o más planes no existen', 'PLAN_NOT_FOUND');
      }
    }

    await prisma.$transaction(async (tx) => {
      if (deletedIds.length > 0) {
        await tx.plan.deleteMany({
          where: { id: { in: deletedIds }, clubId: ctx.institutionId! },
        });
      }

      for (const plan of plans) {
        const data = {
          name: plan.name,
          amount: plan.amount,
          description: plan.description ?? null,
          isActive: plan.isActive,
        };

        if (plan.id) {
          await tx.plan.update({
            where: { id: plan.id },
            data,
          });
        } else {
          await tx.plan.create({
            data: { ...data, clubId: ctx.institutionId! },
          });
        }
      }
    });

    const updated = await prisma.plan.findMany({
      where: institutionWhere(ctx.institutionId),
      orderBy: { name: 'asc' },
    });

    const response: PlanListResponse = {
      data: updated.map(serializePlan),
    };

    return apiSuccess(response);
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return apiError(
          'Ya existe un plan con ese nombre',
          409,
          'El nombre del plan debe ser único por institución',
          'DUPLICATE_PLAN_NAME'
        );
      }
      if (error.code === 'P2003' || error.code === 'P2014') {
        return apiError(
          'No se puede eliminar el plan porque tiene socios o cuotas asociadas',
          409,
          'Eliminá o reasigná las dependencias primero',
          'PLAN_HAS_DEPENDENCIES'
        );
      }
    }

    return apiDbError(error, 'Error al actualizar los planes');
  }
}
