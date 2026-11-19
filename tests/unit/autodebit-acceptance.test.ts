import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockPrisma, mockGetEffectiveClub, mockGetClubSiteConfigValue, mockCreateMpPreapproval, mockCreateStripeSubscription } =
  vi.hoisted(() => ({
    mockPrisma: {
      member: { findUnique: vi.fn() },
      autoDebit: { findUnique: vi.fn(), upsert: vi.fn() },
      plan: { findFirst: vi.fn() },
    },
    mockGetEffectiveClub: vi.fn(),
    mockGetClubSiteConfigValue: vi.fn(),
    mockCreateMpPreapproval: vi.fn(),
    mockCreateStripeSubscription: vi.fn(),
  }));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/access', () => ({ getEffectiveClub: mockGetEffectiveClub }));
vi.mock('@/lib/site-config', () => ({ getClubSiteConfigValue: mockGetClubSiteConfigValue }));
vi.mock('@/lib/mercadopago', () => ({
  createMpPreapproval: mockCreateMpPreapproval,
  cancelMpPreapproval: vi.fn(),
}));
vi.mock('@/lib/stripe', () => ({
  createStripeSubscription: mockCreateStripeSubscription,
  cancelStripeSubscription: vi.fn(),
}));

import { POST } from '@/app/api/member/autodebit/route';

const CLUB = { id: 'c1', name: 'Club Test', slug: 'club-test' };
const MEMBER = {
  id: 'm1',
  clubId: 'c1',
  dni: '28111222',
  firstName: 'Juan',
  email: 'juan@test.com',
  planId: null,
};
const PLAN = { id: 'p1', clubId: 'c1', amount: 15000, isActive: true };

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/member/autodebit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/member/autodebit — aceptación del socio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetEffectiveClub.mockResolvedValue(CLUB);
    mockPrisma.member.findUnique.mockResolvedValue(MEMBER);
    mockPrisma.autoDebit.findUnique.mockResolvedValue(null);
    mockPrisma.plan.findFirst.mockResolvedValue(PLAN);
    mockGetClubSiteConfigValue.mockResolvedValue('mp-token');
    mockCreateMpPreapproval.mockResolvedValue({
      preapprovalId: 'pre-1',
      initPoint: 'https://mp.test/init',
    });
    mockPrisma.autoDebit.upsert.mockImplementation(({ create }: { create: Record<string, unknown> }) =>
      Promise.resolve({ id: 'ad1', nextBillingAt: null, ...create })
    );
  });

  it('rechaza la creación sin aceptación explícita del socio', async () => {
    const res = await POST(
      makeRequest({ dni: '28111222', clubSlug: 'club-test', gateway: 'mercadopago' })
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain('aceptación');
    expect(mockPrisma.autoDebit.upsert).not.toHaveBeenCalled();
    expect(mockCreateMpPreapproval).not.toHaveBeenCalled();
  });

  it('rechaza acceptance: false', async () => {
    const res = await POST(
      makeRequest({
        dni: '28111222',
        clubSlug: 'club-test',
        gateway: 'mercadopago',
        acceptance: false,
      })
    );

    expect(res.status).toBe(400);
    expect(mockPrisma.autoDebit.upsert).not.toHaveBeenCalled();
  });

  it('crea el débito registrando fecha y fuente de aceptación cuando acceptance es true', async () => {
    const res = await POST(
      makeRequest({
        dni: '28111222',
        clubSlug: 'club-test',
        gateway: 'mercadopago',
        acceptance: true,
      })
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.authorizationUrl).toBe('https://mp.test/init');

    const createPayload = mockPrisma.autoDebit.upsert.mock.calls[0][0].create;
    expect(createPayload.acceptedAt).toBeInstanceOf(Date);
    expect(createPayload.acceptanceSource).toBe('member');
    expect(body.autoDebit.acceptedAt).toBeTruthy();
    expect(body.autoDebit.acceptanceSource).toBe('member');
  });

  it('guarda acceptanceSource=member también en el flujo Stripe', async () => {
    mockCreateStripeSubscription.mockResolvedValue({
      subscriptionId: 'sub_1',
      customerPortalUrl: 'https://stripe.test/portal',
    });

    const res = await POST(
      makeRequest({
        dni: '28111222',
        clubSlug: 'club-test',
        gateway: 'stripe',
        acceptance: true,
      })
    );

    expect(res.status).toBe(200);
    const createPayload = mockPrisma.autoDebit.upsert.mock.calls[0][0].create;
    expect(createPayload.acceptanceSource).toBe('member');
    expect(createPayload.acceptedAt).toBeInstanceOf(Date);
  });
});
