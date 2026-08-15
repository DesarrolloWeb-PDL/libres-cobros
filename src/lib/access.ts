import type { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { cookies } from 'next/headers';
import type { Club } from '@prisma/client';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';

/**
 * Central multi-tenant scoping helpers.
 *
 * Every tenant-scoped query must flow through `requireClub` (route handlers
 * and server components) to resolve the caller's club scope, then apply the
 * resulting clubId via `clubWhere`. SUPER_ADMIN resolves a club from the
 * explicit `?clubId=` query param or the `active_club_id` cookie (null = all
 * clubs); ADMIN is always locked to the clubId carried in their session.
 */

export type ScopedRole = 'SUPER_ADMIN' | 'ADMIN';

export interface ClubContext {
  role: ScopedRole;
  /** null = all clubs (SUPER_ADMIN without a club selection). */
  clubId: string | null;
}

/** Thrown by `requireClub`; callers map it to an apiError (401/403). */
export class AuthError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

async function readActiveClubCookie(request?: NextRequest): Promise<string | null> {
  if (request) {
    return request.cookies.get('active_club_id')?.value ?? null;
  }
  const cookieStore = await cookies();
  return cookieStore.get('active_club_id')?.value ?? null;
}

/**
 * Resolves the effective club context for a request.
 *
 * Route handlers pass their `NextRequest` so the explicit `?clubId=` query
 * param can be read; server components may omit it (no query string) and the
 * `active_club_id` cookie is read directly.
 *
 * - ADMIN: clubId always comes from the session; foreign `?clubId=` is ignored.
 * - SUPER_ADMIN: explicit `?clubId=` param wins, then the `active_club_id`
 *   cookie, otherwise null (all clubs).
 *
 * @throws {AuthError} 401 when unauthenticated, 403 on forbidden role/scope.
 */
export async function requireClub(request?: NextRequest): Promise<ClubContext> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new AuthError(401, 'Not authenticated');
  }

  const { role, clubId } = session.user;

  if (role === 'ADMIN') {
    if (!clubId) {
      throw new AuthError(403, 'ADMIN user has no club assigned');
    }
    return { role, clubId };
  }

  if (role === 'SUPER_ADMIN') {
    const explicit = request?.nextUrl.searchParams.get('clubId');
    if (explicit) {
      return { role, clubId: explicit };
    }
    const cookieClubId = await readActiveClubCookie(request);
    return { role, clubId: cookieClubId };
  }

  throw new AuthError(403, 'Unauthorized role');
}

/**
 * Query-builder filter that injects the club scope. Always returns `{ clubId }`
 * for ADMIN and for SUPER_ADMIN with a club selection; returns `{}` only for
 * SUPER_ADMIN operating across all clubs.
 */
export function clubWhere(clubId: string | null): Record<string, unknown> {
  return clubId ? { clubId } : {};
}

/**
 * Resolves an ACTIVE club by slug for the member portal. Returns null for
 * unknown or INACTIVE clubs so callers can 404.
 */
export async function getEffectiveClub(clubSlug: string): Promise<Club | null> {
  return prisma.club.findFirst({
    where: { slug: clubSlug, status: 'ACTIVE' },
  });
}
