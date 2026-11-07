import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockRequireInstitution, mockPrisma } = vi.hoisted(() => ({
  mockRequireInstitution: vi.fn(),
  mockPrisma: {
    member: { count: vi.fn() },
    payment: { aggregate: vi.fn() },
    fee: { aggregate: vi.fn(), findMany: vi.fn() },
    club: { count: vi.fn() },
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

import { GET } from '@/app/api/admin/kpis/route';

describe('GET /api/admin/kpis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns institution KPIs scoped to the institution', async () => {
    mockRequireInstitution.mockResolvedValue({ role: 'ADMIN', institutionId: 'club-1' });
    mockPrisma.member.count
      .mockResolvedValueOnce(10) // active
      .mockResolvedValueOnce(8); // up to date
    mockPrisma.payment.aggregate
      .mockResolvedValueOnce({ _sum: { amount: 1000 }, _count: { id: 5 } }) // current
      .mockResolvedValueOnce({ _sum: { amount: 800 }, _count: { id: 4 } }); // previous
    mockPrisma.fee.findMany.mockResolvedValue([
      { dueDate: new Date('2020-01-01'), amount: 100 },
      { dueDate: new Date('2020-01-01'), amount: 100 },
    ]);

    const res = await GET(new NextRequest('http://localhost/api/admin/kpis'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.platform).toBeNull();
    expect(body.institution.activeMembers).toBe(10);
    expect(body.institution.upToDateMembers).toBe(8);
    expect(body.institution.sociosAlDiaPercent).toBe(80);
    expect(body.institution.overdueFeesCount).toBe(2);

    // tenant scoping check
    expect(mockPrisma.payment.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ clubId: 'club-1' }),
      })
    );
    expect(mockPrisma.fee.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ clubId: 'club-1', status: 'OVERDUE' }),
      })
    );
  });

  it('returns platform KPIs for superadmin without institution', async () => {
    mockRequireInstitution.mockResolvedValue({ role: 'SUPER_ADMIN', institutionId: null });
    mockPrisma.club.count.mockResolvedValue(3);
    mockPrisma.payment.aggregate.mockResolvedValue({ _sum: { amount: 5000 }, _count: { id: 20 } });

    const res = await GET(new NextRequest('http://localhost/api/admin/kpis'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.institution).toBeNull();
    expect(body.platform.institutionsCount).toBe(3);
    expect(body.platform.totalCollectionsThisMonth).toBe(5000);
  });

  it('returns 401 when unauthenticated', async () => {
    mockRequireInstitution.mockRejectedValue(new (await import('@/lib/access')).AuthError(401, 'Not authenticated'));
    // ensure import loaded
    const res = await GET(new NextRequest('http://localhost/api/admin/kpis'));
    expect(res.status).toBe(401);
  });
});