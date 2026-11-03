import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { requireInstitution, AuthError } from '@/lib/access';
import { saasPlanChangeRequestSchema } from '@/types/saas';
import type { SaasPlanChangeRequestListItem } from '@/types/saas';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

function serializeRequest(request: {
  id: string;
  institutionId: string;
  institution: { id: string; name: string };
  requestedSaasPlanId: string;
  requestedSaasPlan: { id: string; name: string; priceArs: number; maxMembers: number };
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): SaasPlanChangeRequestListItem {
  return {
    ...request,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireInstitution(request);
    const { id } = await params;

    if (ctx.role === 'ADMIN' && ctx.institutionId !== id) {
      return apiError('No autorizado', 403, 'Solo podés solicitar cambios para tu institución', 'FORBIDDEN');
    }

    if (ctx.role !== 'SUPER_ADMIN' && ctx.role !== 'ADMIN') {
      return apiError('No autorizado', 403, 'Rol no permitido', 'FORBIDDEN');
    }

    const body = await request.json();
    const parsed = saasPlanChangeRequestSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        'Datos inválidos',
        400,
        parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        'VALIDATION_ERROR'
      );
    }

    const institution = await prisma.club.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!institution) {
      return apiError('Institución no encontrada', 404, 'ID de institución inválido', 'INSTITUTION_NOT_FOUND');
    }

    const requestedPlan = await prisma.saasPlan.findUnique({
      where: { id: parsed.data.requestedSaasPlanId },
    });

    if (!requestedPlan || !requestedPlan.isActive) {
      return apiError('Plan no encontrado', 404, 'El plan solicitado no existe o está inactivo', 'PLAN_NOT_FOUND');
    }

    const existingPending = await prisma.saasPlanChangeRequest.findFirst({
      where: { institutionId: id, status: 'PENDING' },
    });

    if (existingPending) {
      return apiError(
        'Ya existe una solicitud pendiente',
        409,
        'Esperá la resolución antes de solicitar otro cambio',
        'PENDING_REQUEST_EXISTS'
      );
    }

    const created = await prisma.saasPlanChangeRequest.create({
      data: {
        institutionId: id,
        requestedSaasPlanId: parsed.data.requestedSaasPlanId,
        status: 'PENDING',
      },
      include: {
        institution: { select: { id: true, name: true } },
        requestedSaasPlan: { select: { id: true, name: true, priceArs: true, maxMembers: true } },
      },
    });

    return apiSuccess(serializeRequest(created));
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return apiError(
        'Solicitud duplicada',
        409,
        'Ya existe una solicitud para ese plan',
        'DUPLICATE_REQUEST'
      );
    }

    return apiDbError(error, 'Error al crear la solicitud de cambio');
  }
}
