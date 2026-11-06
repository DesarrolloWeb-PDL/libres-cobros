import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockRequireInstitution, mockPrisma } = vi.hoisted(() => ({
  mockRequireInstitution: vi.fn(),
  mockPrisma: {
    member: { findFirst: vi.fn(), update: vi.fn() },
  },
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/access', () => ({
  requireInstitution: mockRequireInstitution,
  AuthError: class AuthError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
      this.name = 'AuthError';
    }
  },
  institutionWhere: (id: string | null) => (id ? { clubId: id } : {}),
}));

import { POST as approvePost } from '@/app/api/admin/members/[id]/approve/route';
import { POST as rejectPost } from '@/app/api/admin/members/[id]/reject/route';

const PENDING_MEMBER = {
  id: 'm1',
  dni: '12345678',
  cuit: null,
  ivaCondicion: 'CF',
  firstName: 'Juan',
  lastName: 'Perez',
  email: 'juan@test.com',
  phone: '111',
  category: 'ADULT',
  planId: null,
  status: 'PENDING',
  joinDate: new Date('2026-01-01T00:00:00.000Z'),
  notes: null,
  plan: null,
};

function makeRequest(url: string) {
  return new NextRequest(url, { method: 'POST' });
}

function callParams(id = 'm1') {
  return { params: Promise.resolve({ id }) };
}

describe('member approval endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireInstitution.mockResolvedValue({ role: 'ADMIN', institutionId: 'club-1' });
  });

  it('approves a pending member (tenant-scoped)', async () => {
    mockPrisma.member.findFirst.mockResolvedValue(PENDING_MEMBER);
    mockPrisma.member.update.mockResolvedValue({ ...PENDING_MEMBER, status: 'ACTIVE' });

    const res = await approvePost(
      makeRequest('http://localhost/api/admin/members/m1/approve'),
      callParams()
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('ACTIVE');
    expect(mockPrisma.member.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'm1', clubId: 'club-1' } })
    );
    expect(mockPrisma.member.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'ACTIVE' } })
    );
  });

  it('approve is idempotent for already-active member', async () => {
    mockPrisma.member.findFirst.mockResolvedValue({ ...PENDING_MEMBER, status: 'ACTIVE' });

    const res = await approvePost(
      makeRequest('http://localhost/api/admin/members/m1/approve'),
      callParams()
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('ACTIVE');
    expect(mockPrisma.member.update).not.toHaveBeenCalled();
  });

  it('approve rejects non-pending member', async () => {
    mockPrisma.member.findFirst.mockResolvedValue({ ...PENDING_MEMBER, status: 'INACTIVE' });

    const res = await approvePost(
      makeRequest('http://localhost/api/admin/members/m1/approve'),
      callParams()
    );
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.code).toBe('MEMBER_NOT_PENDING');
  });

  it('approve returns 404 for unknown/foreign member', async () => {
    mockPrisma.member.findFirst.mockResolvedValue(null);

    const res = await approvePost(
      makeRequest('http://localhost/api/admin/members/m1/approve'),
      callParams()
    );
    expect(res.status).toBe(404);
  });

  it('rejects a pending member (sets INACTIVE)', async () => {
    mockPrisma.member.findFirst.mockResolvedValue(PENDING_MEMBER);
    mockPrisma.member.update.mockResolvedValue({ ...PENDING_MEMBER, status: 'INACTIVE' });

    const res = await rejectPost(
      makeRequest('http://localhost/api/admin/members/m1/reject'),
      callParams()
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('INACTIVE');
    expect(mockPrisma.member.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'INACTIVE' } })
    );
  });

  it('reject is idempotent for already-inactive member', async () => {
    mockPrisma.member.findFirst.mockResolvedValue({ ...PENDING_MEMBER, status: 'INACTIVE' });

    const res = await rejectPost(
      makeRequest('http://localhost/api/admin/members/m1/reject'),
      callParams()
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('INACTIVE');
    expect(mockPrisma.member.update).not.toHaveBeenCalled();
  });

  it('reject rejects non-pending (active) member', async () => {
    mockPrisma.member.findFirst.mockResolvedValue({ ...PENDING_MEMBER, status: 'ACTIVE' });

    const res = await rejectPost(
      makeRequest('http://localhost/api/admin/members/m1/reject'),
      callParams()
    );
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.code).toBe('MEMBER_NOT_PENDING');
  });

  it('returns 401 when unauthenticated', async () => {
    const AuthError = (await import('@/lib/access')).AuthError;
    mockRequireInstitution.mockRejectedValue(new AuthError(401, 'Not authenticated'));

    const res = await approvePost(
      makeRequest('http://localhost/api/admin/members/m1/approve'),
      callParams()
    );
    expect(res.status).toBe(401);
  });
});