import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { requireClub, AuthError } from '@/lib/access';

const ClubCommissionTypeSchema = z.enum(['PERCENTAGE', 'FIXED']);
const ClubStatusSchema = z.enum(['ACTIVE', 'INACTIVE']);

const UpdateClubSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').optional(),
  slug: z
    .string()
    .min(1, 'El slug es obligatorio')
    .regex(/^[a-z0-9-]+$/, 'El slug solo admite minúsculas, números y guiones')
    .optional(),
  commissionType: ClubCommissionTypeSchema.optional(),
  commissionValue: z.number().optional(),
  status: ClubStatusSchema.optional(),
  // Club customization fields
  logoUrl: z.string().url().nullable().optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

function validateCommission(
  commissionType: 'PERCENTAGE' | 'FIXED',
  commissionValue: number
): string | null {
  if (commissionType === 'PERCENTAGE') {
    if (commissionValue < 0 || commissionValue > 100) {
      return 'La comisión porcentual debe estar entre 0 y 100';
    }
    return null;
  }
  if (commissionValue < 0) {
    return 'La comisión fija no puede ser negativa';
  }
  return null;
}

function serializeClub(club: {
  id: string;
  name: string;
  slug: string;
  commissionType: string;
  commissionValue: number;
  status: string;
  logoUrl?: string | null;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...club,
    createdAt: club.createdAt.toISOString(),
    updatedAt: club.updatedAt.toISOString(),
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireClub(request);

    if (ctx.role !== 'SUPER_ADMIN') {
      return apiError('No autorizado', 403, 'Solo SUPER_ADMIN puede gestionar clubes', 'FORBIDDEN');
    }

    const { id } = await params;

    const club = await prisma.club.findUnique({
      where: { id },
    });

    if (!club) {
      return apiError('Club no encontrado', 404, 'Club ID inválido', 'CLUB_NOT_FOUND');
    }

    return apiSuccess(serializeClub(club));
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }
    return apiDbError(error, 'Error al obtener el club');
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireClub(request);

    if (ctx.role !== 'SUPER_ADMIN') {
      return apiError('No autorizado', 403, 'Solo SUPER_ADMIN puede gestionar clubes', 'FORBIDDEN');
    }

    const { id } = await params;

    const existing = await prisma.club.findUnique({
      where: { id },
    });

    if (!existing) {
      return apiError('Club no encontrado', 404, 'Club ID inválido', 'CLUB_NOT_FOUND');
    }

    const body = await request.json();
    const parsed = UpdateClubSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        'Datos inválidos',
        400,
        parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        'VALIDATION_ERROR'
      );
    }

    const { commissionType, commissionValue } = parsed.data;
    const effectiveType = commissionType ?? existing.commissionType;
    const effectiveValue = commissionValue ?? existing.commissionValue;

    const validationError = validateCommission(
      effectiveType as 'PERCENTAGE' | 'FIXED',
      effectiveValue
    );
    if (validationError) {
      return apiError(validationError, 400, 'Validación de comisión', 'VALIDATION_ERROR');
    }

    if (parsed.data.slug && parsed.data.slug !== existing.slug) {
      const duplicate = await prisma.club.findUnique({
        where: { slug: parsed.data.slug },
      });
      if (duplicate) {
        return apiError(
          'Ya existe un club con ese slug',
          409,
          'Slug duplicado',
          'DUPLICATE_SLUG'
        );
      }
    }

    const club = await prisma.club.update({
      where: { id },
      data: {
        ...(parsed.data.name && { name: parsed.data.name }),
        ...(parsed.data.slug && { slug: parsed.data.slug }),
        ...(parsed.data.commissionType && { commissionType: parsed.data.commissionType }),
        ...(parsed.data.commissionValue !== undefined && {
          commissionValue: parsed.data.commissionValue,
        }),
        ...(parsed.data.status && { status: parsed.data.status }),
        // Club customization fields
        ...(parsed.data.logoUrl !== undefined && { logoUrl: parsed.data.logoUrl }),
        ...(parsed.data.primaryColor && { primaryColor: parsed.data.primaryColor }),
        ...(parsed.data.secondaryColor && { secondaryColor: parsed.data.secondaryColor }),
        ...(parsed.data.accentColor && { accentColor: parsed.data.accentColor }),
      },
    });

    return apiSuccess(serializeClub(club));
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }
    return apiDbError(error, 'Error al actualizar el club');
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireClub(request);

    if (ctx.role !== 'SUPER_ADMIN') {
      return apiError('No autorizado', 403, 'Solo SUPER_ADMIN puede gestionar clubes', 'FORBIDDEN');
    }

    const { id } = await params;

    const club = await prisma.club.findUnique({
      where: { id },
    });

    if (!club) {
      return apiError('Club no encontrado', 404, 'Club ID inválido', 'CLUB_NOT_FOUND');
    }

    return apiError(
      'No se puede eliminar un club: desactívelo en su lugar',
      409,
      'Los clubes con datos solo pueden desactivarse (status INACTIVE), nunca eliminarse',
      'CLUB_DELETE_NOT_ALLOWED'
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }
    return apiDbError(error, 'Error al eliminar el club');
  }
}