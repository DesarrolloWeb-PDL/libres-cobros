import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockPrisma, mockGetEffectiveClub } = vi.hoisted(() => ({
  mockPrisma: {
    plan: { findFirst: vi.fn() },
    member: { findUnique: vi.fn(), create: vi.fn() },
  },
  mockGetEffectiveClub: vi.fn(),
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/access', () => ({ getEffectiveClub: mockGetEffectiveClub }));

import { POST } from '@/app/api/member/register/route';

const CLUB = { id: 'club-1', slug: 'test-club', status: 'ACTIVE' };

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/member/register', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('member self-registration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetEffectiveClub.mockResolvedValue(CLUB);
    mockPrisma.member.findUnique.mockResolvedValue(null);
    mockPrisma.member.create.mockResolvedValue({
      id: 'm1',
      dni: '12345678',
      firstName: 'Juan',
      lastName: 'Perez',
      email: 'juan@test.com',
      phone: '111',
      category: 'ADULT',
      status: 'PENDING',
      clubId: 'club-1',
      joinDate: new Date('2026-01-01T00:00:00.000Z'),
    });
  });

  it('creates a pending member scoped to the club', async () => {
    const res = await POST(
      makeRequest({
        dni: '12345678',
        firstName: 'Juan',
        lastName: 'Perez',
        email: 'juan@test.com',
        phone: '111',
        clubSlug: 'test-club',
      })
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.status).toBe('PENDING');
    expect(body.clubId).toBe('club-1');
    expect(mockPrisma.member.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ clubId: 'club-1', status: 'PENDING' }),
      })
    );
  });

  it('rejects duplicate DNI', async () => {
    mockPrisma.member.findUnique.mockResolvedValueOnce({ id: 'existing' });
    const res = await POST(
      makeRequest({ dni: '12345678', firstName: 'Juan', lastName: 'Perez', clubSlug: 'test-club' })
    );
    const body = await res.json();
    expect(res.status).toBe(409);
    expect(body.code).toBe('DUPLICATE_DNI');
  });

  it('rejects unknown institution', async () => {
    mockGetEffectiveClub.mockResolvedValue(null);
    const res = await POST(
      makeRequest({ dni: '12345678', firstName: 'Juan', lastName: 'Perez', clubSlug: 'nope' })
    );
    expect(res.status).toBe(404);
  });

  it('validates required fields', async () => {
    const res = await POST(makeRequest({ clubSlug: 'test-club' }));
    expect(res.status).toBe(400);
  });
});