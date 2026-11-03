import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { requireInstitution, AuthError } from '@/lib/access';
import { saasPlanChangeDecisionSchema } from '@/types/saas';
import type { SaasPlanChangeRequestListItem } from '@/types/saas';

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

    if (ctx.role !== 'SUPER_ADMIN') {
      return apiError('No autorizado', 403, 'Solo SUPER_ADMIN puede aprobar solicitudes', 'FORBIDDEN');
    }

    const { id } = await params;

    const body = await request.json();
    const parsed = saasPlanChangeDecisionSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        'Datos inválidos',
        400,
        parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        'VALIDATION_ERROR'
      );
    }

    const { decision } = parsed.data;

    const changeRequest = await prisma.saasPlanChangeRequest.findUnique({
      where: { id },
    });

    if (!changeRequest) {
      return apiError('Solicitud no encontrada', 404, 'ID de solicitud inválido', 'REQUEST_NOT_FOUND');
    }

    if (changeRequest.status !== 'PENDING') {
      return apiError(
        'La solicitud ya fue resuelta',
        409,
        'Solo se pueden resolver solicitudes pendientes',
        'REQUEST_ALREADY_RESOLVED'
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (decision === 'APPROVED') {
        const subscription = await tx.saasSubscription.findUnique({
          where: { institutionId: changeRequest.institutionId },
        });

        if (!subscription) {
          throw new Error('Institution has no active SaaS subscription to update');
        }

        await tx.saasSubscription.update({
          where: { id: subscription.id },
          data: { pendingSaasPlanId: changeRequest.requestedSaasPlanId },
        });

        // Reject any other pending requests for the same institution so only
        // one approved change is in flight at a time.
        await tx.saasPlanChangeRequest.updateMany({
          where: {
            institutionId: changeRequest.institutionId,
            id: { not: id },
            status: 'PENDING',
          },
          data: { status: 'REJECTED' },
        });
      }

      return tx.saasPlanChangeRequest.update({
        where: { id },
        data: { status: decision },
        include: {
          institution: { select: { id: true, name: true } },
          requestedSaasPlan: { select: { id: true, name: true, priceArs: true, maxMembers: true } },
        },
      });
    });

    return apiSuccess(serializeRequest(updated));
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }

    if (error instanceof Error && error.message === 'Institution has no active SaaS subscription to update') {
      return apiError(
        'La institución no tiene una suscripción SaaS',
        409,
        'No se puede aprobar un cambio sin suscripción activa',
        'SUBSCRIPTION_NOT_FOUND'
      );
    }

    return apiDbError(error, 'Error al resolver la solicitud de cambio');
  }
}
