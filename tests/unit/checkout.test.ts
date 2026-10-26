import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const {
  mockPrisma,
  mockGetEffectiveClub,
  mockGetClubSiteConfigValues,
  mockCreateStripeCheckoutSession,
  mockCreateMercadoPagoPreference,
} = vi.hoisted(() => ({
  mockPrisma: {
    club: { findFirst: vi.fn() },
    member: { findUnique: vi.fn() },
    fee: { findUnique: vi.fn() },
    payment: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn().mockResolvedValue(undefined),
    },
  },
  mockGetEffectiveClub: vi.fn(),
  mockGetClubSiteConfigValues: vi.fn(),
  mockCreateStripeCheckoutSession: vi.fn(),
  mockCreateMercadoPagoPreference: vi.fn(),
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/access', () => ({ getEffectiveClub: mockGetEffectiveClub }));
vi.mock('@/lib/site-config', () => ({ getClubSiteConfigValues: mockGetClubSiteConfigValues }));
vi.mock('@/lib/stripe', () => ({ createStripeCheckoutSession: mockCreateStripeCheckoutSession }));
vi.mock('@/lib/mercadopago', () => ({
  createMercadoPagoPreference: mockCreateMercadoPagoPreference,
}));

import { GET, POST } from '@/app/api/checkout/route';

const CLUB_ID = 'club-1';
const MEMBER_ID = 'cm1x9x7x7x7x7x7x7x7x7x7a';
const FEE_ID = 'cm1x9x7x7x7x7x7x7x7x7x7b';
const PAYMENT_ID = 'cm1x9x7x7x7x7x7x7x7x7x7c';

function makeClub(overrides?: Partial<{ id: string; slug: string; status: string }>) {
  return {
    id: CLUB_ID,
    slug: 'test-club',
    status: 'ACTIVE',
    ...overrides,
  };
}

function makeMember() {
  return {
    id: MEMBER_ID,
    clubId: CLUB_ID,
    dni: '12345678',
    firstName: 'Juan',
    lastName: 'Pérez',
  };
}

function makeFee(overrides?: Partial<{ status: string }>) {
  return {
    id: FEE_ID,
    clubId: CLUB_ID,
    memberId: MEMBER_ID,
    amount: 1000,
    status: 'PENDING',
    member: makeMember(),
    ...overrides,
  };
}

function makeGetRequest(clubSlug: string) {
  return new NextRequest(`http://localhost/api/checkout?clubSlug=${clubSlug}`);
}

function makePostRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/checkout', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('checkout GET', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetEffectiveClub.mockResolvedValue(makeClub());
  });

  it('hides a method when its enabled flag is explicitly false', async () => {
    mockGetClubSiteConfigValues.mockResolvedValue({
      stripe_secret_key: 'sk_test_xxx',
      stripe_enabled: 'false',
      mercadopago_access_token: 'APP_USR-xxx',
      mercadopago_enabled: 'false',
      bank_alias: 'alias.test',
      bank_cbu: '1234567890123456789012',
      bank_transfer_enabled: 'false',
    });

    const response = await GET(makeGetRequest('test-club'));
    const body = await response.json();

    expect(body.data).toEqual({
      stripe: false,
      mercadopago: false,
      bank_transfer: false,
    });
  });

  it('keeps methods visible when the enabled flag is absent (backward compatible)', async () => {
    mockGetClubSiteConfigValues.mockResolvedValue({
      stripe_secret_key: 'sk_test_xxx',
      mercadopago_access_token: 'APP_USR-xxx',
      bank_alias: 'alias.test',
    });

    const response = await GET(makeGetRequest('test-club'));
    const body = await response.json();

    expect(body.data).toEqual({
      stripe: true,
      mercadopago: true,
      bank_transfer: true,
    });
  });

  it('keeps methods visible when the enabled flag is true', async () => {
    mockGetClubSiteConfigValues.mockResolvedValue({
      stripe_secret_key: 'sk_test_xxx',
      stripe_enabled: 'true',
      mercadopago_access_token: 'APP_USR-xxx',
      mercadopago_enabled: 'true',
      bank_cbu: '1234567890123456789012',
      bank_transfer_enabled: 'true',
    });

    const response = await GET(makeGetRequest('test-club'));
    const body = await response.json();

    expect(body.data).toEqual({
      stripe: true,
      mercadopago: true,
      bank_transfer: true,
    });
  });

  it('still hides a method when it has no credentials even if enabled flag is true', async () => {
    mockGetClubSiteConfigValues.mockResolvedValue({
      stripe_secret_key: '',
      stripe_enabled: 'true',
      mercadopago_access_token: '',
      mercadopago_enabled: 'true',
      bank_alias: '',
      bank_cbu: '',
      bank_transfer_enabled: 'true',
    });

    const response = await GET(makeGetRequest('test-club'));
    const body = await response.json();

    expect(body.data).toEqual({
      stripe: false,
      mercadopago: false,
      bank_transfer: false,
    });
  });
});

