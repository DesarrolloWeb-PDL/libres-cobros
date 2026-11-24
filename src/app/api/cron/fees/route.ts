import { NextRequest } from 'next/server';
import { authorizeCron } from '@/lib/cron-auth';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { prisma } from '@/lib/db';
import { generateMonthlyFees } from '@/lib/fees';
import { getFeeConfig, shouldGenerateOn } from '@/lib/fee-config';
import { notifyNewFees } from '@/lib/fee-notify';
import { GenerateFeesSchema } from '@/types/fee';

interface ClubFeeGenerationReport {
  clubId: string;
  clubSlug: string;
  clubName: string;
  created: number;
  skipped: number;
  generated: boolean;
  reason?: 'not-generation-day' | 'before-start';
  notified?: number;
}

function getCurrentPeriod(): { month: number; year: number } {
  const now = new Date();
  return { month: now.getUTCMonth() + 1, year: now.getUTCFullYear() };
}

/**
 * Iterates ACTIVE institutions and generates monthly fees per institution using each institution's
 * own Plans and its own fee settings (generation day, due day, start date — specs S1/S2/S5/S6).
 *
 * With `respectSchedule` (the daily cron) an institution only generates when today is ITS
 * configured generation day and today is on/after its effective start date. Without it
 * (explicit POST) every institution generates for the requested period.
 *
 * Per-institution generation is idempotent, so re-runs report zero new fees for institutions
 * that already generated the period. When new fees are created and the institution has
 * notifications enabled, members with a brand-new fee are told (spec S3).
 */
async function generateFeesForAllClubs(
  month: number,
  year: number,
  respectSchedule: boolean
) {
  const now = new Date();
  const clubs = await prisma.club.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, slug: true, name: true, createdAt: true },
    orderBy: { name: 'asc' },
  });

  const clubsResult: ClubFeeGenerationReport[] = [];
  for (const club of clubs) {
    const config = await getFeeConfig(club.id, club.createdAt);

    if (respectSchedule) {
      const decision = shouldGenerateOn(now, config);
      if (!decision.generate) {
        clubsResult.push({
          clubId: club.id,
          clubSlug: club.slug,
          clubName: club.name,
          created: 0,
          skipped: 0,
          generated: false,
          reason: decision.reason,
        });
        continue;
      }
    }

    const result = await generateMonthlyFees(club.id, month, year);

    let notified = 0;
    if (result.created > 0 && config.notifyEnabled && result.createdMemberIds?.length) {
      const notify = await notifyNewFees({
        clubId: club.id,
        memberIds: result.createdMemberIds,
        month,
        year,
      });
      notified = notify.sent;
    }

    clubsResult.push({
      clubId: club.id,
      clubSlug: club.slug,
      clubName: club.name,
      created: result.created,
      skipped: result.skipped,
      generated: true,
      notified,
    });
  }

  return {
    month,
    year,
    respectSchedule,
    clubs: clubsResult,
  };
}

export async function GET(request: NextRequest) {
  try {
    if (!authorizeCron(request)) {
      return apiError('No autorizado', 401);
    }

    const { month, year } = getCurrentPeriod();
    const result = await generateFeesForAllClubs(month, year, true);

    return apiSuccess(result);
  } catch (error) {
    return apiDbError(error, 'Error al generar las cuotas mensuales');
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!authorizeCron(request)) {
      return apiError('No autorizado', 401);
    }

    const body = await request.json().catch(() => ({}));
    const parsed = GenerateFeesSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        'Datos inválidos',
        400,
        parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        'VALIDATION_ERROR'
      );
    }

    const { month, year } = parsed.data;
    const result = await generateFeesForAllClubs(month, year, false);

    return apiSuccess(result);
  } catch (error) {
    return apiDbError(error, 'Error al generar las cuotas mensuales');
  }
}
