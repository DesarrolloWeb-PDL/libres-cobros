import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { requireClub, AuthError } from '@/lib/access';
import { sendBulkReminders } from '@/lib/sms';

const SendSingleSchema = z.object({
  memberId: z.string().cuid('ID de socio inválido'),
});

export async function POST(request: NextRequest) {
  try {
    await requireClub(request);

    const body = await request.json();
    const parsed = SendSingleSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        'Datos inválidos',
        400,
        parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        'VALIDATION_ERROR'
      );
    }

    const result = await sendBulkReminders([parsed.data.memberId]);

    if (result.failed > 0) {
      return apiError('Error al enviar el recordatorio', 500, 'No se pudo enviar el SMS', 'SMS_FAILED');
    }

    if (result.skipped > 0) {
      return apiError('Socio no disponible', 400, 'Sin teléfono o sin cuotas pendientes', 'SMS_SKIPPED');
    }

    return apiSuccess({ sent: result.sent });
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }
    return apiDbError(error, 'Error al enviar el recordatorio');
  }
}
