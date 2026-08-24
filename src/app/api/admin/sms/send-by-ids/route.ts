import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { requireClub, AuthError } from '@/lib/access';
import { sendBulkReminders } from '@/lib/sms';

const SendBulkByIdsSchema = z.object({
  memberIds: z.array(z.string().cuid()).min(1, 'Seleccioná al menos un socio'),
});

export async function POST(request: NextRequest) {
  try {
    await requireClub(request);

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

    const result = await sendBulkReminders(parsed.data.memberIds);

    return apiSuccess(result);
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }
    // Extraer mensaje de error específico de Twilio
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    if (errorMessage.includes('Configuración de Twilio')) {
      return apiError('Configuración incompleta', 500, errorMessage, 'TWILIO_CONFIG_MISSING');
    }
    return apiDbError(error, 'Error al enviar recordatorios');
  }
}
