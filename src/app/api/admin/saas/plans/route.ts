import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { requireInstitution, AuthError } from '@/lib/access';
import { saasPlanSchema } from '@/types/saas';
import type { SaasPlanListItem, SaasPlanListResponse } from '@/types/saas';
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

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireInstitution(request);

    if (ctx.role !== 'SUPER_ADMIN') {
      return apiError('No autorizado', 403, 'Solo SUPER_ADMIN puede gestionar planes SaaS', 'FORBIDDEN');
    }

    const activeOnly = request.nextUrl.searchParams.get('active') === 'true';

    const plans = await prisma.saasPlan.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: [{ minMembers: 'asc' }, { maxMembers: 'asc' }],
    });

    const response: SaasPlanListResponse = {
      data: plans.map(serializePlan),
    };

    return apiSuccess(response);
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }
    return apiDbError(error, 'Error al listar los planes SaaS');
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireInstitution(request);

    if (ctx.role !== 'SUPER_ADMIN') {
      return apiError('No autorizado', 403, 'Solo SUPER_ADMIN puede crear planes SaaS', 'FORBIDDEN');
    }

    const body = await request.json();
    const parsed = saasPlanSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        'Datos inválidos',
        400,
        parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        'VALIDATION_ERROR'
      );
    }

    const plan = await prisma.saasPlan.create({
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

    return apiDbError(error, 'Error al crear el plan SaaS');
  }
}
