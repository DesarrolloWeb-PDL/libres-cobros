import twilio from 'twilio';
import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';

export type SmsMessageStatus = 'SENT' | 'FAILED' | 'SKIPPED';

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

export async function sendSms(
  accountSid: string,
  authToken: string,
  fromNumber: string,
  toNumber: string,
  body: string
): Promise<{ externalId: string | null }> {
  const client = twilio(accountSid, authToken);

  const message = await client.messages.create({
    body,
    from: fromNumber,
    to: normalizePhone(toNumber),
  });

  return { externalId: message.sid };
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

    const [accountSid, authToken, fromNumber, nextPublicUrl] = await Promise.all([
      getSiteConfig(prisma, clubId, 'twilio_account_sid'),
      getSiteConfig(prisma, clubId, 'twilio_auth_token'),
      getSiteConfig(prisma, clubId, 'twilio_phone_number'),
      getSiteConfig(prisma, clubId, 'next_public_url', process.env.NEXT_PUBLIC_URL || ''),
    ]);

    if (!accountSid || !authToken || !fromNumber) {
      await logAttempt(
        clubId,
        memberId,
        'payment_reminder',
        'SKIPPED',
        '',
        undefined,
        'Configuración de Twilio incompleta'
      );
      result.skipped += 1;
      return result;
    }

    const fee = member.fees[0];
    const amount = fee.amount.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
    const dueDate = fee.dueDate.toLocaleDateString('es-AR');
    const club = await prisma.club.findUnique({ where: { id: clubId }, select: { slug: true } });
    const paymentUrl = `${nextPublicUrl}/pagos/${club?.slug}?dni=${member.dni}`;

    const smsBody = [
      `Hola ${member.firstName}, recordatorio de pago.`,
      `Cuota: ${amount} - Vencimiento: ${dueDate}.`,
      `Paga acá: ${paymentUrl}`,
    ].join('\n');

    const { externalId } = await sendSms(
      accountSid,
      authToken,
      fromNumber,
      member.phone,
      smsBody
    );

    await logAttempt(clubId, memberId, 'payment_reminder', 'SENT', smsBody, externalId);
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
