import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiError, apiDbError } from '@/lib/api-response';
import { requireInstitution, institutionWhere, AuthError } from '@/lib/access';
import { toCSV } from '@/lib/export';
import { ExportQuerySchema } from '@/types/export';
import type { ExportTable } from '@/lib/export';

const TABLE_FILENAMES: Record<ExportTable, string> = {
  socios: 'socios',
  cuotas: 'cuotas',
  pagos: 'pagos',
  comisiones: 'comisiones',
  planes: 'planes',
  configuracion: 'configuracion',
};

function parseDateFilters(from?: Date, to?: Date): Record<string, unknown> | undefined {
  if (!from && !to) return undefined;

  const filter: Record<string, unknown> = {};
  if (from) filter.gte = from;
  if (to) filter.lte = to;
  return filter;
}

function buildWhere(
  institutionId: string | null,
  dateField: string,
  dateFilter?: Record<string, unknown>
): Record<string, unknown> {
  const where: Record<string, unknown> = {
    ...institutionWhere(institutionId),
  };

  if (dateFilter) {
    where[dateField] = dateFilter;
  }

  return where;
}

async function fetchTableData(
  table: ExportTable,
  institutionId: string | null,
  from?: Date,
  to?: Date
): Promise<Record<string, unknown>[]> {
  const dateFilter = parseDateFilters(from, to);

  switch (table) {
    case 'socios': {
      const rows = await prisma.member.findMany({
        where: buildWhere(institutionId, 'joinDate', dateFilter),
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      });
      return rows.map((row) => ({
        id: row.id,
        dni: row.dni,
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email,
        phone: row.phone,
        category: row.category,
        planId: row.planId,
        status: row.status,
        joinDate: row.joinDate.toISOString(),
        notes: row.notes,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      }));
    }

    case 'cuotas': {
      const rows = await prisma.fee.findMany({
        where: buildWhere(institutionId, 'dueDate', dateFilter),
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
      });
      return rows.map((row) => ({
        id: row.id,
        memberId: row.memberId,
        planId: row.planId,
        month: row.month,
        year: row.year,
        amount: row.amount,
        dueDate: row.dueDate.toISOString(),
        status: row.status,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      }));
    }

    case 'pagos': {
      const where = buildWhere(institutionId, 'createdAt', dateFilter);
      const rows = await prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });
      return rows.map((row) => ({
        id: row.id,
        feeId: row.feeId,
        memberId: row.memberId,
        amount: row.amount,
        method: row.method,
        status: row.status,
        confirmedAt: row.confirmedAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      }));
    }

    case 'comisiones': {
      const rows = await prisma.commission.findMany({
        where: buildWhere(institutionId, 'createdAt', dateFilter),
        orderBy: { createdAt: 'desc' },
      });
      return rows.map((row) => ({
        id: row.id,
        paymentId: row.paymentId,
        feeId: row.feeId,
        amount: row.amount,
        rate: row.rate,
        periodId: row.periodId,
        createdAt: row.createdAt.toISOString(),
      }));
    }

    case 'planes': {
      const rows = await prisma.plan.findMany({
        where: buildWhere(institutionId, 'createdAt', dateFilter),
        orderBy: { name: 'asc' },
      });
      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        amount: row.amount,
        description: row.description,
        isActive: row.isActive,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      }));
    }

    case 'configuracion': {
      const rows = await prisma.siteConfig.findMany({
        where: buildWhere(institutionId, 'updatedAt', dateFilter),
        orderBy: { key: 'asc' },
      });
      return rows.map((row) => ({
        id: row.id,
        key: row.key,
        value: row.value,
        primaryColor: row.primaryColor,
        secondaryColor: row.secondaryColor,
        accentColor: row.accentColor,
        bgColor: row.bgColor,
        updatedAt: row.updatedAt.toISOString(),
      }));
    }

    default:
      return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireInstitution(request);

    const { searchParams } = request.nextUrl;

    const parsed = ExportQuerySchema.safeParse({
      tables: searchParams.get('tables') ?? undefined,
      format: searchParams.get('format') ?? undefined,
      from: searchParams.get('from') ?? undefined,
      to: searchParams.get('to') ?? undefined,
    });

    if (!parsed.success) {
      return apiError(
        'Parámetros inválidos',
        400,
        parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        'VALIDATION_ERROR'
      );
    }

    const { tables, format, from, to } = parsed.data;

    if (format === 'csv' && tables.length > 1) {
      return apiError(
        'Formato CSV soporta una sola tabla por exportación',
        400,
        undefined,
        'VALIDATION_ERROR'
      );
    }

    const institutionSlug = ctx.institutionId
      ? (await prisma.club.findUnique({ where: { id: ctx.institutionId }, select: { slug: true } }))
          ?.slug ?? 'institucion'
      : 'todas';

    const dateSuffix = new Date().toISOString().slice(0, 10);

    if (format === 'csv') {
      const table = tables[0];
      const data = await fetchTableData(table, ctx.institutionId, from, to);
      const csv = toCSV(data);
      const filename = `${TABLE_FILENAMES[table]}_${institutionSlug}_${dateSuffix}.csv`;

      return new Response(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    const result: Record<string, Record<string, unknown>[]> = {};
    for (const table of tables) {
      result[table] = await fetchTableData(table, ctx.institutionId, from, to);
    }

    const filename = `exportacion_${institutionSlug}_${dateSuffix}.json`;
    const body = JSON.stringify(
      {
        tables: result,
        exportedAt: new Date().toISOString(),
      },
      null,
      2
    );

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }
    return apiDbError(error, 'Error al exportar datos');
  }
}
