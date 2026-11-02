import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { runSaasBilling } from '@/lib/saas-billing';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';

function authorizeCron(request: NextRequest): boolean {
  const cronSecret = request.headers.get('x-cron-secret');
  return cronSecret === process.env.CRON_SECRET;
}

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    if (!authorizeCron(request)) {
      return apiError('Unauthorized', 401);
    }

    const result = await runSaasBilling(prisma);
    return apiSuccess(result);
  } catch (error) {
    return apiDbError(error, 'SaaS billing run failed');
  }
}