describe('checkout POST', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetEffectiveClub.mockResolvedValue(makeClub());
    mockPrisma.member.findUnique.mockResolvedValue(makeMember());
    mockPrisma.fee.findUnique.mockResolvedValue(makeFee());
    mockPrisma.payment.create.mockResolvedValue({
      id: PAYMENT_ID,
      clubId: CLUB_ID,
      feeId: FEE_ID,
      memberId: MEMBER_ID,
      amount: 1000,
      method: 'stripe',
      status: 'PENDING',
      bankTransferRef: null,
    });
  });

  it('rejects a disabled Stripe payment with PAYMENT_METHOD_DISABLED before creating a Payment', async () => {
    mockGetClubSiteConfigValues.mockResolvedValue({
      stripe_secret_key: 'sk_test_xxx',
      stripe_enabled: 'false',
    });

    const response = await POST(
      makePostRequest({
        feeId: FEE_ID,
        method: 'stripe',
        memberDni: '12345678',
        institutionSlug: 'test-club',
      })
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.code).toBe('PAYMENT_METHOD_DISABLED');
    expect(mockPrisma.payment.create).not.toHaveBeenCalled();
  });

  it('rejects a disabled Mercado Pago payment with PAYMENT_METHOD_DISABLED before creating a Payment', async () => {
    mockGetClubSiteConfigValues.mockResolvedValue({
      mercadopago_access_token: 'APP_USR-xxx',
      mercadopago_enabled: 'false',
    });

    const response = await POST(
      makePostRequest({
        feeId: FEE_ID,
        method: 'mercadopago',
        memberDni: '12345678',
        institutionSlug: 'test-club',
      })
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.code).toBe('PAYMENT_METHOD_DISABLED');
    expect(mockPrisma.payment.create).not.toHaveBeenCalled();
  });

  it('rejects a disabled bank transfer with PAYMENT_METHOD_DISABLED before creating a Payment', async () => {
    mockGetClubSiteConfigValues.mockResolvedValue({
      bank_alias: 'alias.test',
      bank_cbu: '1234567890123456789012',
      bank_transfer_enabled: 'false',
    });

    const response = await POST(
      makePostRequest({
        feeId: FEE_ID,
        method: 'bank_transfer',
        memberDni: '12345678',
        institutionSlug: 'test-club',
      })
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.code).toBe('PAYMENT_METHOD_DISABLED');
    expect(mockPrisma.payment.create).not.toHaveBeenCalled();
  });

  it('rejects bank transfer when no account details are configured', async () => {
    mockGetClubSiteConfigValues.mockResolvedValue({
      bank_alias: '',
      bank_cbu: '',
      bank_transfer_enabled: 'true',
    });

    const response = await POST(
      makePostRequest({
        feeId: FEE_ID,
        method: 'bank_transfer',
        memberDni: '12345678',
        institutionSlug: 'test-club',
      })
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.code).toBe('BANK_TRANSFER_NOT_CONFIGURED');
    expect(mockPrisma.payment.create).not.toHaveBeenCalled();
  });

  it('creates a Stripe checkout when the method is enabled and configured', async () => {
    mockGetClubSiteConfigValues.mockResolvedValue({
      stripe_secret_key: 'sk_test_xxx',
      stripe_enabled: 'true',
    });
    mockCreateStripeCheckoutSession.mockResolvedValue({
      sessionId: 'cs_test_xxx',
      url: 'https://checkout.stripe.com/pay/cs_test_xxx',
    });

    const response = await POST(
      makePostRequest({
        feeId: FEE_ID,
        method: 'stripe',
        memberDni: '12345678',
        institutionSlug: 'test-club',
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.checkoutUrl).toBe('https://checkout.stripe.com/pay/cs_test_xxx');
    expect(mockPrisma.payment.create).toHaveBeenCalledTimes(1);
    expect(mockCreateStripeCheckoutSession).toHaveBeenCalledTimes(1);
  });

  it('creates a Mercado Pago preference when the method is enabled and configured', async () => {
    mockPrisma.payment.create.mockResolvedValue({
      id: PAYMENT_ID,
      clubId: CLUB_ID,
      feeId: FEE_ID,
      memberId: MEMBER_ID,
      amount: 1000,
      method: 'mercadopago',
      status: 'PENDING',
      bankTransferRef: null,
    });
    mockGetClubSiteConfigValues.mockResolvedValue({
      mercadopago_access_token: 'APP_USR-xxx',
      mercadopago_enabled: 'true',
    });
    mockCreateMercadoPagoPreference.mockResolvedValue({
      preferenceId: 'pref_xxx',
      initPoint: 'https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=pref_xxx',
    });

    const response = await POST(
      makePostRequest({
        feeId: FEE_ID,
        method: 'mercadopago',
        memberDni: '12345678',
        institutionSlug: 'test-club',
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.checkoutUrl).toBe(
      'https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=pref_xxx'
    );
    expect(mockPrisma.payment.create).toHaveBeenCalledTimes(1);
    expect(mockCreateMercadoPagoPreference).toHaveBeenCalledTimes(1);
  });

  it('creates a bank transfer payment when the method is enabled and configured', async () => {
    mockPrisma.payment.create.mockResolvedValue({
      id: PAYMENT_ID,
      clubId: CLUB_ID,
      feeId: FEE_ID,
      memberId: MEMBER_ID,
      amount: 1000,
      method: 'bank_transfer',
      status: 'PENDING',
      bankTransferRef: 'TR-1234567890-ABCDEF',
    });
    mockGetClubSiteConfigValues.mockResolvedValue({
      bank_alias: 'alias.test',
      bank_cbu: '1234567890123456789012',
      bank_transfer_enabled: 'true',
      bank_cuit: '30123456789',
      bank_name: 'Banco Test',
      bank_holder: 'Club Test',
    });

    const response = await POST(
      makePostRequest({
        feeId: FEE_ID,
        method: 'bank_transfer',
        memberDni: '12345678',
        institutionSlug: 'test-club',
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.method).toBe('bank_transfer');
    expect(body.bankTransfer).toBeDefined();
    expect(mockPrisma.payment.create).toHaveBeenCalledTimes(1);
  });
});
