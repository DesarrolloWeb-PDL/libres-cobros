import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { requireClub, AuthError } from '@/lib/access';
import { sendBulkReminders, getConfiguredChannel } from '@/lib/sms';

const SendBulkByIdsSchema = z.object({
  memberIds: z.array(z.string().cuid()).min(1, 'Seleccioná al menos un socio'),
  channel: z.enum(['sms', 'whatsapp']).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireClub(request);

    const body = await request.json();
    const parsed = SendBulkByIdsSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        'Datos inválidos',
        400,
        parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        'VALIDATION_ERROR'
      );
    }

    // Detectar canal configurado
    const configuredChannel = ctx.clubId
      ? await getConfiguredChannel(ctx.clubId)
      : parsed.data.channel ?? 'whatsapp';

    const result = await sendBulkReminders(parsed.data.memberIds);

    const channelLabel = configuredChannel === 'whatsapp' ? 'WhatsApp' : 'SMS';
    return apiSuccess({
      ...result,
      channel: configuredChannel,
      message: `${channelLabel}: ${result.sent} enviados, ${result.failed} fallidos, ${result.skipped} omitidos`,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }
    // Extraer mensaje de error específico
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    if (errorMessage.includes('Configuración de')) {
      return apiError('Configuración incompleta', 500, errorMessage, 'CONFIG_MISSING');
    }
    return apiDbError(error, 'Error al enviar recordatorios');
  }
}
