import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { requireInstitution, AuthError } from '@/lib/access';
import type {
  SaasPlanChangeRequestListItem,
  SaasPlanChangeRequestListResponse,
} from '@/types/saas';

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

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireInstitution(request);

    if (ctx.role !== 'SUPER_ADMIN') {
      return apiError('No autorizado', 403, 'Solo SUPER_ADMIN puede ver solicitudes de cambio', 'FORBIDDEN');
    }

    const statusFilter = request.nextUrl.searchParams.get('status');

    const requests = await prisma.saasPlanChangeRequest.findMany({
      where: statusFilter ? { status: statusFilter } : undefined,
      include: {
        institution: { select: { id: true, name: true } },
        requestedSaasPlan: { select: { id: true, name: true, priceArs: true, maxMembers: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const response: SaasPlanChangeRequestListResponse = {
      data: requests.map(serializeRequest),
    };

    return apiSuccess(response);
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }
    return apiDbError(error, 'Error al listar las solicitudes de cambio');
  }
}
