/**
 * Lightweight in-memory rate limiter for public endpoints.
 *
 * Designed for serverless environments where Redis may not be configured.
 * Uses the request IP (falls back to a placeholder) and a sliding window.
 *
 * NOTE: Memory is not shared across instances/deploys, so this only slows
 * down a single actor against one process. For production scale, swap this
 * for Upstash Redis or a similar shared store.
 */

interface LimiterEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, LimiterEntry>();

function cleanup(now: number): void {
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
}

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  // Fallback when running outside Vercel/NGINX.
  return request.headers.get('x-real-ip') ?? 'unknown';
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

export function rateLimit(
  request: Request,
  options: { windowMs?: number; maxRequests?: number } = {}
): RateLimitResult {
  const windowMs = options.windowMs ?? 60_000; // 1 minute
  const maxRequests = options.maxRequests ?? 5;
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const resetAt = windowStart + windowMs;
  const ip = getClientIp(request);
  const key = `${ip}:${Math.floor(windowStart / windowMs)}`;

  // Best-effort cleanup to prevent unbounded growth.
  cleanup(now);

  const existing = store.get(key);
  const count = existing && existing.resetAt > now ? existing.count + 1 : 1;
  store.set(key, { count, resetAt });

  return {
    success: count <= maxRequests,
    limit: maxRequests,
    remaining: Math.max(0, maxRequests - count),
    resetAt,
  };
}
