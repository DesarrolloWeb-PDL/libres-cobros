import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

export interface PendingMemberNotificationResult {
  emailsSent: number;
  whatsAppSent: number;
  errors: number;
}

export interface PendingMemberLike {
  id: string;
  firstName: string;
  lastName: string;
  dni: string;
  email: string | null;
  phone: string | null;
}

const CONFIG_KEYS = [
  'resend_api_key',
  'resend_from_email',
  'whatsapp_phone_number_id',
  'whatsapp_access_token',
  'next_public_url',
];

/**
 * Notifies the institution's admin users that a new member self-registered
 * and is awaiting approval. Reuses the existing email/WhatsApp helpers and
 * logs every attempt to SmsLog. Never throws: notification failures must not
 * break the registration flow.
 */
export async function notifyPendingMemberRegistration(
  clubId: string,
  member: PendingMemberLike,
  client: typeof prisma = prisma
): Promise<PendingMemberNotificationResult> {
  const result: PendingMemberNotificationResult = {
    emailsSent: 0,
    whatsAppSent: 0,
    errors: 0,
  };

  try {
    const [admins, club] = await Promise.all([
      client.adminUser.findMany({
        where: { clubId },
        select: { email: true, name: true },
      }),
      client.club.findUnique({
        where: { id: clubId },
        select: { name: true, phone: true },
      }),
    ]);

    const configRows = await client.siteConfig.findMany({
      where: { clubId, key: { in: CONFIG_KEYS } },
    });
    const config = Object.fromEntries(configRows.map((row) => [row.key, row.value]));

    const apiKey = config.resend_api_key ?? '';
    const fromEmail = config.resend_from_email ?? '';
    // Email channel: one message per admin user email.
    if (apiKey && fromEmail) {
      const recipients = Array.from(
        new Set(
          admins
            .map((admin) => admin.email)
            .filter((email): email is string => Boolean(email && email.trim() !== ''))
        )
      );

      if (recipients.length > 0) {
        const subject = 'Nueva solicitud de registro de socio';
        const htmlBody = `
          <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; background-color: #111827; border-radius: 12px; overflow: hidden; color: #f9fafb;">
            <div style="padding: 32px;">
              <h1 style="font-size: 20px; font-weight: 600; margin: 0 0 16px;">Nueva solicitud de registro</h1>
              <p style="color: #d1d5db; font-size: 15px; margin: 0 0 4px;">${escapeHtml(member.firstName)} ${escapeHtml(member.lastName)} solicita registrarse.</p>
              <p style="color: #d1d5db; font-size: 15px; margin: 0 0 4px;">DNI: ${escapeHtml(member.dni)}</p>
              ${member.email ? `<p style="color: #d1d5db; font-size: 15px; margin: 0 0 4px;">Email: ${escapeHtml(member.email)}</p>` : ''}
              ${member.phone ? `<p style="color: #d1d5db; font-size: 15px; margin: 0 0 4px;">Teléfono: ${escapeHtml(member.phone)}</p>` : ''}
              <p style="color: #d1d5db; font-size: 15px; margin: 16px 0 0;">Institución: ${escapeHtml(club?.name ?? '')}</p>
            </div>
            <div style="padding: 0 32px 24px;">
              <p style="color: #6b7280; font-size: 12px; margin: 0;">Ingresá al panel de administración para aprobar o rechazar la solicitud.</p>
            </div>
          </div>
        `;
        const messageBody = `Nueva solicitud de registro: ${member.firstName} ${member.lastName} (DNI ${member.dni}) en ${club?.name ?? ''}.`;

        for (const to of recipients) {
          try {
            const { externalId } = await sendEmail(apiKey, fromEmail, to, subject, htmlBody);
            await client.smsLog.create({
              data: {
                clubId,
                memberId: member.id,
                type: 'pending_member_registration_email',
                message: messageBody,
                status: 'SENT',
                externalId,
                error: null,
              },
            });
            result.emailsSent += 1;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            await client.smsLog
              .create({
                data: {
                  clubId,
                  memberId: member.id,
                  type: 'pending_member_registration_email',
                  message: messageBody,
                  status: 'FAILED',
                  externalId: null,
                  error: errorMessage,
                },
              })
              .catch(() => {
                // Logging is best-effort.
              });
            result.errors += 1;
          }
        }
      }
    }

    // WhatsApp channel: notify the institution's contact phone (if configured).
    const waPhoneId = config.whatsapp_phone_number_id ?? '';
    const waToken = config.whatsapp_access_token ?? '';
    if (waPhoneId && waToken && club?.phone) {
      const body = `Nueva solicitud de registro de socio: ${member.firstName} ${member.lastName} (DNI ${member.dni}) en ${club.name}. Ingresá al panel para aprobar o rechazar.`;
      try {
        const { externalId } = await sendWhatsAppMessage(waPhoneId, waToken, club.phone, body);
        await client.smsLog.create({
          data: {
            clubId,
            memberId: member.id,
            type: 'pending_member_registration_whatsapp',
            message: body,
            status: 'SENT',
            externalId,
            error: null,
          },
        });
        result.whatsAppSent += 1;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await client.smsLog
          .create({
            data: {
              clubId,
              memberId: member.id,
              type: 'pending_member_registration_whatsapp',
              message: body,
              status: 'FAILED',
              externalId: null,
              error: errorMessage,
            },
          })
          .catch(() => {
            // Logging is best-effort.
          });
        result.errors += 1;
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    try {
      await client.smsLog.create({
        data: {
          clubId,
          memberId: member.id,
          type: 'pending_member_registration',
          message: '',
          status: 'FAILED',
          externalId: null,
          error: errorMessage,
        },
      });
    } catch {
      // Logging is best-effort.
    }
    result.errors += 1;
  }

  return result;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Backward/alias names for compatibility with callers and tests.
export const notifyAdminsOfPendingMember = notifyPendingMemberRegistration;
export const notifyPendingRegistration = notifyPendingMemberRegistration;
export const notifyPendingMember = notifyPendingMemberRegistration;
export const notifyAdminOfPendingMember = notifyPendingMemberRegistration;