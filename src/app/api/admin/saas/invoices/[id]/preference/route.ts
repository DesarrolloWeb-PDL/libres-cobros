import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { requireInstitution, AuthError } from '@/lib/access';
import { createSaasOneOffPreference } from '@/lib/saas-autodebit';

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
    const { id } = await params;

    const invoice = await prisma.saasInvoice.findUnique({
      where: { id },
      include: { institution: { select: { id: true, name: true } } },
    });

    if (!invoice) {
      return apiError('Factura no encontrada', 404, 'Invoice ID inválido', 'INVOICE_NOT_FOUND');
    }

    if (ctx.role === 'ADMIN' && ctx.institutionId !== invoice.institutionId) {
      return apiError('No autorizado', 403, 'La factura no pertenece a tu institución', 'FORBIDDEN');
    }

    if (invoice.status === 'PAID') {
      return apiError('Factura ya pagada', 409, 'No se puede pagar una factura ya saldada', 'INVOICE_ALREADY_PAID');
    }

    const result = await createSaasOneOffPreference({
      invoiceId: invoice.id,
      amount: invoice.amount,
      institutionName: invoice.institution.name,
      returnUrl: `${getSiteUrl()}/admin/suscripcion`,
    });

    return apiSuccess({ preferenceId: result.preferenceId, initPoint: result.initPoint });
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }
    return apiDbError(error, 'Error al crear la preferencia de pago');
  }
}
