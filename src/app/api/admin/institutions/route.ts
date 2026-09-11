import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { requireInstitution, AuthError } from '@/lib/access';

const InstitutionCommissionTypeSchema = z.enum(['PERCENTAGE', 'FIXED']);
const InstitutionStatusSchema = z.enum(['ACTIVE', 'INACTIVE']);

const CreateInstitutionSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  siglas: z.string().optional(),
  slug: z
    .string()
    .min(1, 'El slug es obligatorio')
    .regex(/^[a-z0-9-]+$/, 'El slug solo admite minúsculas, números y guiones'),
  commissionType: InstitutionCommissionTypeSchema.default('PERCENTAGE'),
  commissionValue: z.number().default(0),
  status: InstitutionStatusSchema.default('ACTIVE'),
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

function serializeInstitution(institution: {
  id: string;
  name: string;
  siglas?: string | null;
  slug: string;
  commissionType: string;
  commissionValue: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...institution,
    createdAt: institution.createdAt.toISOString(),
    updatedAt: institution.updatedAt.toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireInstitution(request);

    if (ctx.role !== 'SUPER_ADMIN') {
      return apiError('No autorizado', 403, 'Solo SUPER_ADMIN puede gestionar instituciones', 'FORBIDDEN');
    }

    const institutions = await prisma.club.findMany({
      orderBy: { name: 'asc' },
    });

    return apiSuccess({ data: institutions.map(serializeInstitution) });
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }
    return apiDbError(error, 'Error al listar las instituciones');
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireInstitution(request);

    if (ctx.role !== 'SUPER_ADMIN') {
      return apiError('No autorizado', 403, 'Solo SUPER_ADMIN puede gestionar instituciones', 'FORBIDDEN');
    }

    const body = await request.json();
    const parsed = CreateInstitutionSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        'Datos inválidos',
        400,
        parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        'VALIDATION_ERROR'
      );
    }

    const { commissionType, commissionValue } = parsed.data;
    const validationError = validateCommission(commissionType, commissionValue);
    if (validationError) {
      return apiError(validationError, 400, 'Validación de comisión', 'VALIDATION_ERROR');
    }

    const existing = await prisma.club.findUnique({
      where: { slug: parsed.data.slug },
    });

    if (existing) {
      return apiError(
        'Ya existe una institución con ese slug',
        409,
        'Slug duplicado',
        'DUPLICATE_SLUG'
      );
    }

    const institution = await prisma.club.create({
      data: {
        name: parsed.data.name,
        siglas: parsed.data.siglas,
        slug: parsed.data.slug,
        commissionType,
        commissionValue,
        status: parsed.data.status,
      },
    });

    return apiSuccess(serializeInstitution(institution));
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }
    return apiDbError(error, 'Error al crear la institución');
  }
}
