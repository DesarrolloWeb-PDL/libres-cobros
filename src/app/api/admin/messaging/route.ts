import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { requireInstitution, institutionWhere, AuthError } from '@/lib/access';
import { sendMessage } from '@/lib/sms';
import { resolveMessageTemplate } from '@/lib/messaging';
import {
  MassMessageFiltersSchema,
  SendMassMessageSchema,
} from '@/types/messaging';
import type {
  MassMessageHistoryItem,
  MassMessageHistoryResponse,
  SendMassMessageResponse,
} from '@/types/messaging';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function logAttempt(
  clubId: string,
  memberId: string,
  status: 'SENT' | 'FAILED' | 'SKIPPED',
  message: string,
  externalId?: string | null,
  error?: string
) {
  await prisma.smsLog.create({
    data: {
      clubId,
      memberId,
      type: 'mass_message',
      status,
      message,
      externalId: externalId ?? null,
      error: error ?? null,
    },
  });
}

function buildMemberWhere(
  institutionId: string | null,
  filters: z.infer<typeof MassMessageFiltersSchema>
) {
  const { status, planId, search } = filters;
  const trimmedSearch = search?.trim();

  const where: Record<string, unknown> = {
    ...institutionWhere(institutionId),
  };

  if (status) {
    where.status = status;
  }

  if (planId) {
    where.planId = planId;
  }

  if (trimmedSearch) {
    where.OR = [
      { dni: { contains: trimmedSearch, mode: 'insensitive' } },
      { firstName: { contains: trimmedSearch, mode: 'insensitive' } },
      { lastName: { contains: trimmedSearch, mode: 'insensitive' } },
    ];
  }

  return where;
}

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireInstitution(request);

    const limit = Math.min(
      100,
      Math.max(1, parseInt(request.nextUrl.searchParams.get('limit') ?? '50', 10))
    );

    const logs = await prisma.smsLog.findMany({
      where: {
        ...institutionWhere(ctx.institutionId),
        type: { startsWith: 'mass_message' },
      },
      orderBy: { sentAt: 'desc' },
      take: 200,
      select: {
        message: true,
        status: true,
        sentAt: true,
      },
    });

    const campaigns = new Map<
      string,
      {
        message: string;
        sentAt: Date;
        sent: number;
        failed: number;
        skipped: number;
      }
    >();

    for (const log of logs) {
      // Group by message body + minute so repeated identical messages are
      // still distinguishable when sent at different times.
      const key = `${log.message}::${log.sentAt.toISOString().slice(0, 16)}`;
      const current = campaigns.get(key) ?? {
        message: log.message,
        sentAt: log.sentAt,
        sent: 0,
        failed: 0,
        skipped: 0,
      };

      if (log.status === 'SENT') current.sent += 1;
      else if (log.status === 'FAILED') current.failed += 1;
      else if (log.status === 'SKIPPED') current.skipped += 1;

      campaigns.set(key, current);
    }

    const items: MassMessageHistoryItem[] = Array.from(campaigns.values())
      .sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime())
      .slice(0, limit)
      .map((campaign) => {
        const status =
          campaign.failed === 0 && campaign.skipped === 0
            ? 'SENT'
            : campaign.sent === 0
              ? 'FAILED'
              : 'PARTIAL';

        return {
          id: `${campaign.message}::${campaign.sentAt.toISOString().slice(0, 16)}`,
          message: campaign.message,
          recipientCount: campaign.sent + campaign.failed + campaign.skipped,
          sentCount: campaign.sent,
          failedCount: campaign.failed,
          skippedCount: campaign.skipped,
          sentAt: campaign.sentAt.toISOString(),
          status,
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

    let where: Record<string, unknown>;

    if ('memberIds' in parsed.data) {
      where = {
        ...institutionWhere(ctx.institutionId),
        id: { in: parsed.data.memberIds },
      };
    } else {
      where = buildMemberWhere(ctx.institutionId, parsed.data.filters);
    }

    const members = await prisma.member.findMany({
      where,
      include: {
        fees: {
          where: {
            status: { in: ['PENDING', 'OVERDUE'] },
          },
          orderBy: { dueDate: 'asc' },
        },
      },
    });

    let sent = 0;
    let failed = 0;
    const batchSize = 10;

    for (let i = 0; i < members.length; i += batchSize) {
      const batch = members.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (member) => {
          if (!member.phone || member.phone.trim() === '') {
            await logAttempt(
              member.clubId,
              member.id,
              'SKIPPED',
              message,
              null,
              'Socio sin teléfono'
            );
            return;
          }

          const personalizedMessage = resolveMessageTemplate(message, member);

          try {
            const { externalId } = await sendMessage(
              member.clubId,
              member.phone,
              personalizedMessage
            );
            await logAttempt(
              member.clubId,
              member.id,
              'SENT',
              personalizedMessage,
              externalId
            );
            sent += 1;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            await logAttempt(
              member.clubId,
              member.id,
              'FAILED',
              personalizedMessage,
              null,
              errorMessage
            );
            failed += 1;
          }
        })
      );

      if (i + batchSize < members.length) {
        await sleep(1000);
      }
    }

    const response: SendMassMessageResponse = { sent, failed };
    return apiSuccess(response);
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }
    return apiDbError(error, 'Error al enviar mensajes masivos');
  }
}
