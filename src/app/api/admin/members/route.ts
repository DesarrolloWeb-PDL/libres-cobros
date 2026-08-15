import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { authOptions } from '@/lib/auth';
import { CreateMemberSchema } from '@/types/member';

function serializeMember(member: {
  id: string;
  dni: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  category: string;
  status: string;
  joinDate: Date;
  notes: string | null;
}) {
  return {
    ...member,
    joinDate: member.joinDate.toISOString(),
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.role || session.user.role !== 'ADMIN') {
      return apiError('No autorizado', 401);
    }

    const body = await request.json();
    const parsed = CreateMemberSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        'Datos inválidos',
        400,
        parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        'VALIDATION_ERROR'
      );
    }

    const { email, ...data } = parsed.data;
    const normalizedEmail = email && email.trim() !== '' ? email.trim() : null;

    const existingDni = await prisma.member.findUnique({
      where: { dni: data.dni },
    });

    if (existingDni) {
      return apiError('Ya existe un socio con ese DNI', 409, 'DNI duplicado', 'DUPLICATE_DNI');
    }

    if (normalizedEmail) {
      const existingEmail = await prisma.member.findUnique({
        where: { email: normalizedEmail },
      });

      if (existingEmail) {
        return apiError('Ya existe un socio con ese email', 409, 'Email duplicado', 'DUPLICATE_EMAIL');
      }
    }

    const member = await prisma.member.create({
      data: {
        ...data,
        email: normalizedEmail,
      },
    });

    return apiSuccess(serializeMember(member));
  } catch (error) {
    return apiDbError(error, 'Error al crear el socio');
  }
}

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
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));

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

    const [members, total] = await Promise.all([
      prisma.member.findMany({
        where,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.member.count({ where }),
    ]);

    return apiSuccess({
      data: members.map(serializeMember),
      total,
      page,
      limit,
    });
  } catch (error) {
    return apiDbError(error, 'Error al listar socios');
  }
}
