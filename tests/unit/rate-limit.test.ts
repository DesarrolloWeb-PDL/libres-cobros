import { describe, it, expect, beforeEach } from 'vitest';
import { rateLimit } from '@/lib/rate-limit';

function makeRequest(ip = '127.0.0.1'): Request {
  return new Request('http://localhost/api/register', {
    headers: { 'x-forwarded-for': ip },
  });
}

describe('rateLimit', () => {
  beforeEach(() => {
    // Reset module state by re-importing is not trivial; instead we rely on
    // the sliding window cleaning stale entries over time. Tests here use
    // unique IPs or wait for the window to advance.
  });

  it('allows requests under the limit', () => {
    const request = makeRequest('10.0.0.1');
    const results: ReturnType<typeof rateLimit>[] = [];

    for (let i = 0; i < 5; i++) {
      results.push(rateLimit(request, { windowMs: 60_000, maxRequests: 5 }));
    }

    expect(results.every((r) => r.success)).toBe(true);
    expect(results[4].remaining).toBe(0);
  });

  it('blocks requests over the limit', () => {
    const request = makeRequest('10.0.0.2');

    for (let i = 0; i < 5; i++) {
      rateLimit(request, { windowMs: 60_000, maxRequests: 5 });
    }

    const blocked = rateLimit(request, { windowMs: 60_000, maxRequests: 5 });
    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it('uses x-real-ip when x-forwarded-for is missing', () => {
    const request = new Request('http://localhost/api/register', {
      headers: { 'x-real-ip': '192.168.1.1' },
    });

    const result = rateLimit(request, { windowMs: 60_000, maxRequests: 5 });
    expect(result.success).toBe(true);
  });

  it('falls back to unknown when no ip header is present', () => {
    const request = new Request('http://localhost/api/register');

    const result = rateLimit(request, { windowMs: 60_000, maxRequests: 5 });
    expect(result.success).toBe(true);
  });

  it('resets the counter after the window passes', async () => {
    const request = makeRequest('10.0.0.3');

    rateLimit(request, { windowMs: 50, maxRequests: 1 });
    await new Promise((resolve) => setTimeout(resolve, 60));

    const result = rateLimit(request, { windowMs: 50, maxRequests: 1 });
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(0);
  });
});
