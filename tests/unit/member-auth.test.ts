import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHmac } from 'node:crypto';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    memberLoginCode: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));

import {
  generateLoginCode,
  hashCode,
  createLoginCode,
  verifyLoginCode,
  issueSessionCookie,
  verifySessionCookie,
} from '@/lib/member-auth';

const SECRET = 'test-secret-for-session-signing';

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXTAUTH_SECRET = SECRET;
});

describe('generateLoginCode', () => {
  it('genera 6 dígitos numéricos (≤8 chars como pidió el usuario)', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateLoginCode();
      expect(code).toMatch(/^\d{6}$/);
      expect(code.length).toBeLessThanOrEqual(8);
    }
  });

  it('no devuelve siempre el mismo código', () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateLoginCode()));
    expect(codes.size).toBeGreaterThan(1);
  });
});

describe('hashCode', () => {
  it('es SHA-256 hex y determinista', () => {
    const h1 = hashCode('123456');
    const h2 = hashCode('123456');
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
    expect(hashCode('123457')).not.toBe(h1);
  });

  it('no revela el código original', () => {
    expect(hashCode('123456')).not.toContain('123456');
  });
});

describe('createLoginCode', () => {
  it('guarda solo el hash, con expiración de 10 minutos y intentos en 0', async () => {
    mockPrisma.memberLoginCode.create.mockResolvedValue({ id: 'c1' });

    const result = await createLoginCode('club-1', 'm1', 'whatsapp');

    expect(result.code).toMatch(/^\d{6}$/);
    const stored = mockPrisma.memberLoginCode.create.mock.calls[0][0].data;
    expect(stored.codeHash).toBe(hashCode(result.code));
    expect(stored.codeHash).not.toBe(result.code);
    expect(stored.attempts).toBe(0);
    expect(stored.channel).toBe('whatsapp');
    const ttlMs = new Date(stored.expiresAt).getTime() - Date.now();
    expect(ttlMs).toBeGreaterThan(9 * 60 * 1000);
    expect(ttlMs).toBeLessThanOrEqual(10 * 60 * 1000);
    expect(result.ttlMinutes).toBe(10);
  });
});

describe('verifyLoginCode', () => {
  const baseRow = {
    id: 'c1',
    clubId: 'club-1',
    memberId: 'm1',
    channel: 'whatsapp',
    attempts: 0,
    consumedAt: null as Date | null,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  };

  it('acepta el código correcto y lo consume', async () => {
    const code = '654321';
    mockPrisma.memberLoginCode.findFirst.mockResolvedValue({
      ...baseRow,
      codeHash: hashCode(code),
    });
    mockPrisma.memberLoginCode.update.mockResolvedValue({});

    const result = await verifyLoginCode('club-1', 'm1', code);

    expect(result.ok).toBe(true);
    expect(mockPrisma.memberLoginCode.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'c1' },
        data: expect.objectContaining({ consumedAt: expect.any(Date) }),
      })
    );
  });

  it('rechaza código incorrecto e incrementa intentos', async () => {
    mockPrisma.memberLoginCode.findFirst.mockResolvedValue({
      ...baseRow,
      codeHash: hashCode('111111'),
    });
    mockPrisma.memberLoginCode.update.mockResolvedValue({});

    const result = await verifyLoginCode('club-1', 'm1', '999999');

    expect(result).toEqual({ ok: false, reason: 'invalid_code' });
    expect(mockPrisma.memberLoginCode.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { attempts: { increment: 1 } },
      })
    );
    expect(mockPrisma.memberLoginCode.update).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ consumedAt: expect.any(Date) }),
      })
    );
  });

  it('rechaza código expirado', async () => {
    mockPrisma.memberLoginCode.findFirst.mockResolvedValue({
      ...baseRow,
      codeHash: hashCode('123456'),
      expiresAt: new Date(Date.now() - 1000),
    });

    const result = await verifyLoginCode('club-1', 'm1', '123456');

    expect(result).toEqual({ ok: false, reason: 'expired' });
    expect(mockPrisma.memberLoginCode.update).not.toHaveBeenCalled();
  });

  it('rechaza si el código ya fue consumido', async () => {
    mockPrisma.memberLoginCode.findFirst.mockResolvedValue({
      ...baseRow,
      codeHash: hashCode('123456'),
      consumedAt: new Date(),
    });

    const result = await verifyLoginCode('club-1', 'm1', '123456');

    expect(result).toEqual({ ok: false, reason: 'consumed' });
  });

  it('rechaza tras agotar los 5 intentos', async () => {
    mockPrisma.memberLoginCode.findFirst.mockResolvedValue({
      ...baseRow,
      codeHash: hashCode('123456'),
      attempts: 5,
    });

    const result = await verifyLoginCode('club-1', 'm1', '123456');

    expect(result).toEqual({ ok: false, reason: 'too_many_attempts' });
    expect(mockPrisma.memberLoginCode.update).not.toHaveBeenCalled();
  });

  it('rechaza si no hay código pendiente', async () => {
    mockPrisma.memberLoginCode.findFirst.mockResolvedValue(null);

    const result = await verifyLoginCode('club-1', 'm1', '123456');

    expect(result).toEqual({ ok: false, reason: 'no_pending_code' });
  });
});

describe('session cookie', () => {
  it('emite una cookie firmada con clubId, memberId y expiración de 7 días', () => {
    const cookie = issueSessionCookie('club-1', 'm1');

    // base64url has no '=' padding; structure is payload.signature
    expect(cookie).toContain('.');
    expect(cookie.split('.')[0]).not.toContain('club-1'); // payload va codificado

    const parsed = verifySessionCookie(cookie);
    expect(parsed).toEqual({ clubId: 'club-1', memberId: 'm1', exp: expect.any(Number) });
    expect(parsed!.exp).toBeGreaterThan(Date.now());
  });

  it('rechaza cookies manipuladas (payload alterado)', () => {
    const cookie = issueSessionCookie('club-1', 'm1');
    const [payload, sig] = cookie.split('.');
    const tampered = Buffer.from(
      JSON.stringify({ clubId: 'club-evil', memberId: 'm1', exp: Date.now() + 100000 })
    ).toString('base64url');

    expect(verifySessionCookie(`${tampered}.${sig}`)).toBeNull();
    expect(verifySessionCookie(`${payload}.deadbeef`)).toBeNull();
  });

  it('rechaza cookies expiradas', () => {
    const past = Buffer.from(
      JSON.stringify({ clubId: 'c', memberId: 'm', exp: Date.now() - 1000 })
    ).toString('base64url');
    const sig = createHmac('sha256', SECRET).update(past).digest('base64url');

    expect(verifySessionCookie(`${past}.${sig}`)).toBeNull();
  });

  it('rechaza strings basura y vacíos', () => {
    expect(verifySessionCookie('')).toBeNull();
    expect(verifySessionCookie('no-signature')).toBeNull();
    expect(verifySessionCookie('a.b.c')).toBeNull();
    expect(verifySessionCookie(undefined as unknown as string)).toBeNull();
  });

  it('falla cerrado si falta NEXTAUTH_SECRET', () => {
    delete process.env.NEXTAUTH_SECRET;
    expect(() => issueSessionCookie('c', 'm')).toThrow();
    expect(verifySessionCookie('anything.anything')).toBeNull();
  });
});
