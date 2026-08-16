import { NextRequest } from 'next/server';
import { apiError, apiDbError } from '@/lib/api-response';
import { requireClub, AuthError } from '@/lib/access';
import { generateDebtReport, generatePaymentReport, generateCommissionReport } from '@/lib/reports';
import { generateExcel } from '@/lib/excel';
import { ExportReportQuerySchema } from '@/types/report';
import type { ExcelColumn } from '@/lib/excel';

const methodLabels: Record<string, string> = {
  stripe: 'Stripe',
  mercadopago: 'MercadoPago',
  bank_transfer: 'Transferencia',
};

const monthLabels: Record<number, string> = {
  1: 'Enero',
  2: 'Febrero',
  3: 'Marzo',
  4: 'Abril',
  5: 'Mayo',
  6: 'Junio',
  7: 'Julio',
  8: 'Agosto',
  9: 'Septiembre',
  10: 'Octubre',
  11: 'Noviembre',
  12: 'Diciembre',
};

async function generateDebtsExcel(filters: {
  month?: number;
  year?: number;
  category?: string;
}) {
  const report = await generateDebtReport({ ...filters, page: 1, limit: 10000 });

  const columns: ExcelColumn[] = [
    { key: 'dni', header: 'DNI', width: 14 },
    { key: 'lastName', header: 'Apellido', width: 20 },
    { key: 'firstName', header: 'Nombre', width: 20 },
    { key: 'category', header: 'Categoría', width: 14 },
    { key: 'phone', header: 'Teléfono', width: 16 },
    { key: 'email', header: 'Email', width: 28 },
    { key: 'pendingFees', header: 'Cuotas pendientes', width: 18 },
    { key: 'overdueFees', header: 'Cuotas vencidas', width: 18 },
    { key: 'totalDebt', header: 'Deuda total', width: 16 },
  ];

  const rows = report.data.map((item) => ({
    dni: item.dni,
    lastName: item.lastName,
    firstName: item.firstName,
    category: item.category,
    phone: item.phone ?? '',
    email: item.email ?? '',
    pendingFees: item.pendingFees,
    overdueFees: item.overdueFees,
    totalDebt: item.totalDebt,
  }));

  rows.push({
    dni: '',
    lastName: '',
    firstName: '',
    category: '',
    phone: '',
    email: '',
    pendingFees: report.totals.pendingFees,
    overdueFees: report.totals.overdueFees,
    totalDebt: report.totals.totalDebt,
  });

  return generateExcel(columns, rows, 'Reporte de deudas');
}

async function generatePaymentsExcel(filters: {
  memberId?: string;
  method?: string;
  from?: Date;
  to?: Date;
}) {
  const report = await generatePaymentReport({ ...filters, page: 1, limit: 10000 });

  const columns: ExcelColumn[] = [
    { key: 'date', header: 'Fecha', width: 16 },
    { key: 'dni', header: 'DNI', width: 14 },
    { key: 'lastName', header: 'Apellido', width: 20 },
    { key: 'firstName', header: 'Nombre', width: 20 },
    { key: 'period', header: 'Período', width: 16 },
    { key: 'amount', header: 'Monto', width: 14 },
    { key: 'method', header: 'Método', width: 16 },
  ];

  const rows = report.data.map((item) => ({
    date: new Date(item.confirmedAt).toLocaleDateString('es-AR'),
    dni: item.member.dni,
    lastName: item.member.lastName,
    firstName: item.member.firstName,
    period: `${monthLabels[item.fee.month]} ${item.fee.year}`,
    amount: item.amount,
    method: methodLabels[item.method] ?? item.method,
  }));

  rows.push({
    date: 'TOTAL',
    dni: '',
    lastName: '',
    firstName: '',
    period: '',
    amount: report.totals.amount,
    method: '',
  });

  return generateExcel(columns, rows, 'Reporte de pagos');
}

async function generateCommissionsExcel(filters: {
  month?: number;
  year?: number;
  periodId?: string;
}) {
  const report = await generateCommissionReport({ ...filters, page: 1, limit: 10000 });

  const columns: ExcelColumn[] = [
    { key: 'date', header: 'Fecha', width: 16 },
    { key: 'dni', header: 'DNI', width: 14 },
    { key: 'lastName', header: 'Apellido', width: 20 },
    { key: 'firstName', header: 'Nombre', width: 20 },
    { key: 'period', header: 'Período', width: 16 },
    { key: 'paymentAmount', header: 'Monto pago', width: 14 },
    { key: 'rate', header: 'Tasa %', width: 10 },
    { key: 'commission', header: 'Comisión', width: 14 },
    { key: 'method', header: 'Método', width: 16 },
  ];

  const rows = report.data.map((item) => ({
    date: new Date(item.createdAt).toLocaleDateString('es-AR'),
    dni: item.member.dni,
    lastName: item.member.lastName,
    firstName: item.member.firstName,
    period: `${monthLabels[item.fee.month]} ${item.fee.year}`,
    paymentAmount: item.payment.amount,
    rate: item.rate,
    commission: item.amount,
    method: methodLabels[item.payment.method] ?? item.payment.method,
  }));

  rows.push({
    date: 'TOTAL',
    dni: '',
    lastName: '',
    firstName: '',
    period: '',
    paymentAmount: report.totals.paymentAmount,
    rate: 0,
    commission: report.totals.amount,
    method: '',
  });

  return generateExcel(columns, rows, 'Reporte de comisiones');
}

export async function GET(request: NextRequest) {
  try {
    await requireClub(request);

    const { searchParams } = request.nextUrl;

    const parsed = ExportReportQuerySchema.safeParse({
      type: searchParams.get('type') ?? undefined,
      month: searchParams.get('month') ?? undefined,
      year: searchParams.get('year') ?? undefined,
      category: searchParams.get('category') ?? undefined,
      memberId: searchParams.get('memberId') ?? undefined,
      method: searchParams.get('method') ?? undefined,
      from: searchParams.get('from') ?? undefined,
      to: searchParams.get('to') ?? undefined,
      periodId: searchParams.get('periodId') ?? undefined,
    });

    if (!parsed.success) {
      return apiError(
        'Parámetros inválidos',
        400,
        parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        'VALIDATION_ERROR'
      );
    }

    const { type, month, year, category, memberId, method, from, to, periodId } =
      parsed.data;

    let result: { buffer: Buffer; contentType: string; filename: string };

    switch (type) {
      case 'debts':
        result = await generateDebtsExcel({ month, year, category });
        break;
      case 'payments':
        result = await generatePaymentsExcel({ memberId, method, from, to });
        break;
      case 'commissions':
        result = await generateCommissionsExcel({ month, year, periodId });
        break;
      default:
        return apiError('Tipo de reporte no soportado', 400);
    }

    return new Response(result.buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': result.contentType,
        'Content-Disposition': `attachment; filename="${result.filename}"`,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }
    return apiDbError(error, 'Error al generar la exportación');
  }
}