import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { getEffectiveClub } from '@/lib/access';
import { z } from 'zod';
import type { MemberPaymentItem, MemberPaymentsResponse } from '@/types/payment';

const MemberDniQuerySchema = z.object({
  dni: z.string().min(1, 'El DNI es obligatorio'),
  clubSlug: z.string().min(1, 'El club es obligatorio'),
});

function serializePayment(payment: {
  id: string;
  feeId: string;
  fee: { month: number; year: number };
  amount: number;
  method: string;
  status: string;
  bankTransferRef: string | null;
  confirmedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): MemberPaymentItem {
  return {
    ...payment,
    confirmedAt: payment.confirmedAt?.toISOString() ?? null,
    createdAt: payment.createdAt.toISOString(),
    updatedAt: payment.updatedAt.toISOString(),
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

    const payments = await prisma.payment.findMany({
      where: { memberId: member.id },
      include: {
        fee: { select: { month: true, year: true } },
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    const response: MemberPaymentsResponse = {
      member: {
        id: member.id,
        dni: member.dni,
        firstName: member.firstName,
        lastName: member.lastName,
      },
      payments: payments.map(serializePayment),
    };

    return apiSuccess(response);
  } catch (error) {
    return apiDbError(error, 'Error al obtener los pagos del socio');
  }
}
