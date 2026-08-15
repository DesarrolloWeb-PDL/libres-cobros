import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import * as xlsx from 'xlsx';
import { prisma } from '@/lib/db';
import { apiError, apiDbError } from '@/lib/api-response';
import { authOptions } from '@/lib/auth';

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
    const session = await getServerSession(authOptions);

    if (!session?.user?.role || session.user.role !== 'ADMIN') {
      return apiError('No autorizado', 401);
    }

    const { searchParams } = request.nextUrl;

    const search = searchParams.get('search')?.trim();
    const category = searchParams.get('category');
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {};

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

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="socios.xlsx"',
      },
    });
  } catch (error) {
    return apiDbError(error, 'Error al exportar socios');
  }
}
