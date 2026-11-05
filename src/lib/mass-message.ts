import { DateTime } from 'luxon';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { institutionWhere } from '@/lib/access';
import { getConfiguredChannel, sendMessage } from '@/lib/sms';
import { sendEmail, isEmailConfigured } from '@/lib/email';
import { getInstitutionSiteConfigValues } from '@/lib/site-config';
import { resolveMessageTemplate } from '@/lib/messaging';
import type { MassMessageFilters, MassMessageSegment } from '@/types/messaging';

export interface MassMessageResult {
  recipientCount: number;
  sent: number;
  failed: number;
  skipped: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function logAttempt(
  clubId: string,
  memberId: string,
  type: string,
  status: 'SENT' | 'FAILED' | 'SKIPPED',
  message: string,
  externalId?: string | null,
  error?: string
) {
  await prisma.smsLog.create({
    data: {
      clubId,
      memberId,
      type,
      status,
      message,
      externalId: externalId ?? null,
      error: error ?? null,
    },
  });
}

export function buildMassMessageWhere(
  institutionId: string | null,
  filters: Partial<MassMessageFilters>
): Prisma.MemberWhereInput {
  const { status, planId, search, segment, category, memberIds } = filters;
  const trimmedSearch = search?.trim();

  const where: Prisma.MemberWhereInput = {
    ...institutionWhere(institutionId),
  };

  if (status) {
    where.status = status;
  }

  if (planId) {
    where.planId = planId;
  }

  if (category) {
    where.category = category;
  }

  if (memberIds && memberIds.length > 0) {
    where.id = { in: memberIds };
  }

  if (trimmedSearch) {
    where.OR = [
      { dni: { contains: trimmedSearch, mode: 'insensitive' } },
      { firstName: { contains: trimmedSearch, mode: 'insensitive' } },
      { lastName: { contains: trimmedSearch, mode: 'insensitive' } },
    ];
  }

  const effectiveSegment: MassMessageSegment = segment ?? 'all';

  if (effectiveSegment === 'up_to_date') {
    where.fees = {
      none: { status: { in: ['PENDING', 'OVERDUE'] } },
    };
  } else if (effectiveSegment === 'debt') {
    where.fees = { some: { status: 'PENDING' } };
    where.NOT = { fees: { some: { status: 'OVERDUE' } } };
  } else if (effectiveSegment === 'overdue') {
    where.fees = { some: { status: 'OVERDUE' } };
  }

  return where;
}

export async function countMassMessageRecipients(
  institutionId: string | null,
  filters: Partial<MassMessageFilters>
): Promise<number> {
  const where = buildMassMessageWhere(institutionId, filters);
  return prisma.member.count({ where });
}

export function deriveCampaignStatus(result: MassMessageResult): string {
  if (result.recipientCount === 0) return 'FAILED';
  if (result.failed === 0 && result.skipped === 0) return 'SENT';
  if (result.sent === 0) return 'FAILED';
  return 'PARTIAL';
}

export function parseScheduledAt(value: string): Date | null {
  const dt = DateTime.fromISO(value, {
    zone: 'America/Argentina/Buenos_Aires',
  });
  return dt.isValid ? dt.toUTC().toJSDate() : null;
}

export async function sendMassMessage(
  institutionId: string,
  message: string,
  filters: Partial<MassMessageFilters>,
  logType = 'mass_message'
): Promise<MassMessageResult> {
  const where = buildMassMessageWhere(institutionId, filters);

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
  let skipped = 0;
  const batchSize = 10;

  const channel = await getConfiguredChannel(institutionId);

  let resendConfig: { apiKey: string; fromEmail: string } | null = null;
  if (channel === 'email') {
    if (!(await isEmailConfigured(institutionId))) {
      throw new Error(
        'Email no configurado. Verificá la API Key de Resend en Configuración de la institución.'
      );
    }

    const values = await getInstitutionSiteConfigValues(institutionId, [
      'resend_api_key',
      'resend_from_email',
    ]);

    resendConfig = {
      apiKey: values.resend_api_key ?? '',
      fromEmail: values.resend_from_email ?? '',
    };
  }

  for (let i = 0; i < members.length; i += batchSize) {
    const batch = members.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async (member) => {
        const personalizedMessage = resolveMessageTemplate(message, member);

        if (channel === 'email') {
          if (!member.email || member.email.trim() === '') {
            await logAttempt(
              member.clubId,
              member.id,
              logType,
              'SKIPPED',
              message,
              null,
              'Socio sin email'
            );
            skipped += 1;
            return;
          }

          try {
            const htmlBody = `<p>${personalizedMessage.replace(/\n/g, '<br />')}</p>`;
            const { externalId } = await sendEmail(
              resendConfig!.apiKey,
              resendConfig!.fromEmail,
              member.email,
              'Mensaje de tu institución',
              htmlBody
            );
            await logAttempt(
              member.clubId,
              member.id,
              logType,
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
              logType,
              'FAILED',
              personalizedMessage,
              null,
              errorMessage
            );
            failed += 1;
          }

          return;
        }

        if (!member.phone || member.phone.trim() === '') {
          await logAttempt(
            member.clubId,
            member.id,
            logType,
            'SKIPPED',
            message,
            null,
            'Socio sin teléfono'
          );
          skipped += 1;
          return;
        }

        try {
          const { externalId } = await sendMessage(
            member.clubId,
            member.phone,
            personalizedMessage
          );
          await logAttempt(
            member.clubId,
            member.id,
            logType,
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
            logType,
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

  return {
    recipientCount: members.length,
    sent,
    failed,
    skipped,
  };
}

export interface ScheduledMassMessageCampaignResult {
  id: string;
  status: string;
  recipientCount: number;
  sent: number;
  failed: number;
  skipped: number;
  error?: string;
}

/**
 * Processes every due scheduled mass-message campaign exactly once.
 *
 * Follows the same claim-then-process pattern as the other cron jobs: a
 * campaign is atomically moved from PENDING to PROCESSING before sending, so
 * concurrent cron invocations cannot double-send. Campaigns that are already
 * PROCESSING/SENT/PARTIAL/FAILED are never picked up again.
 */
type ScheduledCampaignRow = {
  id: string;
  clubId: string;
  message: string;
  segment: string | null;
  category: string | null;
  memberStatus: string | null;
  planId: string | null;
  search: string | null;
  scheduledAt: Date | null;
};

type ScheduledCampaignPrismaClient = {
  massMessageCampaign: {
    findMany: (args: unknown) => Promise<ScheduledCampaignRow[]>;
    updateMany: (args: unknown) => Promise<{ count: number }>;
    update: (args: unknown) => Promise<unknown>;
  };
};

export async function processScheduledMassMessages(
  prismaClient: unknown = prisma,
  now: Date = new Date()
): Promise<{
  processed: number;
  campaigns: ScheduledMassMessageCampaignResult[];
}> {
  const client = prismaClient as ScheduledCampaignPrismaClient;
  const dueCampaigns = await client.massMessageCampaign.findMany({
    where: {
      status: 'PENDING',
      scheduledAt: { lte: now },
    },
    orderBy: { scheduledAt: 'asc' },
  });

  const results: ScheduledMassMessageCampaignResult[] = [];

  for (const campaign of dueCampaigns) {
    const claimed = await client.massMessageCampaign.updateMany({
      where: { id: campaign.id, status: 'PENDING' },
      data: { status: 'PROCESSING' },
    });

    if (claimed.count === 0) {
      continue;
    }

    try {
      const filters: MassMessageFilters = {
        status: (campaign.memberStatus as 'ACTIVE' | 'INACTIVE') ?? undefined,
        planId: campaign.planId ?? undefined,
        search: campaign.search ?? undefined,
        segment: (campaign.segment as MassMessageFilters['segment']) ?? 'all',
        category: campaign.category ?? undefined,
      };

      const result = await sendMassMessage(
        campaign.clubId,
        campaign.message,
        filters,
        'mass_message_scheduled'
      );

      const status = deriveCampaignStatus(result);

      await client.massMessageCampaign.update({
        where: { id: campaign.id },
        data: {
          status,
          sentAt: new Date(),
          recipientCount: result.recipientCount,
          sentCount: result.sent,
          failedCount: result.failed,
          skippedCount: result.skipped,
        },
      });

      results.push({
        id: campaign.id,
        status,
        recipientCount: result.recipientCount,
        sent: result.sent,
        failed: result.failed,
        skipped: result.skipped,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      await client.massMessageCampaign.update({
        where: { id: campaign.id },
        data: {
          status: 'FAILED',
          sentAt: new Date(),
          error: message,
        },
      });

      results.push({
        id: campaign.id,
        status: 'FAILED',
        recipientCount: 0,
        sent: 0,
        failed: 0,
        skipped: 0,
        error: message,
      });
    }
  }

  return { processed: results.length, campaigns: results };
}

// Convenience aliases matching the naming used by other cron jobs.
export const runScheduledMassMessages = processScheduledMassMessages;
export const processScheduledCampaigns = processScheduledMassMessages;
export const runMassMessages = processScheduledMassMessages;
export const processScheduledMessages = processScheduledMassMessages;
export const sendScheduledMassMessages = processScheduledMassMessages;
export const runMassMessageCampaigns = processScheduledMassMessages;
