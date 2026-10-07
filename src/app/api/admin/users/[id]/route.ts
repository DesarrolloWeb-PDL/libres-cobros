import { NextRequest } from 'next/server';
import { z } from 'zod';
import { hash } from 'bcryptjs';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { requireInstitution, AuthError } from '@/lib/access';

const UpdateAdminUserSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').optional(),
  role: z.enum(['ADMIN', 'SUPER_ADMIN']).optional(),
  clubId: z.string().cuid('Institution ID inválido').nullable().optional(),
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

async function requireSuperAdmin(request: NextRequest) {
  const ctx = await requireInstitution(request);

  if (ctx.role !== 'SUPER_ADMIN') {
    return apiError('No autorizado', 403, 'Solo SUPER_ADMIN puede gestionar usuarios', 'FORBIDDEN');
  }

  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const forbidden = await requireSuperAdmin(request);
    if (forbidden) return forbidden;

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
    const forbidden = await requireSuperAdmin(request);
    if (forbidden) return forbidden;

    const { id } = await params;

    const existing = await prisma.adminUser.findUnique({
      where: { id },
    });

    if (!existing) {
      return apiError('Usuario no encontrado', 404, 'ID de usuario inválido', 'USER_NOT_FOUND');
    }

    const body = await request.json();
    const parsed = UpdateAdminUserSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        'Datos inválidos',
        400,
        parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        'VALIDATION_ERROR'
      );
    }

    // Email is intentionally not editable — it is not part of the schema.
    const nextRole = parsed.data.role ?? existing.role;
    const nextClubId =
      nextRole === 'SUPER_ADMIN'
        ? null
        : parsed.data.clubId !== undefined
          ? parsed.data.clubId
          : existing.clubId;

    if (nextRole === 'ADMIN' && !nextClubId) {
      return apiError(
        'Institución es obligatoria para roles de admin de institución',
        400,
        'Institución es obligatoria para roles de admin de institución',
        'CLUB_REQUIRED'
      );
    }

    if (nextRole === 'ADMIN' && parsed.data.clubId) {
      const club = await prisma.club.findUnique({
        where: { id: parsed.data.clubId },
      });

      if (!club) {
        return apiError('Institución no encontrada', 404, 'ID de institución inválido', 'INSTITUTION_NOT_FOUND');
      }
    }

    const user = await prisma.adminUser.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined && { name: parsed.data.name }),
        role: nextRole,
        clubId: nextClubId,
      },
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const forbidden = await requireSuperAdmin(request);
    if (forbidden) return forbidden;

    const { id } = await params;

    const user = await prisma.adminUser.findUnique({
      where: { id },
    });

    if (!user) {
      return apiError('Usuario no encontrado', 404, 'ID de usuario inválido', 'USER_NOT_FOUND');
    }

    // Self-reset is intentionally allowed (recovery use case).
    const tempPassword = randomBytes(4).toString('hex');
    const passwordHash = await hash(tempPassword, 12);

    await prisma.adminUser.update({
      where: { id },
      data: {
        passwordHash,
        mustChangePassword: true,
      },
    });

    return apiSuccess({
      success: true,
      tempPassword,
      message: 'Contraseña temporal generada. El usuario deberá cambiarla en el próximo login.',
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }
    return apiDbError(error, 'Error al blanquear la clave');
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const forbidden = await requireSuperAdmin(request);
    if (forbidden) return forbidden;

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
