import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { requireInstitution, institutionWhere, AuthError } from '@/lib/access';
import { cancelAutoDebitSubscription } from '@/lib/autodebit';
import { z } from 'zod';
import type { AutoDebitListItem, AutoDebitListResponse } from '@/types/autodebit';

const StatusFilterSchema = z.enum(['PENDING_AUTH', 'ACTIVE', 'PAUSED', 'CANCELLED', 'FAILED']);

const CancelAutoDebitSchema = z.object({
  id: z.string().min(1, 'El ID es obligatorio'),
});

function serializeAutoDebit(autoDebit: {
  id: string;
  member: { dni: string; firstName: string; lastName: string; email: string | null };
  gateway: string;
  status: string;
  amount: number;
  nextBillingAt: Date | null;
  createdAt: Date;
}): AutoDebitListItem {
  return {
    ...autoDebit,
    nextBillingAt: autoDebit.nextBillingAt?.toISOString() ?? null,
    createdAt: autoDebit.createdAt.toISOString(),
  };
}

/** Lists the institution's auto-debits with member details, filterable by status. */
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireInstitution(request);

    const statusParam = request.nextUrl.searchParams.get('status') ?? undefined;
    const statusParsed = statusParam
      ? StatusFilterSchema.safeParse(statusParam)
      : null;

    if (statusParsed && !statusParsed.success) {
      return apiError(
        'Datos inválidos',
        400,
        'status must be one of PENDING_AUTH, ACTIVE, PAUSED, CANCELLED, FAILED',
        'VALIDATION_ERROR'
      );
    }

    const where: Record<string, unknown> = {
      ...institutionWhere(ctx.institutionId),
      ...(statusParsed?.data && { status: statusParsed.data }),
    };

    const autoDebits = await prisma.autoDebit.findMany({
      where,
      include: {
        member: { select: { dni: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    const response: AutoDebitListResponse = {
      data: autoDebits.map(serializeAutoDebit),
    };

    return apiSuccess(response);
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }
    return apiDbError(error, 'Error al listar los débitos automáticos');
  }
}

/** Cancels one auto-debit at the gateway and marks it CANCELLED. */
export async function DELETE(request: NextRequest) {
  try {
    const ctx = await requireInstitution(request);

    const body = await request.json();
    const parsed = CancelAutoDebitSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        'Datos inválidos',
        400,
        parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        'VALIDATION_ERROR'
      );
    }

    const autoDebit = await prisma.autoDebit.findFirst({
      where: {
        id: parsed.data.id,
        ...institutionWhere(ctx.institutionId),
      },
    });

    if (!autoDebit || autoDebit.status === 'CANCELLED') {
      return apiError(
        'Débito automático no encontrado',
        404,
        'No cancellable auto-debit for this institution',
        'AUTODEBIT_NOT_FOUND'
      );
    }

    await cancelAutoDebitSubscription(autoDebit);

    return apiSuccess({ autoDebit: { id: autoDebit.id, status: 'CANCELLED' } });
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }
    return apiDbError(error, 'Error al cancelar el débito automático');
  }
}
