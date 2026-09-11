import type { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { cookies } from 'next/headers';
import type { Club } from '@prisma/client';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';

/**
 * Central multi-tenant scoping helpers.
 *
 * Every tenant-scoped query must flow through `requireInstitution` (route handlers
 * and server components) to resolve the caller's institution scope, then apply the
 * resulting institutionId via `institutionWhere`. SUPER_ADMIN resolves an institution from the
 * explicit `?institutionId=` query param or the `active_institution_id` cookie (null = all
 * institutions); ADMIN is always locked to the institutionId carried in their session.
 */

export type ScopedRole = 'SUPER_ADMIN' | 'ADMIN';

export interface InstitutionContext {
  role: ScopedRole;
  /** null = all institutions (SUPER_ADMIN without an institution selection). */
  institutionId: string | null;
}

/** Thrown by `requireInstitution`; callers map it to an apiError (401/403). */
export class AuthError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

async function readActiveInstitutionCookie(request?: NextRequest): Promise<string | null> {
  if (request) {
    return request.cookies.get('active_institution_id')?.value ?? null;
  }
  const cookieStore = await cookies();
  return cookieStore.get('active_institution_id')?.value ?? null;
}

/**
 * Resolves the effective institution context for a request.
 *
 * Route handlers pass their `NextRequest` so the explicit `?institutionId=` query
 * param can be read; server components may omit it (no query string) and the
 * `active_institution_id` cookie is read directly.
 *
 * - ADMIN: institutionId always comes from the session; foreign `?institutionId=` is ignored.
 * - SUPER_ADMIN: explicit `?institutionId=` param wins, then the `active_institution_id`
 *   cookie, otherwise null (all institutions).
 *
 * @throws {AuthError} 401 when unauthenticated, 403 on forbidden role/scope.
 */
export async function requireInstitution(request?: NextRequest): Promise<InstitutionContext> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new AuthError(401, 'Not authenticated');
  }

  const { role, institutionId } = session.user;

  if (role === 'ADMIN') {
    if (!institutionId) {
      throw new AuthError(403, 'ADMIN user has no institution assigned');
    }
    return { role, institutionId };
  }

  if (role === 'SUPER_ADMIN') {
    const explicit = request?.nextUrl.searchParams.get('institutionId');
    if (explicit) {
      return { role, institutionId: explicit };
    }
    const cookieInstitutionId = await readActiveInstitutionCookie(request);
    return { role, institutionId: cookieInstitutionId };
  }

  throw new AuthError(403, 'Unauthorized role');
}

/**
 * Query-builder filter that injects the institution scope. Always returns `{ institutionId }`
 * for ADMIN and for SUPER_ADMIN with an institution selection; returns `{}` only for
 * SUPER_ADMIN operating across all institutions.
 */
export function institutionWhere(institutionId: string | null): Record<string, unknown> {
  return institutionId ? { institutionId } : {};
}

/**
 * Resolves an ACTIVE institution by slug for the member portal. Returns null for
 * unknown or INACTIVE institutions so callers can 404.
 */
export async function getEffectiveInstitution(institutionSlug: string): Promise<Club | null> {
  return prisma.club.findFirst({
    where: { slug: institutionSlug, status: 'ACTIVE' },
  });
}

// Backward-compatible aliases
export type ClubContext = InstitutionContext;
export { requireInstitution as requireClub };
export { institutionWhere as clubWhere };
export { getEffectiveInstitution as getEffectiveClub };
export { readActiveInstitutionCookie as readActiveClubCookie };
