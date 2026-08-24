import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { requireClub, AuthError } from '@/lib/access';

const UpdateUserSchema = z.object({
  role: z.enum(['ADMIN', 'SUPER_ADMIN']).optional(),
  name: z.string().min(1).optional(),
  clubId: z.string().cuid().nullable().optional(),
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireClub(request);

    if (ctx.role !== 'SUPER_ADMIN') {
      return apiError('No autorizado', 403, 'Solo SUPER_ADMIN puede gestionar usuarios', 'FORBIDDEN');
    }

    const { id } = await params;

    const user = await prisma.adminUser.findUnique({
      where: { id },
      include: { club: { select: { name: true } } },
    });

    if (!user) {
      return apiError('Usuario no encontrado', 404, 'ID de usuario inválido', 'USER_NOT_FOUND');
    }

    return apiSuccess({ data: serializeUser(user) });
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }
    return apiDbError(error, 'Error al obtener el usuario');
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireClub(request);

    if (ctx.role !== 'SUPER_ADMIN') {
      return apiError('No autorizado', 403, 'Solo SUPER_ADMIN puede gestionar usuarios', 'FORBIDDEN');
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = UpdateUserSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        'Datos inválidos',
        400,
        parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        'VALIDATION_ERROR'
      );
    }

    const existing = await prisma.adminUser.findUnique({
      where: { id },
    });

    if (!existing) {
      return apiError('Usuario no encontrado', 404, 'ID de usuario inválido', 'USER_NOT_FOUND');
    }

    const user = await prisma.adminUser.update({
      where: { id },
      data: parsed.data,
      include: { club: { select: { name: true } } },
    });

    return apiSuccess({ data: serializeUser(user) });
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }
    return apiDbError(error, 'Error al actualizar el usuario');
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireClub(request);

    if (ctx.role !== 'SUPER_ADMIN') {
      return apiError('No autorizado', 403, 'Solo SUPER_ADMIN puede gestionar usuarios', 'FORBIDDEN');
    }

    const { id } = await params;

    const existing = await prisma.adminUser.findUnique({
      where: { id },
    });

    if (!existing) {
      return apiError('Usuario no encontrado', 404, 'ID de usuario inválido', 'USER_NOT_FOUND');
    }

    if (existing.role === 'SUPER_ADMIN') {
      return apiError('No permitido', 400, 'No se puede eliminar un Super Admin', 'CANNOT_DELETE_SUPER_ADMIN');
    }

    await prisma.adminUser.delete({
      where: { id },
    });

    return apiSuccess({ data: { deleted: true } });
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }
    return apiDbError(error, 'Error al eliminar el usuario');
  }
}
