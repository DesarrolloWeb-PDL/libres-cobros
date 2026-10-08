import { NextRequest } from 'next/server';
import { z } from 'zod';
import { hash } from 'bcryptjs';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { rateLimit } from '@/lib/rate-limit';
import { Prisma } from '@prisma/client';

const RegisterSchema = z.object({
  name: z.string().min(1, 'El nombre del club es obligatorio'),
  siglas: z.string().max(10, 'Las siglas no pueden superar los 10 caracteres').optional(),
  slug: z
    .string()
    .min(1, 'El slug es obligatorio')
    .regex(/^[a-z0-9-]+$/, 'El slug solo admite minúsculas, números y guiones')
    .max(64, 'El slug no puede superar los 64 caracteres'),
  email: z.string().email('Ingresá un email válido'),
  adminName: z.string().min(1, 'El nombre del administrador es obligatorio'),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'El color principal debe tener formato hexadecimal (#RRGGBB)')
    .optional(),
});

const DEFAULT_PLANS = [
  { name: 'ADULT', amount: 15000, description: 'Socio adulto' },
  { name: 'FAMILY', amount: 22000, description: 'Grupo familiar' },
  { name: 'MINOR', amount: 8000, description: 'Socio menor' },
];

const DEFAULT_SITE_CONFIG_KEYS = [
  'bank_alias',
  'bank_cbu',
  'bank_cuit',
  'bank_name',
  'bank_holder',
  'bank_reference',
  'whatsapp_phone_number_id',
  'whatsapp_access_token',
  'twilio_account_sid',
  'twilio_auth_token',
  'twilio_phone_number',
];

function serializeClub(club: {
  id: string;
  name: string;
  siglas: string | null;
  slug: string;
  primaryColor: string;
  createdAt: Date;
}) {
  return {
    id: club.id,
    name: club.name,
    siglas: club.siglas,
    slug: club.slug,
    primaryColor: club.primaryColor,
    createdAt: club.createdAt.toISOString(),
  };
}

export async function POST(request: NextRequest) {
  const limit = rateLimit(request, { windowMs: 60_000, maxRequests: 5 });

  if (!limit.success) {
    return apiError(
      'Demasiados intentos de registro. Volvé a intentarlo en unos minutos.',
      429,
      'Rate limit exceeded',
      'RATE_LIMITED'
    );
  }

  try {
    const body = await request.json();
    const parsed = RegisterSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        'Datos inválidos',
        400,
        parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        'VALIDATION_ERROR'
      );
    }

    const { name, siglas, slug, email, adminName, primaryColor } = parsed.data;

    const existingSlug = await prisma.club.findUnique({
      where: { slug },
    });

    if (existingSlug) {
      return apiError(
        'Ya existe una institución con ese identificador',
        409,
        'Slug duplicado',
        'DUPLICATE_SLUG'
      );
    }

    const existingEmail = await prisma.adminUser.findUnique({
      where: { email },
    });

    if (existingEmail) {
      return apiError(
        'Ya existe una cuenta con ese email',
        409,
        'Email duplicado',
        'DUPLICATE_EMAIL'
      );
    }

    const tempPassword = randomBytes(4).toString('hex');
    const passwordHash = await hash(tempPassword, 12);

    const result = await prisma.$transaction(async (tx) => {
      const club = await tx.club.create({
        data: {
          name,
          siglas: siglas || null,
          slug,
          status: 'PENDING',
          primaryColor: primaryColor ?? '#7c3aed',
        },
      });

      const admin = await tx.adminUser.create({
        data: {
          email,
          name: adminName,
          passwordHash,
          role: 'ADMIN',
          clubId: club.id,
          mustChangePassword: true,
        },
      });

      await tx.plan.createMany({
        data: DEFAULT_PLANS.map((plan) => ({
          ...plan,
          clubId: club.id,
        })),
        skipDuplicates: true,
      });

      await tx.siteConfig.createMany({
        data: DEFAULT_SITE_CONFIG_KEYS.map((key) => ({
          clubId: club.id,
          key,
          value: '',
        })),
        skipDuplicates: true,
      });

      return { club, admin };
    });

    return apiSuccess({
      success: true,
      tempPassword,
      club: serializeClub(result.club),
      admin: {
        id: result.admin.id,
        email: result.admin.email,
        name: result.admin.name,
        role: result.admin.role,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const target = Array.isArray(error.meta?.target) ? error.meta.target.join(', ') : '';
        if (target.includes('slug')) {
          return apiError(
            'Ya existe una institución con ese identificador',
            409,
            'Slug duplicado',
            'DUPLICATE_SLUG'
          );
        }
        if (target.includes('email')) {
          return apiError(
            'Ya existe una cuenta con ese email',
            409,
            'Email duplicado',
            'DUPLICATE_EMAIL'
          );
        }
      }
    }

    return apiDbError(error, 'Error al registrar el club');
  }
}
