import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { markOverdueFees } from '@/lib/fees';

interface ClubOverdueReport {
  clubId: string;
  clubSlug: string;
  clubName: string;
  updated: number;
}

function getTodayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function authorizeCron(request: NextRequest): boolean {
  const cronSecret = request.headers.get('x-cron-secret');
  return cronSecret === process.env.CRON_SECRET;
}

export async function GET(request: NextRequest) {
  try {
    if (!authorizeCron(request)) {
      return apiError('No autorizado', 401);
    }

    const today = getTodayUtc();

    // Iterate ACTIVE clubs and mark each club's overdue fees scoped by clubId,
    // so one club's pass never touches another club's fees.
    const clubs = await prisma.club.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, slug: true, name: true },
      orderBy: { name: 'asc' },
    });

    const clubsResult: ClubOverdueReport[] = [];
    for (const club of clubs) {
      const updated = await markOverdueFees(club.id, today);
      clubsResult.push({
        clubId: club.id,
        clubSlug: club.slug,
        clubName: club.name,
        updated,
      });
    }

    const totalUpdated = clubsResult.reduce((sum, club) => sum + club.updated, 0);

    return apiSuccess({ totalUpdated, clubs: clubsResult });
  } catch (error) {
    return apiDbError(error, 'Error al marcar cuotas vencidas');
  }
}
