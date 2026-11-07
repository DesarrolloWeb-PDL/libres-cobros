import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { requireInstitution, institutionWhere, AuthError } from '@/lib/access';
import { checkTierAlert } from '@/lib/saas-billing';
import { CreateMemberSchema } from '@/types/member';
import { z } from 'zod';

const BulkMemberStatusSchema = z.object({
  memberIds: z.array(z.string().cuid()).min(1).optional(),
  ids: z.array(z.string().cuid()).min(1).optional(),
  action: z.enum(['activate', 'deactivate']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
}).refine((d) => (d.memberIds || d.ids) && (d.action || d.status), { message: 'memberIds/ids and action/status required' });

function serializeMember(member: {
  id: string;
  dni: string;
  cuit: string | null;
  ivaCondicion: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  category: string;
  planId: string | null;
  status: string;
  joinDate: Date;
  notes: string | null;
  plan?: { name: string } | null;
}) {
  return {
    ...member,
    planName: member.plan?.name ?? null,
    joinDate: member.joinDate.toISOString(),
  };
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireInstitution(request);

    if (!ctx.institutionId) {
      return apiError(
        'Seleccione una institución',
        400,
        'Se requiere una institución para crear el socio',
        'INSTITUTION_REQUIRED'
      );
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

    const { email, planId, cuit, ...data } = parsed.data;
    const normalizedEmail = email && email.trim() !== '' ? email.trim() : null;
    const normalizedCuit = cuit && cuit.trim() !== '' ? cuit.trim() : null;

    if (planId) {
      const plan = await prisma.plan.findFirst({
        where: { id: planId, clubId: ctx.institutionId },
      });
      if (!plan) {
        return apiError('Plan no encontrado', 400, 'El plan seleccionado no existe', 'INVALID_PLAN');
      }
    }

    const existingDni = await prisma.member.findUnique({
      where: { clubId_dni: { clubId: ctx.institutionId, dni: data.dni } },
    });

    if (existingDni) {
      return apiError('Ya existe un socio con ese DNI', 409, 'DNI duplicado', 'DUPLICATE_DNI');
    }

    if (normalizedEmail) {
      const existingEmail = await prisma.member.findUnique({
        where: { clubId_email: { clubId: ctx.institutionId, email: normalizedEmail } },
      });

      if (existingEmail) {
        return apiError('Ya existe un socio con ese email', 409, 'Email duplicado', 'DUPLICATE_EMAIL');
      }
    }

    const member = await prisma.member.create({
      data: {
        ...data,
        email: normalizedEmail,
        cuit: normalizedCuit,
        clubId: ctx.institutionId,
        ...(planId && { planId }),
      },
      include: { plan: { select: { name: true } } },
    });

    const memberCount = await prisma.member.count({ where: { clubId: ctx.institutionId } });
    await checkTierAlert(ctx.institutionId, memberCount, member.id);

    return apiSuccess(serializeMember(member));
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }
    return apiDbError(error, 'Error al crear el socio');
  }
}

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireInstitution(request);

    const { searchParams } = request.nextUrl;

    const search = searchParams.get('search')?.trim();
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const planId = searchParams.get('planId');
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));

    const where: Record<string, unknown> = {
      ...institutionWhere(ctx.institutionId),
    };

    if (category && ['ADULT', 'FAMILY', 'MINOR'].includes(category)) {
      where.category = category;
    }

    if (status && ['ACTIVE', 'INACTIVE', 'PENDING'].includes(status)) {
      where.status = status;
    }

    if (planId) {
      where.planId = planId;
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
        include: { plan: { select: { name: true } } },
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
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }
    return apiDbError(error, 'Error al listar socios');
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const ctx = await requireInstitution(request);
    const body = await request.json();
    const parsed = BulkMemberStatusSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('Datos inválidos', 400, parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '), 'VALIDATION_ERROR');
    }
    const ids = parsed.data.memberIds ?? parsed.data.ids ?? [];
    let status: 'ACTIVE' | 'INACTIVE';
    if (parsed.data.status) {
      status = parsed.data.status;
    } else {
      status = parsed.data.action === 'activate' ? 'ACTIVE' : 'INACTIVE';
    }

    const result = await prisma.member.updateMany({
      where: { id: { in: ids }, ...institutionWhere(ctx.institutionId) },
      data: { status },
    });

    return apiSuccess({ updated: result.count, status });
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }
    return apiDbError(error, 'Error al actualizar los socios');
  }
}
