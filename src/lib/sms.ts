import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import { sendWhatsAppMessage, sendWhatsAppBulkReminders } from '@/lib/whatsapp';
import { sendEmailReminder } from '@/lib/email';

export type SmsMessageStatus = 'SENT' | 'FAILED' | 'SKIPPED';
export type MessageChannel = 'whatsapp' | 'email';

export interface BulkResult {
  sent: number;
  failed: number;
  skipped: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');

  if (digits.startsWith('54')) {
    return `+${digits}`;
  }

  if (digits.startsWith('0')) {
    return `+54${digits.slice(1)}`;
  }

  return `+54${digits}`;
}

async function getSiteConfig(
  tx: Prisma.TransactionClient | typeof prisma,
  clubId: string,
  key: string,
  defaultValue = ''
): Promise<string> {
  const config = await tx.siteConfig.findUnique({
    where: { clubId_key: { clubId, key } },
  });
  return config?.value ?? defaultValue;
}

/**
 * Detecta el canal de mensajería configurado para una institución.
 * Prioridad: WhatsApp > Email (si hay ambos configurados, usa WhatsApp)
 */
export async function getConfiguredChannel(clubId: string): Promise<MessageChannel> {
  const [whatsappPhoneId, whatsappToken, resendApiKey] = await Promise.all([
    getSiteConfig(prisma, clubId, 'whatsapp_phone_number_id'),
    getSiteConfig(prisma, clubId, 'whatsapp_access_token'),
    getSiteConfig(prisma, clubId, 'resend_api_key'),
  ]);

  // Si WhatsApp está configurado, usarlo (es gratis y más efectivo)
  if (whatsappPhoneId && whatsappToken) {
    return 'whatsapp';
  }

  // Si Resend está configurado, usar email
  if (resendApiKey) {
    return 'email';
  }

  // Default a WhatsApp (el usuario debería configurar uno)
  return 'whatsapp';
}

/**
 * Envía un mensaje usando el canal configurado (solo WhatsApp).
 * Para email, usar sendEmail directamente (usa un campo de destinatario distinto).
 */
export async function sendMessage(
  clubId: string,
  toNumber: string,
  body: string
): Promise<{ externalId: string | null; channel: MessageChannel }> {
  const channel = await getConfiguredChannel(clubId);

  if (channel === 'email') {
    throw new Error(
      'El canal de mensajería configurado es email. Usá sendEmail directamente.'
    );
  }

  const [phoneNumberId, accessToken] = await Promise.all([
    getSiteConfig(prisma, clubId, 'whatsapp_phone_number_id'),
    getSiteConfig(prisma, clubId, 'whatsapp_access_token'),
  ]);

  if (!phoneNumberId || !accessToken) {
    throw new Error(
      'Configuración de WhatsApp incompleta. Verificá Phone Number ID y Access Token en Configuración de la institución.'
    );
  }

  const { externalId } = await sendWhatsAppMessage(phoneNumberId, accessToken, toNumber, body);
  return { externalId, channel: 'whatsapp' };
}

async function logAttempt(
  clubId: string,
  memberId: string,
  type: string,
  status: SmsMessageStatus,
  message: string,
  externalId?: string | null,
  error?: string
) {
  await prisma.smsLog.create({
    data: {
      clubId,
      memberId,
      type,
      message,
      status,
      externalId: externalId ?? null,
      error: error ?? null,
    },
  });
}

async function sendReminder(memberId: string): Promise<BulkResult> {
  const result: BulkResult = { sent: 0, failed: 0, skipped: 0 };

  try {
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      include: {
        fees: {
          where: {
            status: { in: ['PENDING', 'OVERDUE'] },
          },
          orderBy: { dueDate: 'asc' },
          take: 1,
        },
      },
    });

    if (!member) {
      result.skipped += 1;
      return result;
    }

    const { clubId } = member;

    // Si el canal configurado es email, delegar al módulo de email
    const channel = await getConfiguredChannel(clubId);
    if (channel === 'email') {
      const emailResult = await sendEmailReminder(memberId);
      result.sent += emailResult.sent;
      result.failed += emailResult.failed;
      result.skipped += emailResult.skipped;
      return result;
    }

    if (!member.phone || member.phone.trim() === '') {
      await logAttempt(clubId, memberId, 'payment_reminder', 'FAILED', '', undefined, 'Socio sin teléfono');
      result.skipped += 1;
      return result;
    }

    if (member.fees.length === 0) {
      await logAttempt(clubId, memberId, 'payment_reminder', 'SKIPPED', '', undefined, 'Sin cuotas pendientes');
      result.skipped += 1;
      return result;
    }

    const nextPublicUrl = await getSiteConfig(
      prisma,
      clubId,
      'next_public_url',
      process.env.NEXT_PUBLIC_URL || ''
    );

    const fee = member.fees[0];
    const amount = fee.amount.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
    const dueDate = fee.dueDate.toLocaleDateString('es-AR');
    const club = await prisma.club.findUnique({ where: { id: clubId }, select: { slug: true } });
    const paymentUrl = `${nextPublicUrl}/pagos/${club?.slug}?dni=${member.dni}`;

    const messageBody = [
      `Hola ${member.firstName}, recordatorio de pago.`,
      `Cuota: ${amount} - Vencimiento: ${dueDate}.`,
      `Paga acá: ${paymentUrl}`,
    ].join('\n');

    // El canal email ya se resolvió arriba; acá solo puede ser WhatsApp
    const { externalId } = await sendMessage(clubId, member.phone, messageBody);

    await logAttempt(
      clubId,
      memberId,
      `payment_reminder_${channel}`,
      'SENT',
      messageBody,
      externalId
    );
    result.sent += 1;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: { clubId: true },
    });
    const logClubId = member?.clubId ?? '';
    if (logClubId) {
      await logAttempt(logClubId, memberId, 'payment_reminder', 'FAILED', '', undefined, message);
    }
    result.failed += 1;
  }

  return result;
}

export async function sendBulkReminders(
  memberIds: string[],
  batchSize = 50
): Promise<BulkResult> {
  const result: BulkResult = { sent: 0, failed: 0, skipped: 0 };

  for (let i = 0; i < memberIds.length; i += batchSize) {
    const batch = memberIds.slice(i, i + batchSize);

    const batchResults = await Promise.all(
      batch.map((id) => sendReminder(id).catch(() => ({
        sent: 0,
        failed: 1,
        skipped: 0,
      })))
    );

    batchResults.forEach((r) => {
      result.sent += r.sent;
      result.failed += r.failed;
      result.skipped += r.skipped;
    });

    if (i + batchSize < memberIds.length) {
      await sleep(1000);
    }
  }

  return result;
}

/**
 * Re-exportar funciones de WhatsApp para uso directo
 */
export { sendWhatsAppBulkReminders };
