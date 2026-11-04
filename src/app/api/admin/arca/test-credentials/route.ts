import { NextRequest } from 'next/server';
import { requestTa, resolveClubArcaCredentials, resolvePlatformArcaCredentials } from '@/lib/arca';
import { apiError, apiSuccess } from '@/lib/api-response';
import { requireInstitution, AuthError } from '@/lib/access';

/**
 * Test the resolved ARCA credentials by requesting a WSAA TA.
 *
 * - SUPER_ADMIN without an institution selection tests platform credentials.
 * - SUPER_ADMIN with an institution selection or any ADMIN tests that
 *   institution's credentials.
 * - Does NOT emit any fiscal document.
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireInstitution(request);

    const environment = process.env.ARCA_PRODUCTION === 'true' ? 'produccion' : 'homologacion';

    const credentials = ctx.institutionId
      ? await resolveClubArcaCredentials(ctx.institutionId)
      : await resolvePlatformArcaCredentials();

    if (!credentials) {
      return apiSuccess({
        ok: false,
        environment,
        error: 'No hay credenciales ARCA configuradas',
      });
    }

    await requestTa(credentials.cuit, credentials);

    return apiSuccess({ ok: true, environment });
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }
    const message = error instanceof Error ? error.message : String(error);
    // Never include PEM material in error responses. The raw WSAA/WSFE error
    // text is safe, but we keep it concise.
    return apiError('Error al probar credenciales ARCA', 500, message);
  }
}
