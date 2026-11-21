import type { NextRequest } from 'next/server';

/**
 * Validates a scheduled cron invocation.
 *
 * Vercel sends the project's `CRON_SECRET` as `Authorization: Bearer <secret>`
 * on every cron trigger (see "Securing cron jobs" in the Vercel cron docs).
 * The legacy `x-cron-secret` header is also accepted so manual invocations
 * and older tooling keep working.
 *
 * Fails closed: if `CRON_SECRET` is not set in the environment, every
 * invocation is rejected — an unconfigured deployment must never run its
 * scheduled jobs unauthenticated.
 */
export function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const authorization = request.headers.get('authorization');
  if (authorization === `Bearer ${secret}`) return true;

  return request.headers.get('x-cron-secret') === secret;
}
