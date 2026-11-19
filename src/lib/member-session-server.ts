import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySessionCookie, SESSION_COOKIE_NAME, type MemberSession } from '@/lib/member-auth';

/**
 * Server-component helper: reads the member-session cookie from the Next.js
 * cookie store (request headers are not available in server components).
 */
export async function getServerMemberSession(): Promise<MemberSession | null> {
  const store = await cookies();
  return verifySessionCookie(store.get(SESSION_COOKIE_NAME)?.value);
}

/**
 * Guards a portal page that receives `?dni=` in the URL.
 *
 * Order matters for anti-enumeration: the session is validated BEFORE the DNI
 * is looked up, so an attacker without a session gets the same redirect whether
 * or not the DNI exists.
 *
 * Returns the session when it is valid for this club; otherwise redirects to
 * the portal entry where the member must run the OTP flow again.
 */
export async function requirePortalSession(
  clubId: string,
  slug: string
): Promise<MemberSession> {
  const session = await getServerMemberSession();

  if (!session || session.clubId !== clubId) {
    redirect(`/pagos/${slug}`);
  }

  return session;
}

/**
 * Second gate, after the member lookup: the session must belong to the member
 * being displayed. A missing member and a mismatched member both redirect to
 * the same place — otherwise "not found" vs "no access" would enumerate DNIs.
 */
export function assertMemberPageAccess(
  session: MemberSession,
  member: { id: string } | null,
  slug: string
): void {
  if (!member || session.memberId !== member.id) {
    redirect(`/pagos/${slug}`);
  }
}
