import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { requireInstitution, institutionWhere, AuthError } from '@/lib/access';

function serializeMember(member: {
  id: string;
  dni: string;
  cuit: string | null;
  ivaCondicion: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  category: string;
  planId: string | null;
  status: string;
  joinDate: Date;
  notes: string | null;
  plan?: { name: string } | null;
}) {
  return {
    ...member,
    planName: member.plan?.name ?? null,
    joinDate: member.joinDate.toISOString(),
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireInstitution(request);
    const { id } = await params;

    const existing = await prisma.member.findFirst({
      where: { id, ...institutionWhere(ctx.institutionId) },
      include: { plan: { select: { name: true } } },
    });

    if (!existing) {
      return apiError('Socio no encontrado', 404);
    }

    if (existing.status === 'ACTIVE') {
      return apiSuccess(serializeMember(existing));
    }

    if (existing.status !== 'PENDING') {
      return apiError(
        'El socio no está pendiente de aprobación',
        409,
        'Solo se pueden aprobar socios pendientes',
        'MEMBER_NOT_PENDING'
      );
    }

    const member = await prisma.member.update({
      where: { id },
      data: { status: 'ACTIVE' },
      include: { plan: { select: { name: true } } },
    });

    return apiSuccess(serializeMember(member));
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }
    return apiDbError(error, 'Error al aprobar el socio');
  }
}