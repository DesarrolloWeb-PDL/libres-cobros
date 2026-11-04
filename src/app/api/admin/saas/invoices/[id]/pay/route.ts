import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { requireInstitution, AuthError } from '@/lib/access';
import { confirmSaasInvoice } from '@/lib/saas-autodebit';
import { saasInvoicePaySchema } from '@/types/saas';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireInstitution(request);

    if (ctx.role !== 'SUPER_ADMIN') {
      return apiError('Forbidden', 403, 'Only SUPER_ADMIN can mark SaaS invoices as paid', 'FORBIDDEN');
    }

    const { id } = await params;

    const body = await request.json();
    const parsed = saasInvoicePaySchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        'Datos inválidos',
        400,
        parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        'VALIDATION_ERROR'
      );
    }

    const invoice = await prisma.saasInvoice.findUnique({ where: { id } });
    if (!invoice) {
      return apiError('Factura no encontrada', 404, 'Invoice ID inválido', 'INVOICE_NOT_FOUND');
    }

    const result = await confirmSaasInvoice(prisma, id, {
      method: 'bank_transfer',
      transferRef: parsed.data.transferRef,
    });

    return apiSuccess({ status: result.status, invoiceId: result.invoiceId });
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }
    return apiDbError(error, 'Error al confirmar el pago de la factura SaaS');
  }
}
