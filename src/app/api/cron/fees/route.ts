import { NextRequest } from 'next/server';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { prisma } from '@/lib/db';
import { generateMonthlyFees } from '@/lib/fees';
import { GenerateFeesSchema } from '@/types/fee';

interface ClubFeeGenerationReport {
  clubId: string;
  clubSlug: string;
  clubName: string;
  created: number;
  skipped: number;
}

function authorizeCron(request: NextRequest): boolean {
  const cronSecret = request.headers.get('x-cron-secret');
  return cronSecret === process.env.CRON_SECRET;
}

function getCurrentPeriod(): { month: number; year: number } {
  const now = new Date();
  return { month: now.getUTCMonth() + 1, year: now.getUTCFullYear() };
}

/**
 * Iterates ACTIVE clubs and generates monthly fees per club using each club's
 * own FeeConfigs. Per-club generation is idempotent, so re-runs report zero
 * new fees for clubs that already generated the period.
 */
async function generateFeesForAllClubs(month: number, year: number) {
  const clubs = await prisma.club.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, slug: true, name: true },
    orderBy: { name: 'asc' },
  });

  const clubsResult: ClubFeeGenerationReport[] = [];
  for (const club of clubs) {
    const result = await generateMonthlyFees(club.id, month, year);
    clubsResult.push({
      clubId: club.id,
      clubSlug: club.slug,
      clubName: club.name,
      created: result.created,
      skipped: result.skipped,
    });
  }

  return {
    month,
    year,
    clubs: clubsResult,
  };
}

export async function GET(request: NextRequest) {
  try {
    if (!authorizeCron(request)) {
      return apiError('No autorizado', 401);
    }

    const { month, year } = getCurrentPeriod();
    const result = await generateFeesForAllClubs(month, year);

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
    const result = await generateFeesForAllClubs(month, year);

    return apiSuccess(result);
  } catch (error) {
    return apiDbError(error, 'Error al generar las cuotas mensuales');
  }
}
