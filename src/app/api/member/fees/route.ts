import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { getEffectiveClub } from '@/lib/access';
import { z } from 'zod';
import type { MemberFeeItem, MemberFeesResponse } from '@/types/fee';

const MemberDniQuerySchema = z.object({
  dni: z.string().min(1, 'El DNI es obligatorio'),
  clubSlug: z.string().min(1, 'El club es obligatorio'),
});

function serializeFee(fee: {
  id: string;
  memberId: string;
  feeConfigId: string;
  feeConfig: { category: string };
  month: number;
  year: number;
  amount: number;
  dueDate: Date;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): MemberFeeItem {
  return {
    ...fee,
    dueDate: fee.dueDate.toISOString(),
    createdAt: fee.createdAt.toISOString(),
    updatedAt: fee.updatedAt.toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const parsed = MemberDniQuerySchema.safeParse({
      dni: searchParams.get('dni') ?? undefined,
      clubSlug: searchParams.get('clubSlug') ?? undefined,
    });

    if (!parsed.success) {
      return apiError(
        'Datos inválidos',
        400,
        parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        'VALIDATION_ERROR'
      );
    }

    const { dni, clubSlug } = parsed.data;

    const club = await getEffectiveClub(clubSlug);
    if (!club) {
      return apiError('Club no encontrado', 404, 'Club slug inválido o inactivo', 'CLUB_NOT_FOUND');
    }

    const member = await prisma.member.findUnique({
      where: { clubId_dni: { clubId: club.id, dni } },
    });

    if (!member) {
      return apiError('Socio no encontrado', 404, 'DNI inválido', 'MEMBER_NOT_FOUND');
    }

    const fees = await prisma.fee.findMany({
      where: { memberId: member.id },
      include: {
        feeConfig: { select: { category: true } },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    const response: MemberFeesResponse = {
      member: {
        id: member.id,
        dni: member.dni,
        firstName: member.firstName,
        lastName: member.lastName,
      },
      fees: fees.map(serializeFee),
    };

    return apiSuccess(response);
  } catch (error) {
    return apiDbError(error, 'Error al obtener las cuotas del socio');
  }
}
