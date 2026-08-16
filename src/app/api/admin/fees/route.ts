import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { requireClub, clubWhere, AuthError } from '@/lib/access';
import { FeeListQuerySchema } from '@/types/fee';
import type { FeeListItem, FeeListResponse } from '@/types/fee';

function serializeFee(fee: {
  id: string;
  memberId: string;
  member: { dni: string; firstName: string; lastName: string };
  feeConfigId: string;
  feeConfig: { category: string };
  month: number;
  year: number;
  amount: number;
  dueDate: Date;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): FeeListItem {
  return {
    ...fee,
    dueDate: fee.dueDate.toISOString(),
    createdAt: fee.createdAt.toISOString(),
    updatedAt: fee.updatedAt.toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireClub(request);

    const { searchParams } = request.nextUrl;

    const parsed = FeeListQuerySchema.safeParse({
      memberId: searchParams.get('memberId') ?? undefined,
      search: searchParams.get('search') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      month: searchParams.get('month') ?? undefined,
      year: searchParams.get('year') ?? undefined,
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

    const { memberId, search, status, month, year, page, limit } = parsed.data;

    const where: Record<string, unknown> = {
      ...clubWhere(ctx.clubId),
    };

    if (memberId) {
      where.memberId = memberId;
    }

    if (status) {
      where.status = status;
    }

    if (month !== undefined) {
      where.month = month;
    }

    if (year !== undefined) {
      where.year = year;
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

    const [fees, total] = await Promise.all([
      prisma.fee.findMany({
        where,
        include: {
          member: { select: { dni: true, firstName: true, lastName: true } },
          feeConfig: { select: { category: true } },
        },
        orderBy: [{ year: 'desc' }, { month: 'desc' }, { member: { lastName: 'asc' } }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.fee.count({ where }),
    ]);

    const response: FeeListResponse = {
      data: fees.map(serializeFee),
      total,
      page,
      limit,
    };

    return apiSuccess(response);
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }
    return apiDbError(error, 'Error al listar las cuotas');
  }
}
