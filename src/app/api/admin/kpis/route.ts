import { NextRequest } from 'next/server';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { requireInstitution, AuthError } from '@/lib/access';
import { getInstitutionKpis, getPlatformKpis } from '@/lib/kpis';
import type { KpiResponse } from '@/types/kpi';

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireInstitution(request);

    let response: KpiResponse;
    if (ctx.institutionId) {
      const institution = await getInstitutionKpis(ctx.institutionId);
      response = { institution, platform: null };
    } else {
      const platform = await getPlatformKpis();
      response = { institution: null, platform };
    }

    return apiSuccess(response);
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }
    return apiDbError(error, 'Failed to load KPI metrics');
  }
}