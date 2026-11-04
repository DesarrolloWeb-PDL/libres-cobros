import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { requireInstitution, AuthError } from '@/lib/access';
import { createSaasAutoDebitEnrollment } from '@/lib/saas-autodebit';
import { saasAutoDebitEnrollSchema } from '@/types/saas';

export const dynamic = 'force-dynamic';

function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_URL ?? 'http://localhost:3000';
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireInstitution(request);

    if (ctx.role !== 'SUPER_ADMIN') {
      return apiError('Forbidden', 403, 'Only SUPER_ADMIN can enroll SaaS auto-debit', 'FORBIDDEN');
    }

    const { id } = await params;

    const body = await request.json();
    const parsed = saasAutoDebitEnrollSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        'Datos inválidos',
        400,
        parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        'VALIDATION_ERROR'
      );
    }

    const { gateway, amount, payerEmail } = parsed.data;

    const institution = await prisma.club.findUnique({ where: { id } });
    if (!institution) {
      return apiError('Institución no encontrada', 404, 'Institution ID inválido', 'INSTITUTION_NOT_FOUND');
    }

    const result = await createSaasAutoDebitEnrollment(prisma, {
      institutionId: id,
      institutionName: institution.name,
      gateway,
      amount,
      payerEmail,
      returnUrl: `${getSiteUrl()}/admin/saas/suscripciones`,
    });

    return apiSuccess({
      autoDebit: {
        id: result.autoDebit.id,
        gateway,
        status: gateway === 'mercadopago' ? 'PENDING_AUTH' : 'ACTIVE',
        amount,
      },
      authorizationUrl: result.authorizationUrl ?? null,
      managementUrl: result.managementUrl ?? null,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }
    return apiDbError(error, 'Error al configurar el débito automático SaaS');
  }
}
