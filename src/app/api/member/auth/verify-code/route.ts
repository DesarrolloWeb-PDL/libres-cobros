import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { apiError, apiDbError } from '@/lib/api-response';
import { getEffectiveClub } from '@/lib/access';
import { rateLimit } from '@/lib/rate-limit';
import {
  verifyLoginCode,
  issueSessionCookie,
  SESSION_COOKIE_NAME,
  SESSION_TTL_DAYS,
} from '@/lib/member-auth';
import { z } from 'zod';

const VerifyCodeSchema = z.object({
  dni: z.string().min(1, 'El DNI es obligatorio'),
  clubSlug: z.string().min(1, 'La institución es obligatoria'),
  code: z.string().min(1, 'El código es obligatorio'),
});

const VERIFY_ERROR_MESSAGES: Record<string, string> = {
  invalid_code: 'El código es incorrecto.',
  expired: 'El código expiró. Pedí uno nuevo.',
  consumed: 'Ese código ya fue usado. Pedí uno nuevo.',
  too_many_attempts: 'Demasiados intentos. Pedí un código nuevo.',
  no_pending_code: 'No hay un código pendiente. Pedí uno nuevo.',
};

export async function POST(request: NextRequest) {
  try {
    // Stricter than request-code: brute-force protection per IP.
    const limited = rateLimit(request, { windowMs: 60_000, maxRequests: 10 });
    if (!limited.success) {
      return apiError(
        'Demasiados intentos. Esperá un minuto y probá de nuevo.',
        429,
        'Too many verification attempts',
        'RATE_LIMITED'
      );
    }

    const body = await request.json();
    const parsed = VerifyCodeSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        'Datos inválidos',
        400,
        parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        'VALIDATION_ERROR'
      );
    }

    const { dni, clubSlug, code } = parsed.data;

    const club = await getEffectiveClub(clubSlug);
    if (!club) {
      return apiError('Institución no encontrada', 404, 'Institution slug inválido o inactivo', 'INSTITUTION_NOT_FOUND');
    }

    const member = await prisma.member.findUnique({
      where: { clubId_dni: { clubId: club.id, dni } },
    });

    if (!member) {
      // Same shape as a failed code so the endpoint cannot enumerate DNIs.
      return apiError('El código es incorrecto.', 401, 'Unknown member', 'INVALID_CODE');
    }

    const result = await verifyLoginCode(club.id, member.id, code);

    if (!result.ok) {
      const message = VERIFY_ERROR_MESSAGES[result.reason] ?? 'El código es incorrecto.';
      const status = result.reason === 'too_many_attempts' ? 429 : 401;
      return apiError(message, status, result.reason, 'INVALID_CODE');
    }

    const maxAge = SESSION_TTL_DAYS * 24 * 60 * 60;
    return NextResponse.json(
      { ok: true, message: 'Acceso verificado.' },
      {
        headers: {
          'Set-Cookie': `${SESSION_COOKIE_NAME}=${issueSessionCookie(
            club.id,
            member.id
          )}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`,
        },
      }
    );
  } catch (error) {
    return apiDbError(error, 'Error al verificar el código de acceso');
  }
}
