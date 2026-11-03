import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { requireInstitution, AuthError } from '@/lib/access';
import { saasPlanUpdateSchema } from '@/types/saas';
import type { SaasPlanListItem } from '@/types/saas';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

function serializePlan(plan: {
  id: string;
  name: string;
  minMembers: number;
  maxMembers: number;
  priceArs: number;
  highlight: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): SaasPlanListItem {
  return {
    ...plan,
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireInstitution(request);

    if (ctx.role !== 'SUPER_ADMIN') {
      return apiError('No autorizado', 403, 'Solo SUPER_ADMIN puede gestionar planes SaaS', 'FORBIDDEN');
    }

    const { id } = await params;

    const plan = await prisma.saasPlan.findUnique({
      where: { id },
    });

    if (!plan) {
      return apiError('Plan no encontrado', 404, 'ID de plan inválido', 'PLAN_NOT_FOUND');
    }

    return apiSuccess(serializePlan(plan));
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }
    return apiDbError(error, 'Error al obtener el plan SaaS');
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireInstitution(request);

    if (ctx.role !== 'SUPER_ADMIN') {
      return apiError('No autorizado', 403, 'Solo SUPER_ADMIN puede editar planes SaaS', 'FORBIDDEN');
    }

    const { id } = await params;

    const existing = await prisma.saasPlan.findUnique({
      where: { id },
    });

    if (!existing) {
      return apiError('Plan no encontrado', 404, 'ID de plan inválido', 'PLAN_NOT_FOUND');
    }

    const body = await request.json();
    const parsed = saasPlanUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        'Datos inválidos',
        400,
        parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        'VALIDATION_ERROR'
      );
    }

    const plan = await prisma.saasPlan.update({
      where: { id },
      data: parsed.data,
    });

    return apiSuccess(serializePlan(plan));
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return apiError(
        'Ya existe un plan con ese nombre',
        409,
        'El nombre del plan debe ser único',
        'DUPLICATE_PLAN_NAME'
      );
    }

    return apiDbError(error, 'Error al actualizar el plan SaaS');
  }
}
