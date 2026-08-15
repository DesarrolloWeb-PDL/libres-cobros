import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { authOptions } from '@/lib/auth';
import { PaymentListQuerySchema } from '@/types/payment';
import type { PaymentListItem, PaymentListResponse } from '@/types/payment';

function serializePayment(payment: {
  id: string;
  feeId: string;
  memberId: string;
  member: { dni: string; firstName: string; lastName: string };
  fee: { month: number; year: number };
  amount: number;
  method: string;
  status: string;
  stripeSessionId: string | null;
  mercadopagoPreferenceId: string | null;
  bankTransferRef: string | null;
  confirmedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): PaymentListItem {
  return {
    ...payment,
    confirmedAt: payment.confirmedAt?.toISOString() ?? null,
    createdAt: payment.createdAt.toISOString(),
    updatedAt: payment.updatedAt.toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.role || session.user.role !== 'ADMIN') {
      return apiError('No autorizado', 401);
    }

    const { searchParams } = request.nextUrl;

    const parsed = PaymentListQuerySchema.safeParse({
      memberId: searchParams.get('memberId') ?? undefined,
      search: searchParams.get('search') ?? undefined,
      method: searchParams.get('method') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      from: searchParams.get('from') ?? undefined,
      to: searchParams.get('to') ?? undefined,
      page: searchParams.get('page') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    });

    if (!parsed.success) {
      return apiError(
        'Parámetros inválidos',
        400,
        parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        'VALIDATION_ERROR'
      );
    }

    const { memberId, search, method, status, from, to, page, limit } = parsed.data;

    const where: Record<string, unknown> = {};

    if (memberId) {
      where.memberId = memberId;
    }

    if (method) {
      where.method = method;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.member = {
        OR: [
          { dni: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    if (from || to) {
      where.createdAt = {};
      if (from) {
        (where.createdAt as Record<string, unknown>).gte = from;
      }
      if (to) {
        (where.createdAt as Record<string, unknown>).lte = to;
      }
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          member: { select: { dni: true, firstName: true, lastName: true } },
          fee: { select: { month: true, year: true } },
        },
        orderBy: [{ createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.payment.count({ where }),
    ]);

    const response: PaymentListResponse = {
      data: payments.map(serializePayment),
      total,
      page,
      limit,
    };

    return apiSuccess(response);
  } catch (error) {
    return apiDbError(error, 'Error al listar los pagos');
  }
}
