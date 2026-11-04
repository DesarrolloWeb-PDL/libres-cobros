import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { requireInstitution, AuthError } from '@/lib/access';
import type { SaasInvoiceListItem, SaasInvoiceListResponse } from '@/types/saas';

export const dynamic = 'force-dynamic';

function serializeInvoice(invoice: {
  id: string;
  institutionId: string;
  institution: { id: string; name: string };
  saasPlanId: string;
  saasPlan: { id: string; name: string };
  month: number;
  year: number;
  amount: number;
  status: string;
  dueDate: Date;
  paidAt: Date | null;
  paymentMethod: string | null;
  transferRef: string | null;
  remindersSent: number;
  createdAt: Date;
  updatedAt: Date;
}): SaasInvoiceListItem {
  return {
    ...invoice,
    dueDate: invoice.dueDate.toISOString(),
    paidAt: invoice.paidAt ? invoice.paidAt.toISOString() : null,
    createdAt: invoice.createdAt.toISOString(),
    updatedAt: invoice.updatedAt.toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireInstitution(request);

    if (ctx.role !== 'SUPER_ADMIN') {
      return apiError('No autorizado', 403, 'Solo SUPER_ADMIN puede ver facturas SaaS', 'FORBIDDEN');
    }

    const { searchParams } = request.nextUrl;
    const statusFilter = searchParams.get('status');
    const institutionId = searchParams.get('institutionId');
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    const where: Record<string, unknown> = {};
    if (statusFilter) where.status = statusFilter;
    if (institutionId) where.institutionId = institutionId;
    if (month) where.month = parseInt(month, 10);
    if (year) where.year = parseInt(year, 10);

    const invoices = await prisma.saasInvoice.findMany({
      where,
      include: {
        institution: { select: { id: true, name: true } },
        saasPlan: { select: { id: true, name: true } },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }, { createdAt: 'desc' }],
    });

    const response: SaasInvoiceListResponse = {
      data: invoices.map(serializeInvoice),
    };

    return apiSuccess(response);
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }
    return apiDbError(error, 'Error al listar las facturas SaaS');
  }
}
