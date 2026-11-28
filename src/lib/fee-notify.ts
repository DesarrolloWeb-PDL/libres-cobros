import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { sendWhatsAppMessage, normalizePhoneForWhatsApp } from '@/lib/whatsapp';
import { getInstitutionSiteConfigValues } from '@/lib/site-config';

/**
 * Auto-notify (spec S3): tells members their new fee was generated.
 *
 * Uses the institution's PRIMARY channel with the same precedence as the
 * reminder pipeline (WhatsApp > Email) and the SAME WhatsApp template and
 * parameter order as reminders, so an institution's approved Meta template
 * fits both messages. Skips gracefully when no channel is configured or the
 * member has no contact data for the channel. Every attempt is logged in
 * smsLog with type `fee_generated`.
 */

const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

interface NotifyNewFeesParams {
  clubId: string;
  memberIds: string[];
  month: number;
  year: number;
}

export interface NotifyNewFeesResult {
  sent: number;
  skipped: number;
  failed: number;
}

function buildFeeEmailHtml(
  firstName: string,
  monthName: string,
  amount: string,
  dueDate: string,
  paymentUrl: string
): string {
  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:24px;background:#f4f4f7;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px;">
      <h1 style="margin:0 0 12px;font-size:20px;color:#111827;">Hola ${firstName}, ya está tu cuota.</h1>
      <p style="margin:0 0 6px;font-size:15px;color:#374151;">
        Cuota de <strong>${monthName}</strong> por <strong>${amount}</strong>.
      </p>
      <p style="margin:0 0 20px;font-size:15px;color:#374151;">
        Vence el <strong>${dueDate}</strong>.
      </p>
      <p style="margin:0 0 24px;">
        <a href="${paymentUrl}"
           style="display:inline-block;background:#582694;color:#ffffff;text-decoration:none;
                  padding:12px 20px;border-radius:8px;font-size:15px;font-weight:bold;">
          Pagar acá
        </a>
      </p>
      <p style="margin:0;font-size:12px;color:#9ca3af;">
        Este es un aviso automático de tu institución.
      </p>
    </div>
  </body>
</html>`;
}

export async function notifyNewFees({
  clubId,
  memberIds,
  month,
  year,
}: NotifyNewFeesParams): Promise<NotifyNewFeesResult> {
  if (memberIds.length === 0) {
    return { sent: 0, skipped: 0, failed: 0 };
  }

  const config = await getInstitutionSiteConfigValues(clubId, [
    'resend_api_key',
    'resend_from_email',
    'whatsapp_phone_number_id',
    'whatsapp_access_token',
    'whatsapp_template_name',
    'whatsapp_template_language',
    'next_public_url',
  ]);

  const whatsappConfigured = !!(config.whatsapp_phone_number_id && config.whatsapp_access_token);
  const emailConfigured = !!(config.resend_api_key && config.resend_from_email);
  const channel = whatsappConfigured ? 'whatsapp' : emailConfigured ? 'email' : null;

  // No channel configured yet: nothing to send (documented gap, not an error).
  if (!channel) {
    return { sent: 0, skipped: memberIds.length, failed: 0 };
  }

  const [fees, members, club] = await Promise.all([
    prisma.fee.findMany({
      where: { clubId, month, year, memberId: { in: memberIds } },
      select: { memberId: true, amount: true, dueDate: true },
    }),
    prisma.member.findMany({
      where: { id: { in: memberIds }, clubId },
      select: { id: true, firstName: true, email: true, phone: true, dni: true },
    }),
    prisma.club.findUnique({
      where: { id: clubId },
      select: { slug: true },
    }),
  ]);

  const feeByMember = new Map(fees.map((fee) => [fee.memberId, fee]));
  const nextPublicUrl = config.next_public_url || process.env.NEXT_PUBLIC_URL || '';
  const monthName = MONTH_NAMES[month - 1] ?? String(month);

  const result: NotifyNewFeesResult = { sent: 0, skipped: 0, failed: 0 };

  for (const member of members) {
    const fee = feeByMember.get(member.id);
    if (!fee) {
      result.skipped += 1;
      continue;
    }

    const amount = fee.amount.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
    const dueDate = fee.dueDate.toLocaleDateString('es-AR');
    const paymentUrl = club
      ? `${nextPublicUrl}/pagos/${club.slug}?dni=${member.dni}`
      : nextPublicUrl;
    const body = `Hola ${member.firstName}, ya está tu cuota de ${monthName} por ${amount}, vence el ${dueDate}. Pagá acá: ${paymentUrl}`;

    try {
      let externalId: string | null = null;

      if (channel === 'email') {
        if (!member.email) {
          result.skipped += 1;
          continue;
        }
        const response = await sendEmail(
          config.resend_api_key!,
          config.resend_from_email!,
          member.email,
          `Tu cuota de ${monthName} está disponible`,
          buildFeeEmailHtml(member.firstName, monthName, amount, dueDate, paymentUrl)
        );
        externalId = response.externalId;
      } else {
        if (!member.phone) {
          result.skipped += 1;
          continue;
        }
        const template = config.whatsapp_template_name
          ? {
              name: config.whatsapp_template_name,
              language: config.whatsapp_template_language || 'es_AR',
              // Same parameter order as reminders so the approved template fits.
              parameters: [member.firstName, amount, dueDate, paymentUrl],
            }
          : undefined;
        const response = await sendWhatsAppMessage(
          config.whatsapp_phone_number_id!,
          config.whatsapp_access_token!,
          normalizePhoneForWhatsApp(member.phone),
          body,
          template
        );
        externalId = response.externalId;
      }

      await prisma.smsLog.create({
        data: {
          clubId,
          memberId: member.id,
          type: 'fee_generated',
          message: body,
          status: 'SENT',
          externalId,
          error: null,
        },
      });
      result.sent += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await prisma.smsLog
        .create({
          data: {
            clubId,
            memberId: member.id,
            type: 'fee_generated',
            message: '',
            status: 'FAILED',
            externalId: null,
            error: message,
          },
        })
        .catch(() => {
          /* logging must never break the notify loop */
        });
      result.failed += 1;
    }
  }

  return result;
}
