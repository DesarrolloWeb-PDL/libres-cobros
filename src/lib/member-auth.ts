import { createHash, createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { prisma } from '@/lib/db';

/**
 * Member portal authentication: short-lived OTP codes (WhatsApp/email) plus a
 * signed, httpOnly session cookie that replaces the old "any DNI works" flow.
 *
 * Security properties:
 * - Codes are 6 numeric digits (<= 8 chars), stored as SHA-256 hashes only.
 * - 10 minute expiry, max 5 failed attempts per code, single use.
 * - Session cookies are HMAC-signed with NEXTAUTH_SECRET and expire in 7 days.
 * - Verification compares hashes with timing-safe equality.
 */

export const LOGIN_CODE_TTL_MINUTES = 10;
export const LOGIN_CODE_MAX_ATTEMPTS = 5;
export const SESSION_TTL_DAYS = 7;
export const SESSION_COOKIE_NAME = 'member_session';

const MAX_CODE = 1000000; // 6 digits: 000000..999999

/** Cryptographically random 6-digit numeric code, zero-padded. */
export function generateLoginCode(): string {
  return randomInt(0, MAX_CODE).toString().padStart(6, '0');
}

/** SHA-256 hex digest of a code. The plaintext is never persisted. */
export function hashCode(code: string): string {
  return createHash('sha256').update(code, 'utf8').digest('hex');
}

/**
 * Creates a pending login code for a member. Returns the plaintext code (to be
 * sent over the channel) — it exists only in this response, never in the DB.
 */
export async function createLoginCode(
  clubId: string,
  memberId: string,
  channel: 'whatsapp' | 'email' | 'bypass'
): Promise<{ code: string; ttlMinutes: number }> {
  const code = generateLoginCode();
  const expiresAt = new Date(Date.now() + LOGIN_CODE_TTL_MINUTES * 60_000);

  // One active code per member: clear any previous pending ones first.
  await prisma.memberLoginCode.updateMany({
    where: { clubId, memberId, consumedAt: null },
    data: { consumedAt: new Date() },
  });

  await prisma.memberLoginCode.create({
    data: {
      clubId,
      memberId,
      codeHash: hashCode(code),
      channel,
      expiresAt,
      attempts: 0,
    },
  });

  return { code, ttlMinutes: LOGIN_CODE_TTL_MINUTES };
}

export type VerifyCodeResult =
  | { ok: true; channel: string }
  | { ok: false; reason: 'no_pending_code' | 'expired' | 'consumed' | 'too_many_attempts' | 'invalid_code' };

/**
 * Verifies and consumes a pending code. Failed attempts are counted; the code
 * locks after LOGIN_CODE_MAX_ATTEMPTS wrong tries.
 */
export async function verifyLoginCode(
  clubId: string,
  memberId: string,
  code: string
): Promise<VerifyCodeResult> {
  const pending = await prisma.memberLoginCode.findFirst({
    where: { clubId, memberId },
    orderBy: { createdAt: 'desc' },
  });

  if (!pending) {
    return { ok: false, reason: 'no_pending_code' };
  }

  if (pending.consumedAt) {
    return { ok: false, reason: 'consumed' };
  }

  if (pending.expiresAt.getTime() < Date.now()) {
    return { ok: false, reason: 'expired' };
  }

  if (pending.attempts >= LOGIN_CODE_MAX_ATTEMPTS) {
    return { ok: false, reason: 'too_many_attempts' };
  }

  const expected = Buffer.from(pending.codeHash, 'utf8');
  const received = Buffer.from(hashCode(code), 'utf8');
  const matches =
    expected.length === received.length && timingSafeEqual(expected, received);

  if (!matches) {
    await prisma.memberLoginCode.update({
      where: { id: pending.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false, reason: 'invalid_code' };
  }

  await prisma.memberLoginCode.update({
    where: { id: pending.id },
    data: { consumedAt: new Date() },
  });

  return { ok: true, channel: pending.channel };
}

interface SessionPayload {
  clubId: string;
  memberId: string;
  /** Epoch millis. */
  exp: number;
}

function getSessionSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    // Fail closed: never issue or accept a session without a signing key.
    throw new Error('NEXTAUTH_SECRET is not defined; cannot sign member sessions');
  }
  return secret;
}

function sign(payload: string): string {
  return createHmac('sha256', getSessionSecret()).update(payload).digest('base64url');
}

/** Issues the signed member-session cookie value (7 day expiry). */
export function issueSessionCookie(clubId: string, memberId: string): string {
  const payload: SessionPayload = {
    clubId,
    memberId,
    exp: Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `${encoded}.${sign(encoded)}`;
}

/**
 * Verifies a session cookie value. Returns the payload only when the HMAC
 * matches and the session has not expired; anything else is null (fail closed).
 */
export function verifySessionCookie(cookieValue: string | undefined | null): SessionPayload | null {
  if (!cookieValue || typeof cookieValue !== 'string') return null;

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return null;

  const dot = cookieValue.lastIndexOf('.');
  if (dot <= 0) return null;

  const encoded = cookieValue.slice(0, dot);
  const providedSig = cookieValue.slice(dot + 1);
  const expectedSig = sign(encoded);

  const a = Buffer.from(providedSig, 'utf8');
  const b = Buffer.from(expectedSig, 'utf8');
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8')
    ) as SessionPayload;

    if (
      typeof payload.clubId !== 'string' ||
      typeof payload.memberId !== 'string' ||
      typeof payload.exp !== 'number' ||
      payload.exp < Date.now()
    ) {
      return null;
    }

    return { clubId: payload.clubId, memberId: payload.memberId, exp: payload.exp };
  } catch {
    return null;
  }
}

export interface MemberSession {
  clubId: string;
  memberId: string;
  exp: number;
}

/**
 * Reads and validates the session from a request's Cookie header.
 * Returns null when missing/invalid — callers must treat that as unauthenticated.
 */
export function getSessionFromRequest(request: Request): MemberSession | null {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;

  for (const part of cookieHeader.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === SESSION_COOKIE_NAME) {
      return verifySessionCookie(decodeURIComponent(rest.join('=')));
    }
  }
  return null;
}

export type SessionGuardResult =
  | { ok: true }
  | { ok: false; status: 401 | 403; message: string; code: string };

const SESSION_REQUIRED: SessionGuardResult = {
  ok: false,
  status: 401,
  message: 'Sesión requerida. Ingresá con tu DNI y el código de verificación.',
  code: 'SESSION_REQUIRED',
};

/**
 * Phase 1: any valid member session must exist BEFORE the DNI is looked up.
 * Without this, 401-vs-404 would reveal which DNIs exist (enumeration oracle).
 */
export function requireAnySession(request: Request): SessionGuardResult {
  return getSessionFromRequest(request) ? { ok: true } : SESSION_REQUIRED;
}

/**
 * Phase 2: the session must be bound to the exact club+member being queried.
 * Guards every member data endpoint: without this, knowing a DNI was enough to
 * read someone else's fees/payments.
 *
 * - Valid cookie for another member or club → 403 (no data leaks either way).
 */
export function requireSessionFor(
  request: Request,
  clubId: string,
  memberId: string
): SessionGuardResult {
  const session = getSessionFromRequest(request);

  if (!session) {
    return SESSION_REQUIRED;
  }

  if (session.memberId !== memberId || session.clubId !== clubId) {
    return {
      ok: false,
      status: 403,
      message: 'Tu sesión no corresponde a este socio.',
      code: 'SESSION_MISMATCH',
    };
  }

  return { ok: true };
}
