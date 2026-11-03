import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { requireInstitution, AuthError } from '@/lib/access';
import type { SaasSubscriptionListItem, SaasSubscriptionListResponse } from '@/types/saas';

export const dynamic = 'force-dynamic';

function serializeSubscription(subscription: {
  id: string;
  institutionId: string;
  institution: { id: string; name: string };
  saasPlanId: string;
  saasPlan: { id: string; name: string; priceArs: number; maxMembers: number };
  pendingSaasPlanId: string | null;
  pendingSaasPlan: { id: string; name: string } | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): SaasSubscriptionListItem {
  return {
    ...subscription,
    createdAt: subscription.createdAt.toISOString(),
    updatedAt: subscription.updatedAt.toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireInstitution(request);

    if (ctx.role !== 'SUPER_ADMIN') {
      return apiError('No autorizado', 403, 'Solo SUPER_ADMIN puede ver suscripciones SaaS', 'FORBIDDEN');
    }

    const statusFilter = request.nextUrl.searchParams.get('status');

    const subscriptions = await prisma.saasSubscription.findMany({
      where: statusFilter ? { status: statusFilter } : undefined,
      include: {
        institution: { select: { id: true, name: true } },
        saasPlan: { select: { id: true, name: true, priceArs: true, maxMembers: true } },
        pendingSaasPlan: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const response: SaasSubscriptionListResponse = {
      data: subscriptions.map(serializeSubscription),
    };

    return apiSuccess(response);
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }
    return apiDbError(error, 'Error al listar las suscripciones SaaS');
  }
}
