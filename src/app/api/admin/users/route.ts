import { NextRequest } from 'next/server';
import { z } from 'zod';
import { hashSync } from 'bcryptjs';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { requireClub, AuthError } from '@/lib/access';

const CreateAdminUserSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  name: z.string().min(1, 'El nombre es obligatorio'),
  clubId: z.string().cuid('Club ID inválido'),
});

function serializeUser(user: {
  id: string;
  email: string;
  name: string;
  role: string;
  clubId: string | null;
  createdAt: Date;
  updatedAt: Date;
  club?: { name: string } | null;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    clubId: user.clubId,
    clubName: user.club?.name ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireClub(request);

    if (ctx.role !== 'SUPER_ADMIN') {
      return apiError('No autorizado', 403, 'Solo SUPER_ADMIN puede gestionar usuarios', 'FORBIDDEN');
    }

    const users = await prisma.adminUser.findMany({
      include: {
        club: { select: { name: true } },
      },
      orderBy: { email: 'asc' },
    });

    return apiSuccess({ data: users.map(serializeUser) });
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }
    return apiDbError(error, 'Error al listar los usuarios');
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireClub(request);

    if (ctx.role !== 'SUPER_ADMIN') {
      return apiError('No autorizado', 403, 'Solo SUPER_ADMIN puede gestionar usuarios', 'FORBIDDEN');
    }

    const body = await request.json();
    const parsed = CreateAdminUserSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        'Datos inválidos',
        400,
        parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        'VALIDATION_ERROR'
      );
    }

    const { email, password, name, clubId } = parsed.data;

    const club = await prisma.club.findUnique({
      where: { id: clubId },
    });

    if (!club) {
      return apiError('Club no encontrado', 404, 'Club ID inválido', 'CLUB_NOT_FOUND');
    }

    const existing = await prisma.adminUser.findUnique({
      where: { email },
    });

    if (existing) {
      return apiError(
        'Ya existe un usuario con ese email',
        409,
        'Email duplicado',
        'DUPLICATE_EMAIL'
      );
    }

    const user = await prisma.adminUser.create({
      data: {
        email,
        name,
        passwordHash: hashSync(password, 10),
        role: 'ADMIN',
        clubId,
      },
      include: {
        club: { select: { name: true } },
      },
    });

    return apiSuccess(serializeUser(user));
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }
    return apiDbError(error, 'Error al crear el usuario');
  }
}