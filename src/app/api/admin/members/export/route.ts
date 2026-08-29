import { NextRequest } from 'next/server';
import * as xlsx from 'xlsx';
import { prisma } from '@/lib/db';
import { apiError, apiDbError } from '@/lib/api-response';
import { requireClub, clubWhere, AuthError } from '@/lib/access';

const CATEGORY_LABELS: Record<string, string> = {
  ADULT: 'Adulto',
  FAMILY: 'Familia',
  MINOR: 'Menor',
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
};

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireClub(request);

    const { searchParams } = request.nextUrl;

    const search = searchParams.get('search')?.trim();
    const category = searchParams.get('category');
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {
      ...clubWhere(ctx.clubId),
    };

    if (category && ['ADULT', 'FAMILY', 'MINOR'].includes(category)) {
      where.category = category;
    }

    if (status && ['ACTIVE', 'INACTIVE'].includes(status)) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { dni: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const members = await prisma.member.findMany({
      where,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    const rows = members.map((member) => ({
      DNI: member.dni,
      Nombre: member.firstName,
      Apellido: member.lastName,
      Email: member.email ?? '',
      Telefono: member.phone ?? '',
      Categoria: CATEGORY_LABELS[member.category] ?? member.category,
      Estado: STATUS_LABELS[member.status] ?? member.status,
      'Fecha de ingreso': member.joinDate.toISOString().split('T')[0],
      Notas: member.notes ?? '',
    }));

    const worksheet = xlsx.utils.json_to_sheet(rows);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Socios');

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    const clubSlug = ctx.clubId
      ? (await prisma.club.findUnique({ where: { id: ctx.clubId }, select: { slug: true } }))?.slug ?? 'club'
      : 'club';
    const date = new Date().toISOString().slice(0, 10);
    const filename = `socios_${clubSlug}_${date}.xlsx`;

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }
    return apiDbError(error, 'Error al exportar socios');
  }
}