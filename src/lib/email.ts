import { Resend } from 'resend';
import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';

export type EmailMessageStatus = 'SENT' | 'FAILED' | 'SKIPPED';

export interface EmailBulkResult {
  sent: number;
  failed: number;
  skipped: number;
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
 * Envía un email vía Resend
 * Documentación: https://resend.com/docs
 */
export async function sendEmail(
  apiKey: string,
  fromEmail: string,
  toEmail: string,
  subject: string,
  htmlBody: string
): Promise<{ externalId: string | null }> {
  // Validar credenciales antes de enviar
  if (!apiKey || !fromEmail) {
    throw new Error(
      'Configuración de email incompleta. Verificá API Key y Email remitente en Configuración del club.'
    );
  }

  const resend = new Resend(apiKey);

  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to: [toEmail],
    subject,
    html: htmlBody,
  });

  if (error) {
    // Errores comunes de Resend
    if (error.name === 'invalid_api_key' || error.name === 'missing_api_key') {
      throw new Error('API Key de Resend inválida. Verificá la configuración en Configuración del club.');
    }
    if (error.name === 'validation_error' || error.name === 'invalid_from_address') {
      throw new Error('Email remitente inválido. Verificá el Email remitente en Configuración del club.');
    }
    if (error.name === 'rate_limit_exceeded') {
      throw new Error('Límite de envíos de Resend alcanzado. Intentá más tarde.');
    }

    throw new Error(`Error de Resend: ${error.message}`);
  }

  // Resend returns the message ID in data.id
  const externalId = data?.id ?? null;

  return { externalId };
}

/**
 * Construye el HTML del recordatorio de pago (inline styles, compatible con clientes de email)
 */
function buildReminderEmailHtml(
  firstName: string,
  amount: string,
  dueDate: string,
  paymentUrl: string
): string {
  return `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; background-color: #111827; border-radius: 12px; overflow: hidden;">
      <div style="padding: 32px;">
        <h1 style="color: #f9fafb; font-size: 20px; font-weight: 600; margin: 0 0 16px;">Hola ${firstName}, recordatorio de pago.</h1>
        <p style="color: #d1d5db; font-size: 15px; margin: 0 0 4px;">Cuota: ${amount} - Vencimiento: ${dueDate}.</p>
        <p style="color: #d1d5db; font-size: 15px; margin: 0 0 24px;">Paga acá:</p>
        <a href="${paymentUrl}" style="display: inline-block; padding: 12px 24px; background-color: #7c3aed; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">Pagar ahora</a>
      </div>
      <div style="padding: 0 32px 24px;">
        <p style="color: #6b7280; font-size: 12px; margin: 0;">Este es un recordatorio automático de pago de tu institución.</p>
      </div>
    </div>
  `;
}

/**
 * Envía recordatorios de pago vía email a socios con cuotas pendientes
 */
export async function sendEmailReminder(memberId: string): Promise<EmailBulkResult> {
  const result: EmailBulkResult = { sent: 0, failed: 0, skipped: 0 };

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

    if (!member.email || member.email.trim() === '') {
      result.failed += 1;
      await prisma.smsLog.create({
        data: {
          clubId: member.clubId,
          memberId: member.id,
          type: 'MISSING_EMAIL',
          message: '',
          status: 'FAILED',
          error: 'Member has no email address',
        },
      });
      return result;
    }

    if (member.fees.length === 0) {
      result.skipped += 1;
      return result;
    }

    // Obtener configuración de Resend
    const [apiKey, fromEmail, nextPublicUrl] = await Promise.all([
      getSiteConfig(prisma, clubId, 'resend_api_key'),
      getSiteConfig(prisma, clubId, 'resend_from_email'),
      getSiteConfig(prisma, clubId, 'next_public_url', process.env.NEXT_PUBLIC_URL || ''),
    ]);

    if (!apiKey || !fromEmail) {
      result.skipped += 1;
      return result;
    }

    const fee = member.fees[0];
    const amount = fee.amount.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
    const dueDate = fee.dueDate.toLocaleDateString('es-AR');
    const club = await prisma.club.findUnique({ where: { id: clubId }, select: { slug: true } });
    const paymentUrl = `${nextPublicUrl}/pagos/${club?.slug}?dni=${member.dni}`;

    const subject = 'Recordatorio de pago';
    const messageBody = [
      `Hola ${member.firstName}, recordatorio de pago.`,
      `Cuota: ${amount} - Vencimiento: ${dueDate}.`,
      `Paga acá: ${paymentUrl}`,
    ].join('\n');

    const htmlBody = buildReminderEmailHtml(member.firstName, amount, dueDate, paymentUrl);

    const { externalId } = await sendEmail(apiKey, fromEmail, member.email, subject, htmlBody);

    // Log exitoso
    await prisma.smsLog.create({
      data: {
        clubId,
        memberId,
        type: 'payment_reminder_email',
        message: messageBody,
        status: 'SENT',
        externalId,
        error: null,
      },
    });

    result.sent += 1;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: { clubId: true },
    });
    const logClubId = member?.clubId ?? '';
    if (logClubId) {
      await prisma.smsLog.create({
        data: {
          clubId: logClubId,
          memberId,
          type: 'payment_reminder_email',
          message: '',
          status: 'FAILED',
          externalId: null,
          error: message,
        },
      });
    }
    result.failed += 1;
  }

  return result;
}

/**
 * Envía recordatorios de pago vía email a múltiples socios
 */
export async function sendBulkEmailReminders(
  memberIds: string[],
  batchSize = 50
): Promise<EmailBulkResult> {
  const result: EmailBulkResult = { sent: 0, failed: 0, skipped: 0 };

  for (let i = 0; i < memberIds.length; i += batchSize) {
    const batch = memberIds.slice(i, i + batchSize);

    const batchResults = await Promise.all(
      batch.map((id) => sendEmailReminder(id).catch(() => ({
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

    // Rate limiting: esperar entre batches
    if (i + batchSize < memberIds.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return result;
}

/**
 * Verifica si Resend (email) está configurado para un club
 */
export async function isEmailConfigured(clubId: string): Promise<boolean> {
  const apiKey = await getSiteConfig(prisma, clubId, 'resend_api_key');
  return !!apiKey;
}
