import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { requireClub, AuthError } from '@/lib/access';
import { sendBulkReminders } from '@/lib/sms';

const SendSingleSchema = z.object({
  memberId: z.string().cuid('ID de socio inválido'),
});

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireClub(request);

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

    // Verificar que el socio pertenece al club
    const member = await prisma.member.findUnique({
      where: { id: parsed.data.memberId },
      select: { id: true, clubId: true, phone: true, firstName: true },
    });

    if (!member) {
      return apiError('Socio no encontrado', 404, 'ID de socio inválido', 'MEMBER_NOT_FOUND');
    }

    if (ctx.clubId && member.clubId !== ctx.clubId) {
      return apiError('No autorizado', 403, 'El socio no pertenece a tu club', 'FORBIDDEN');
    }

    if (!member.phone || member.phone.trim() === '') {
      return apiError('Sin teléfono', 400, `${member.firstName} no tiene número de teléfono registrado`, 'NO_PHONE');
    }

    const result = await sendBulkReminders([parsed.data.memberId]);

    if (result.failed > 0) {
      return apiError('Error al enviar', 500, 'No se pudo enviar el SMS. Verificá la configuración de Twilio en Configuración.', 'SMS_FAILED');
    }

    if (result.skipped > 0) {
      return apiError('Omitido', 400, `${member.firstName} no tiene cuotas pendientes este mes`, 'SMS_SKIPPED');
    }

    return apiSuccess({ sent: result.sent, message: `SMS enviado a ${member.firstName}` });
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }
    // Extraer mensaje de error específico de Twilio
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    if (errorMessage.includes('Configuración de Twilio')) {
      return apiError('Configuración incompleta', 500, errorMessage, 'TWILIO_CONFIG_MISSING');
    }
    return apiDbError(error, 'Error al enviar el recordatorio');
  }
}
