import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';

export type WhatsAppMessageStatus = 'SENT' | 'FAILED' | 'SKIPPED';

export interface WhatsAppBulkResult {
  sent: number;
  failed: number;
  skipped: number;
}

const WHATSAPP_API_BASE = 'https://graph.facebook.com/v18.0';

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
 * Normaliza el teléfono para WhatsApp (formato internacional sin +)
 * WhatsApp necesita: 541187654321 (sin +, sin espacios)
 */
export function normalizePhoneForWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, '');

  // Si ya empieza con 54 (Argentina), usar tal cual
  if (digits.startsWith('54')) {
    return digits;
  }

  // Si empieza con 0 (local Argentina), quitar el 0 y agregar 54
  if (digits.startsWith('0')) {
    return `54${digits.slice(1)}`;
  }

  // Si no tiene código de país, asumir Argentina
  return `54${digits}`;
}

/**
 * Envía un mensaje de texto vía WhatsApp Cloud API (Meta)
 * Documentación: https://developers.facebook.com/docs/whatsapp/cloud-api
 */
export async function sendWhatsAppMessage(
  phoneNumberId: string,
  accessToken: string,
  toNumber: string,
  body: string
): Promise<{ externalId: string | null }> {
  // Validar credenciales antes de enviar
  if (!phoneNumberId || !accessToken) {
    throw new Error(
      'Configuración de WhatsApp incompleta. Verificá Phone Number ID y Access Token en Configuración del club.'
    );
  }

  const normalizedTo = normalizePhoneForWhatsApp(toNumber);

  const response = await fetch(
    `${WHATSAPP_API_BASE}/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: normalizedTo,
        type: 'text',
        text: {
          preview_url: true,
          body: body,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData?.error?.message || response.statusText;

    // Errores comunes de WhatsApp
    if (errorMessage.includes('Phone number is not registered')) {
      throw new Error('El número de teléfono no está registrado en WhatsApp');
    }
    if (errorMessage.includes('Unsupported country')) {
      throw new Error('País no soportado por WhatsApp');
    }
    if (errorMessage.includes('Invalid access token')) {
      throw new Error('Access Token inválido. Verificá la configuración en Configuración del club.');
    }

    throw new Error(`Error de WhatsApp: ${errorMessage}`);
  }

  const data = await response.json();

  // WhatsApp returns an array of messages with IDs
  const externalId = data?.messages?.[0]?.id ?? null;

  return { externalId };
}

/**
 * Envía recordatorios de pago vía WhatsApp a socios con cuotas pendientes
 */
export async function sendWhatsAppReminder(memberId: string): Promise<WhatsAppBulkResult> {
  const result: WhatsAppBulkResult = { sent: 0, failed: 0, skipped: 0 };

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
      result.failed += 1;
      await prisma.smsLog.create({
        data: {
          clubId: member.clubId,
          memberId: member.id,
          type: 'MISSING_PHONE',
          message: '',
          status: 'FAILED',
          error: 'Member has no phone number',
        },
      });
      return result;
    }

    if (member.fees.length === 0) {
      result.skipped += 1;
      return result;
    }

    // Obtener configuración de WhatsApp
    const [phoneNumberId, accessToken, nextPublicUrl] = await Promise.all([
      getSiteConfig(prisma, clubId, 'whatsapp_phone_number_id'),
      getSiteConfig(prisma, clubId, 'whatsapp_access_token'),
      getSiteConfig(prisma, clubId, 'next_public_url', process.env.NEXT_PUBLIC_URL || ''),
    ]);

    if (!phoneNumberId || !accessToken) {
      result.skipped += 1;
      return result;
    }

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

    const { externalId } = await sendWhatsAppMessage(
      phoneNumberId,
      accessToken,
      member.phone,
      messageBody
    );

    // Log exitoso
    await prisma.smsLog.create({
      data: {
        clubId,
        memberId,
        type: 'payment_reminder',
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
          type: 'payment_reminder',
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
 * Envía recordatorios de pago vía WhatsApp a múltiples socios
 */
export async function sendWhatsAppBulkReminders(
  memberIds: string[],
  batchSize = 50
): Promise<WhatsAppBulkResult> {
  const result: WhatsAppBulkResult = { sent: 0, failed: 0, skipped: 0 };

  for (let i = 0; i < memberIds.length; i += batchSize) {
    const batch = memberIds.slice(i, i + batchSize);

    const batchResults = await Promise.all(
      batch.map((id) => sendWhatsAppReminder(id).catch(() => ({
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
 * Verifica si WhatsApp está configurado para un club
 */
export async function isWhatsAppConfigured(clubId: string): Promise<boolean> {
  const [phoneNumberId, accessToken] = await Promise.all([
    getSiteConfig(prisma, clubId, 'whatsapp_phone_number_id'),
    getSiteConfig(prisma, clubId, 'whatsapp_access_token'),
  ]);

  return !!(phoneNumberId && accessToken);
}
