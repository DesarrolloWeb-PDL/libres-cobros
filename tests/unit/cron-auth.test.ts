import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { authorizeCron } from '@/lib/cron-auth';

const SECRET = 'test-cron-secret-123';

function makeRequest(headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost/api/cron/fees', { headers });
}

beforeEach(() => {
  process.env.CRON_SECRET = SECRET;
});

afterEach(() => {
  delete process.env.CRON_SECRET;
});

describe('authorizeCron', () => {
  it('acepta el header Authorization: Bearer que envía Vercel (oficial)', () => {
    const req = makeRequest({ authorization: `Bearer ${SECRET}` });
    expect(authorizeCron(req)).toBe(true);
  });

  it('acepta el header legado x-cron-secret (invocaciones manuales)', () => {
    const req = makeRequest({ 'x-cron-secret': SECRET });
    expect(authorizeCron(req)).toBe(true);
  });

  it('rechaza un Bearer incorrecto', () => {
    const req = makeRequest({ authorization: 'Bearer otro-secreto' });
    expect(authorizeCron(req)).toBe(false);
  });

  it('rechaza ambos headers incorrectos', () => {
    const req = makeRequest({
      authorization: 'Bearer malo',
      'x-cron-secret': 'tambien-malo',
    });
    expect(authorizeCron(req)).toBe(false);
  });

  it('rechaza requests sin ningún header', () => {
    expect(authorizeCron(makeRequest())).toBe(false);
  });

  it('falla cerrado si CRON_SECRET no está definido (aunque manden el header correcto)', () => {
    delete process.env.CRON_SECRET;
    const req = makeRequest({ authorization: `Bearer ${SECRET}` });
    expect(authorizeCron(req)).toBe(false);
  });

  it('no acepta un CRON_SECRET con espacios (pegado accidental en la env var)', () => {
    // The Headers API trims whitespace from header values (HTTP spec), so the
    // realistic failure is a dirty env var: Vercel docs warn that trailing
    // spaces in CRON_SECRET make every invocation return 401.
    process.env.CRON_SECRET = `${SECRET} `;
    const req = makeRequest({ authorization: `Bearer ${SECRET}` });
    expect(authorizeCron(req)).toBe(false);
  });
});
