import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { requireClub, AuthError } from '@/lib/access';

const UpdateThemeSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});

// GET: Get super admin theme
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireClub(request);

    if (ctx.role !== 'SUPER_ADMIN') {
      return apiError('No autorizado', 403, 'Solo super admin puede acceder', 'FORBIDDEN');
    }

    // Find theme config with null clubId (system-wide)
    let config = await prisma.siteConfig.findFirst({
      where: { clubId: null, key: 'theme' },
    });

    if (!config) {
      config = await prisma.siteConfig.create({
        data: {
          clubId: null,
          key: 'theme',
          value: 'default',
          primaryColor: '#7c3aed',
          secondaryColor: '#a78bfa',
          accentColor: '#5b21b6',
        },
      });
    }

    return apiSuccess({
      primaryColor: config.primaryColor,
      secondaryColor: config.secondaryColor,
      accentColor: config.accentColor,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }
    return apiDbError(error, 'Error al obtener el tema');
  }
}

// PUT: Update super admin theme
export async function PUT(request: NextRequest) {
  try {
    const ctx = await requireClub(request);

    if (ctx.role !== 'SUPER_ADMIN') {
      return apiError('No autorizado', 403, 'Solo super admin puede actualizar el tema', 'FORBIDDEN');
    }

    const body = await request.json();
    const parsed = UpdateThemeSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        'Datos inválidos',
        400,
        parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        'VALIDATION_ERROR'
      );
    }

    const { primaryColor, secondaryColor, accentColor } = parsed.data;

    // Find theme config with null clubId (system-wide)
    let config = await prisma.siteConfig.findFirst({
      where: { clubId: null, key: 'theme' },
    });

    if (config) {
      await prisma.siteConfig.update({
        where: { id: config.id },
        data: { primaryColor, secondaryColor, accentColor },
      });
    } else {
      await prisma.siteConfig.create({
        data: {
          clubId: null,
          key: 'theme',
          value: 'default',
          primaryColor,
          secondaryColor,
          accentColor,
        },
      });
    }

    return apiSuccess({ message: 'Tema actualizado correctamente' });
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }
    return apiDbError(error, 'Error al actualizar el tema');
  }
}
