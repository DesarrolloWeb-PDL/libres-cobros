import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';

export type WhatsAppMessageStatus = 'SENT' | 'FAILED' | 'SKIPPED';

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
  key: string,
  defaultValue = ''
): Promise<string> {
  const config = await tx.siteConfig.findUnique({ where: { key } });
  return config?.value ?? defaultValue;
}

export async function sendTemplateMessage(
  phoneNumberId: string,
  accessToken: string,
  phoneNumber: string,
  templateName: string,
  params: string[]
): Promise<{ externalId: string | null }> {
  const normalizedPhone = normalizePhone(phoneNumber);

  const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
  const body = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: normalizedPhone,
    type: 'template',
    template: {
      name: templateName,
      language: { code: 'es' },
      components: [
        {
          type: 'body',
          parameters: params.map((text) => ({ type: 'text', text })),
        },
      ],
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    const message =
      data?.error?.message || `WhatsApp API error (${response.status})`;
    throw new Error(message);
  }

  const externalId = data?.messages?.[0]?.id ?? null;
  return { externalId };
}

async function logAttempt(
  memberId: string,
  templateName: string,
  status: WhatsAppMessageStatus,
  params: string[],
  externalId?: string | null,
  error?: string
) {
  await prisma.whatsAppLog.create({
    data: {
      memberId,
      type: templateName,
      message: params.join(' | '),
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

    if (!member.phone || member.phone.trim() === '') {
      await logAttempt(memberId, 'payment_reminder', 'FAILED', [], null, 'Socio sin teléfono');
      result.skipped += 1;
      return result;
    }

    if (member.fees.length === 0) {
      await logAttempt(memberId, 'payment_reminder', 'SKIPPED', [], null, 'Sin cuotas pendientes');
      result.skipped += 1;
      return result;
    }

    const [phoneNumberId, accessToken, templateName, alias, cbu] = await Promise.all([
      getSiteConfig(prisma, 'whatsapp_phone_number_id'),
      getSiteConfig(prisma, 'whatsapp_access_token'),
      getSiteConfig(prisma, 'whatsapp_template_name'),
      getSiteConfig(prisma, 'bank_alias'),
      getSiteConfig(prisma, 'bank_cbu'),
    ]);

    if (!phoneNumberId || !accessToken || !templateName) {
      await logAttempt(
        memberId,
        'payment_reminder',
        'SKIPPED',
        [],
        null,
        'Configuración de WhatsApp incompleta'
      );
      result.skipped += 1;
      return result;
    }

    const fee = member.fees[0];
    const params = [
      `${member.firstName} ${member.lastName}`,
      fee.amount.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' }),
      fee.dueDate.toLocaleDateString('es-AR'),
      alias || '-',
      cbu || '-',
    ];

    const { externalId } = await sendTemplateMessage(
      phoneNumberId,
      accessToken,
      member.phone,
      templateName,
      params
    );

    await logAttempt(memberId, templateName, 'SENT', params, externalId);
    result.sent += 1;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await logAttempt(memberId, 'payment_reminder', 'FAILED', [], null, message);
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
