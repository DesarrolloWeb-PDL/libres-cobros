import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { requireInstitution, institutionWhere, AuthError } from '@/lib/access';
import { SendMassMessageSchema } from '@/types/messaging';
import {
  countMassMessageRecipients,
  deriveCampaignStatus,
  parseScheduledAt,
  sendMassMessage,
} from '@/lib/mass-message';
import type {
  MassMessageHistoryItem,
  MassMessageHistoryResponse,
  SendMassMessageResponse,
} from '@/types/messaging';

function toHistoryStatus(status: string): MassMessageHistoryItem['status'] {
  if (status === 'PENDING') return 'SCHEDULED';
  if (status === 'PROCESSING') return 'PROCESSING';
  if (status === 'SENT' || status === 'PARTIAL' || status === 'FAILED') {
    return status as MassMessageHistoryItem['status'];
  }
  return 'FAILED';
}

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireInstitution(request);

    const limit = Math.min(
      100,
      Math.max(1, parseInt(request.nextUrl.searchParams.get('limit') ?? '50', 10))
    );

    const campaigns = await prisma.massMessageCampaign.findMany({
      where: institutionWhere(ctx.institutionId),
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const items: MassMessageHistoryItem[] = campaigns.map((campaign) => {
      const status = toHistoryStatus(campaign.status);
      const sentAt =
        campaign.sentAt ?? campaign.scheduledAt ?? campaign.createdAt;

      return {
        id: campaign.id,
        message: campaign.message,
        recipientCount: campaign.recipientCount,
        sentCount: campaign.sentCount,
        failedCount: campaign.failedCount,
        skippedCount: campaign.skippedCount,
        sentAt: sentAt.toISOString(),
        status,
        segment: campaign.segment,
        category: campaign.category,
        scheduledAt: campaign.scheduledAt?.toISOString() ?? null,
      };
    });

    const response: MassMessageHistoryResponse = { data: items };
    return apiSuccess(response);
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }
    return apiDbError(error, 'Error al cargar el historial de mensajes');
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireInstitution(request);

    if (!ctx.institutionId) {
      return apiError(
        'Seleccioná una institución',
        400,
        'Se requiere una institución para enviar mensajes masivos',
        'INSTITUTION_REQUIRED'
      );
    }

    const body = await request.json();
    const parsed = SendMassMessageSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        'Datos inválidos',
        400,
        parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        'VALIDATION_ERROR'
      );
    }

    const { message } = parsed.data;

    if ('memberIds' in parsed.data) {
      const members = await prisma.member.findMany({
        where: {
          ...institutionWhere(ctx.institutionId),
          id: { in: parsed.data.memberIds },
        },
        include: {
          fees: {
            where: {
              status: { in: ['PENDING', 'OVERDUE'] },
            },
            orderBy: { dueDate: 'asc' },
          },
        },
      });

      if (members.length === 0) {
        return apiError(
          'Sin destinatarios',
          400,
          'No hay socios seleccionados para enviar el mensaje',
          'EMPTY_SEGMENT'
        );
      }

      const result = await sendMassMessage(
        ctx.institutionId,
        message,
        {
          status: undefined,
          planId: undefined,
          search: undefined,
          segment: 'all',
          memberIds: parsed.data.memberIds,
        },
        'mass_message'
      );

      const status = deriveCampaignStatus(result);
      await prisma.massMessageCampaign.create({
        data: {
          clubId: ctx.institutionId,
          message,
          segment: 'all',
          status,
          recipientCount: result.recipientCount,
          sentCount: result.sent,
          failedCount: result.failed,
          skippedCount: result.skipped,
        },
      });

      const response: SendMassMessageResponse = {
        sent: result.sent,
        failed: result.failed,
      };
      return apiSuccess(response);
    }

    const filters = parsed.data.filters;
    const scheduledAtRaw = parsed.data.scheduledAt;

    if (scheduledAtRaw) {
      const scheduledAt = parseScheduledAt(scheduledAtRaw);
      if (!scheduledAt) {
        return apiError(
          'Fecha inválida',
          400,
          'El formato de la fecha de envío no es válido',
          'INVALID_SCHEDULED_AT'
        );
      }

      const now = new Date();
      if (scheduledAt.getTime() <= now.getTime()) {
        return apiError(
          'Fecha inválida',
          400,
          'La fecha de envío debe ser en el futuro',
          'PAST_SCHEDULED_AT'
        );
      }

      const recipientCount = await countMassMessageRecipients(ctx.institutionId, filters);
      if (recipientCount === 0) {
        return apiError(
          'Sin destinatarios',
          400,
          'No hay socios que coincidan con el segmento seleccionado',
          'EMPTY_SEGMENT'
        );
      }

      const campaign = await prisma.massMessageCampaign.create({
        data: {
          clubId: ctx.institutionId,
          message,
          segment: filters.segment ?? 'all',
          category: filters.category ?? null,
          memberStatus: filters.status ?? null,
          planId: filters.planId ?? null,
          search: filters.search ?? null,
          scheduledAt,
          status: 'PENDING',
          recipientCount,
        },
      });

      const response: SendMassMessageResponse = {
        sent: 0,
        failed: 0,
        scheduled: true,
        campaignId: campaign.id,
        scheduledAt: campaign.scheduledAt?.toISOString(),
      };
      return apiSuccess(response);
    }

    const recipientCount = await countMassMessageRecipients(ctx.institutionId, filters);
    if (recipientCount === 0) {
      return apiError(
        'Sin destinatarios',
        400,
        'No hay socios que coincidan con el segmento seleccionado',
        'EMPTY_SEGMENT'
      );
    }

    const result = await sendMassMessage(ctx.institutionId, message, filters, 'mass_message');
    const status = deriveCampaignStatus(result);

    await prisma.massMessageCampaign.create({
      data: {
        clubId: ctx.institutionId,
        message,
        segment: filters.segment ?? 'all',
        category: filters.category ?? null,
        memberStatus: filters.status ?? null,
        planId: filters.planId ?? null,
        search: filters.search ?? null,
        status,
        sentAt: new Date(),
        recipientCount: result.recipientCount,
        sentCount: result.sent,
        failedCount: result.failed,
        skippedCount: result.skipped,
      },
    });

    const response: SendMassMessageResponse = {
      sent: result.sent,
      failed: result.failed,
    };
    return apiSuccess(response);
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }
    return apiDbError(error, 'Error al enviar mensajes masivos');
  }
}
