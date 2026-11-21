import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { apiError, apiDbError } from '@/lib/api-response';
import { getEffectiveClub } from '@/lib/access';
import { getClubSiteConfigValue } from '@/lib/site-config';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { sendEmail } from '@/lib/email';
import { rateLimit } from '@/lib/rate-limit';
import {
  createLoginCode,
  getSessionFromRequest,
  issueSessionCookie,
  SESSION_COOKIE_NAME,
  SESSION_TTL_DAYS,
} from '@/lib/member-auth';
import { z } from 'zod';

const RequestCodeSchema = z.object({
  dni: z.string().min(1, 'El DNI es obligatorio'),
  clubSlug: z.string().min(1, 'La institución es obligatoria'),
});

/** Identical response whether or not the DNI exists (anti-enumeration). */
const GENERIC_MESSAGE = 'Si el DNI corresponde a un socio, recibirás un código.';

/** Shown while an institutional test code is configured (portal_otp_test_code). */
const TEST_MODE_MESSAGE = 'Modo de prueba activo: ingresá el código de prueba.';

function withSessionCookie(data: unknown, clubId: string, memberId: string): NextResponse {
  const maxAge = SESSION_TTL_DAYS * 24 * 60 * 60;
  return NextResponse.json(data, {
    headers: {
      'Set-Cookie': `${SESSION_COOKIE_NAME}=${issueSessionCookie(
        clubId,
        memberId
      )}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const limited = rateLimit(request, { windowMs: 60_000, maxRequests: 5 });
    if (!limited.success) {
      return apiError(
        'Demasiados intentos. Esperá un minuto y probá de nuevo.',
        429,
        'Too many code requests',
        'RATE_LIMITED'
      );
    }

    const body = await request.json();
    const parsed = RequestCodeSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        'Datos inválidos',
        400,
        parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        'VALIDATION_ERROR'
      );
    }

    const { dni, clubSlug } = parsed.data;

    const club = await getEffectiveClub(clubSlug);
    if (!club) {
      return apiError('Institución no encontrada', 404, 'Institution slug inválido o inactivo', 'INSTITUTION_NOT_FOUND');
    }

    const member = await prisma.member.findUnique({
      where: { clubId_dni: { clubId: club.id, dni } },
    });

    // Resolve channel configuration for this institution.
    const [otpEnabled, testCode, waPhoneId, waToken, waTemplate, waLanguage, resendKey, resendFrom] =
      await Promise.all([
        getClubSiteConfigValue(club.id, 'portal_otp_enabled'),
        getClubSiteConfigValue(club.id, 'portal_otp_test_code'),
        getClubSiteConfigValue(club.id, 'whatsapp_phone_number_id'),
        getClubSiteConfigValue(club.id, 'whatsapp_access_token'),
        getClubSiteConfigValue(club.id, 'whatsapp_otp_template_name'),
        getClubSiteConfigValue(club.id, 'whatsapp_template_language', 'es_AR'),
        getClubSiteConfigValue(club.id, 'resend_api_key'),
        getClubSiteConfigValue(club.id, 'resend_from_email'),
      ]);

    const whatsappConfigured = Boolean(waPhoneId && waToken);
    const emailConfigured = Boolean(resendKey && resendFrom);

    const bypassResponse = () =>
      member
        ? withSessionCookie({ otpRequired: false, message: GENERIC_MESSAGE }, club.id, member.id)
        : NextResponse.json({ otpRequired: false, message: GENERIC_MESSAGE });

    // Kill switch: institution opted out of OTP entirely (wins over test mode).
    if (otpEnabled === 'false') {
      return bypassResponse();
    }

    // Test mode: while a fixed test code is configured the portal always asks
    // for a code — even with no channels configured — so the full flow can be
    // exercised without WhatsApp/email. Same response for known and unknown
    // DNIs, so anti-enumeration still holds.
    if (testCode) {
      return NextResponse.json({ otpRequired: true, message: TEST_MODE_MESSAGE });
    }

    // Degrade to DNI-only access when the institution has no channel at all —
    // otherwise empty keys would lock every member out.
    if (!whatsappConfigured && !emailConfigured) {
      return bypassResponse();
    }

    // Anti-enumeration: identical success response when the member is unknown.
    if (!member) {
      return NextResponse.json({ otpRequired: true, message: GENERIC_MESSAGE });
    }

    // Already authenticated for this member (valid cookie): no new code needed.
    const existingSession = getSessionFromRequest(request);
    if (
      existingSession &&
      existingSession.clubId === club.id &&
      existingSession.memberId === member.id
    ) {
      return NextResponse.json({ otpRequired: false, message: GENERIC_MESSAGE });
    }

    if (!member.phone && !member.email) {
      return apiError(
        'Este socio no tiene teléfono ni email cargado. Comunicate con administración para actualizar tus datos.',
        400,
        'Member has neither phone nor email',
        'NO_REACHABLE_CHANNEL'
      );
    }

    const { code } = await createLoginCode(
      club.id,
      member.id,
      member.phone && whatsappConfigured ? 'whatsapp' : 'email'
    );
    const messageBody = `Tu código de acceso es ${code}. Válido por 10 minutos.`;

    const tryWhatsapp = async (): Promise<boolean> => {
      if (!member.phone || !whatsappConfigured) return false;
      try {
        // Approved OTP template when configured; free-form text otherwise
        // (only reaches members who messaged the club within the last 24h).
        await sendWhatsAppMessage(
          waPhoneId,
          waToken,
          member.phone,
          messageBody,
          waTemplate
            ? { name: waTemplate, language: waLanguage || 'es_AR', parameters: [code] }
            : undefined
        );
        return true;
      } catch (error) {
        console.error('[request-code] WhatsApp send failed:', error);
        return false;
      }
    };

    const tryEmail = async (): Promise<boolean> => {
      if (!member.email || !emailConfigured) return false;
      try {
        await sendEmail(resendKey, resendFrom, member.email, 'Tu código de acceso', messageBody);
        return true;
      } catch (error) {
        console.error('[request-code] Email send failed:', error);
        return false;
      }
    };

    // WhatsApp first (primary channel), email as fallback for unreachable numbers.
    const sent = (await tryWhatsapp()) || (await tryEmail());

    if (!sent) {
      // A channel is configured but every send failed: fail closed instead of
      // downgrading security on a transient outage.
      return apiError(
        'No pudimos enviar el código. Intentá de nuevo en unos minutos.',
        502,
        'All configured channels failed to send the code',
        'CHANNEL_SEND_FAILED'
      );
    }

    return NextResponse.json({ otpRequired: true, message: GENERIC_MESSAGE });
  } catch (error) {
    return apiDbError(error, 'Error al solicitar el código de acceso');
  }
}
