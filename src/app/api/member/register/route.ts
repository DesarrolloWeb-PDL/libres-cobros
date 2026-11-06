import { NextRequest } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { getEffectiveClub } from '@/lib/access';
import { rateLimit } from '@/lib/rate-limit';
import { notifyPendingMemberRegistration } from '@/lib/member-registration-notify';
import { MemberCategorySchema } from '@/types/member';

// Member self-registration for the PWA/portal. Scoped to a single institution by
// slug; creates a Member in PENDING state (awaiting admin approval) and never
// grants admin privileges. `Member.status` already exists, so 'PENDING' reuses
// that field instead of inventing a new one (see types/member.ts).
const MemberSelfRegistrationSchema = z
  .object({
    dni: z.string().min(1, 'El DNI es obligatorio').regex(/^\d+$/, 'El DNI debe ser numérico'),
    firstName: z.string().min(1, 'El nombre es obligatorio').optional(),
    lastName: z.string().min(1, 'El apellido es obligatorio').optional(),
    name: z.string().min(1, 'El nombre es obligatorio').optional(),
    email: z.string().email('El email no es válido').optional().or(z.literal('')),
    phone: z.string().optional(),
    category: MemberCategorySchema.optional(),
    planId: z.string().cuid().optional(),
    clubSlug: z.string().min(1).optional(),
    institutionSlug: z.string().min(1).optional(),
    slug: z.string().min(1).optional(),
    institution: z.string().min(1).optional(),
    club: z.string().min(1).optional(),
  })
  .refine((data) => Boolean((data.firstName && data.lastName) || data.name), {
    message: 'El nombre y apellido son obligatorios',
    path: ['firstName'],
  })
  .refine(
    (data) =>
      Boolean(
        data.clubSlug || data.institutionSlug || data.slug || data.institution || data.club
      ),
    {
      message: 'La institución es obligatoria',
      path: ['clubSlug'],
    }
  );

export async function POST(request: NextRequest) {
  const limit = rateLimit(request, { windowMs: 60_000, maxRequests: 100 });
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
    const parsed = MemberSelfRegistrationSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        'Datos inválidos',
        400,
        parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        'VALIDATION_ERROR'
      );
    }

    const data = parsed.data;
    const slug =
      data.clubSlug ?? data.institutionSlug ?? data.slug ?? data.institution ?? data.club ?? '';

    let firstName = data.firstName?.trim();
    let lastName = data.lastName?.trim();
    if (!firstName || !lastName) {
      const parts = (data.name ?? '').trim().split(/\s+/);
      if (!firstName) firstName = parts[0] ?? '';
      if (!lastName) lastName = parts.slice(1).join(' ');
    }

    if (!firstName || !lastName) {
      return apiError(
        'Datos inválidos',
        400,
        'firstName: El nombre es obligatorio; lastName: El apellido es obligatorio',
        'VALIDATION_ERROR'
      );
    }

    const club = await getEffectiveClub(slug);
    if (!club) {
      return apiError(
        'Institución no encontrada',
        404,
        'Institution slug inválido o inactivo',
        'INSTITUTION_NOT_FOUND'
      );
    }

    const normalizedEmail =
      data.email && data.email.trim() !== '' ? data.email.trim() : null;
    const normalizedPhone =
      data.phone && data.phone.trim() !== '' ? data.phone.trim() : null;

    if (data.planId) {
      const plan = await prisma.plan.findFirst({
        where: { id: data.planId, clubId: club.id },
      });
      if (!plan) {
        return apiError('Plan no encontrado', 400, 'El plan seleccionado no existe', 'INVALID_PLAN');
      }
    }

    const existingDni = await prisma.member.findUnique({
      where: { clubId_dni: { clubId: club.id, dni: data.dni } },
    });
    if (existingDni) {
      return apiError('Ya existe un socio con ese DNI', 409, 'DNI duplicado', 'DUPLICATE_DNI');
    }

    if (normalizedEmail) {
      const existingEmail = await prisma.member.findUnique({
        where: { clubId_email: { clubId: club.id, email: normalizedEmail } },
      });
      if (existingEmail) {
        return apiError('Ya existe un socio con ese email', 409, 'Email duplicado', 'DUPLICATE_EMAIL');
      }
    }

    const member = await prisma.member.create({
      data: {
        dni: data.dni,
        firstName,
        lastName,
        email: normalizedEmail,
        phone: normalizedPhone,
        category: data.category ?? 'ADULT',
        clubId: club.id,
        status: 'PENDING',
        ...(data.planId && { planId: data.planId }),
      },
    });

    // Notify the institution's admin users of the new pending registration.
    // Best-effort: never blocks the registration response.
    await notifyPendingMemberRegistration(club.id, {
      id: member.id,
      firstName: member.firstName,
      lastName: member.lastName,
      dni: member.dni,
      email: member.email,
      phone: member.phone,
    }).catch(() => undefined);

    return apiSuccess({
      id: member.id,
      dni: member.dni,
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email,
      phone: member.phone,
      category: member.category,
      status: member.status,
      clubId: member.clubId,
      joinDate: member.joinDate.toISOString(),
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const target = Array.isArray(error.meta?.target)
          ? error.meta.target.join(', ')
          : '';
        if (target.includes('dni')) {
          return apiError('Ya existe un socio con ese DNI', 409, 'DNI duplicado', 'DUPLICATE_DNI');
        }
        if (target.includes('email')) {
          return apiError('Ya existe un socio con ese email', 409, 'Email duplicado', 'DUPLICATE_EMAIL');
        }
      }
    }
    return apiDbError(error, 'Error al registrar el socio');
  }
}