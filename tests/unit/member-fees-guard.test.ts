import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockPrisma, mockGetEffectiveClub } = vi.hoisted(() => ({
  mockPrisma: {
    member: { findUnique: vi.fn() },
    fee: { findMany: vi.fn() },
  },
  mockGetEffectiveClub: vi.fn(),
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/access', () => ({ getEffectiveClub: mockGetEffectiveClub }));

import { GET } from '@/app/api/member/fees/route';
import { issueSessionCookie } from '@/lib/member-auth';

process.env.NEXTAUTH_SECRET = 'fees-guard-test-secret';

const CLUB = { id: 'c1', slug: 'club-test', status: 'ACTIVE' };
const MEMBER = { id: 'm1', clubId: 'c1', dni: '28111222', firstName: 'Juan', lastName: 'Perez', email: null };

function makeRequest(cookie?: string) {
  const url = 'http://localhost/api/member/fees?dni=28111222&clubSlug=club-test';
  return new NextRequest(url, {
    headers: cookie ? { cookie } : {},
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetEffectiveClub.mockResolvedValue(CLUB);
  mockPrisma.member.findUnique.mockResolvedValue(MEMBER);
  mockPrisma.fee.findMany.mockResolvedValue([]);
});

describe('GET /api/member/fees — guardia de sesión', () => {
  it('401 sin cookie de sesión', async () => {
    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.code).toBe('SESSION_REQUIRED');
    expect(mockPrisma.fee.findMany).not.toHaveBeenCalled();
  });

  it('401 con cookie basura o manipulada', async () => {
    const res = await GET(makeRequest('member_session=forjado.abc'));
    expect(res.status).toBe(401);
    expect(mockPrisma.fee.findMany).not.toHaveBeenCalled();
  });

  it('403 con cookie válida pero de OTRO socio', async () => {
    const res = await GET(makeRequest(`member_session=${issueSessionCookie('c1', 'otro-socio')}`));
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.code).toBe('SESSION_MISMATCH');
    expect(mockPrisma.fee.findMany).not.toHaveBeenCalled();
  });

  it('403 con cookie válida pero de OTRO club', async () => {
    const res = await GET(makeRequest(`member_session=${issueSessionCookie('club-otro', 'm1')}`));

    expect(res.status).toBe(403);
    expect(mockPrisma.fee.findMany).not.toHaveBeenCalled();
  });

  it('200 con cookie válida para el socio y club correctos', async () => {
    const res = await GET(makeRequest(`member_session=${issueSessionCookie('c1', 'm1')}`));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.member.dni).toBe('28111222');
    expect(mockPrisma.fee.findMany).toHaveBeenCalled();
  });

  it('401 sin cookie: también para DNI inexistente (sin fuga 401-vs-404)', async () => {
    mockPrisma.member.findUnique.mockResolvedValue(null);

    const res = await GET(makeRequest());

    expect(res.status).toBe(401);
    expect(mockPrisma.member.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.fee.findMany).not.toHaveBeenCalled();
  });

  it('el DNI sigue validándose con sesión: 404 si el socio no existe', async () => {
    mockPrisma.member.findUnique.mockResolvedValue(null);

    const res = await GET(makeRequest(`member_session=${issueSessionCookie('c1', 'm1')}`));

    expect(res.status).toBe(404);
  });
});
