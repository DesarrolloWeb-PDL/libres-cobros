import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const {
  mockPrisma,
  mockGetEffectiveClub,
  mockGetClubSiteConfigValue,
  mockSendWhatsAppMessage,
  mockSendEmail,
  mockRateLimit,
  mockVerifyLoginCode,
  mockCreateLoginCode,
  mockIssueSessionCookie,
  mockGetSessionFromRequest,
} = vi.hoisted(() => ({
  mockPrisma: {
    member: { findUnique: vi.fn() },
    memberLoginCode: { updateMany: vi.fn(), create: vi.fn() },
  },
  mockGetEffectiveClub: vi.fn(),
  mockGetClubSiteConfigValue: vi.fn(),
  mockSendWhatsAppMessage: vi.fn(),
  mockSendEmail: vi.fn(),
  mockRateLimit: vi.fn(),
  mockVerifyLoginCode: vi.fn(),
  mockCreateLoginCode: vi.fn(),
  mockIssueSessionCookie: vi.fn(),
  mockGetSessionFromRequest: vi.fn(),
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/access', () => ({ getEffectiveClub: mockGetEffectiveClub }));
vi.mock('@/lib/site-config', () => ({ getClubSiteConfigValue: mockGetClubSiteConfigValue }));
vi.mock('@/lib/whatsapp', () => ({ sendWhatsAppMessage: mockSendWhatsAppMessage }));
vi.mock('@/lib/email', () => ({ sendEmail: mockSendEmail }));
vi.mock('@/lib/rate-limit', () => ({ rateLimit: mockRateLimit }));
vi.mock('@/lib/member-auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/member-auth')>();
  return {
    ...actual,
    verifyLoginCode: mockVerifyLoginCode,
    createLoginCode: mockCreateLoginCode,
    issueSessionCookie: mockIssueSessionCookie,
    getSessionFromRequest: mockGetSessionFromRequest,
  };
});

import { POST as requestCode } from '@/app/api/member/auth/request-code/route';
import { POST as verifyCode } from '@/app/api/member/auth/verify-code/route';
import { POST as logout } from '@/app/api/member/auth/logout/route';

const CLUB = { id: 'c1', name: 'Club Test', slug: 'club-test', status: 'ACTIVE' };
const MEMBER = {
  id: 'm1',
  clubId: 'c1',
  dni: '28111222',
  firstName: 'Juan',
  phone: '543772123456',
  email: 'juan@test.com',
};

function jsonRequest(url: string, body: unknown, method = 'POST') {
  return new NextRequest(`http://localhost${url}`, {
    method,
    headers: { 'Content-Type': 'application/json', cookie: 'member_session=abc.def' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRateLimit.mockReturnValue({ success: true, limit: 5, remaining: 4, resetAt: Date.now() + 60000 });
  mockGetEffectiveClub.mockResolvedValue(CLUB);
  mockPrisma.member.findUnique.mockResolvedValue(MEMBER);
  mockPrisma.memberLoginCode.updateMany.mockResolvedValue({});
  mockPrisma.memberLoginCode.create.mockResolvedValue({});
  mockCreateLoginCode.mockResolvedValue({ code: '123456', ttlMinutes: 10 });
  mockSendWhatsAppMessage.mockResolvedValue({ externalId: 'wamid.1' });
  mockIssueSessionCookie.mockReturnValue('payload.sig');
  mockGetSessionFromRequest.mockReturnValue(null);
  // Default: club has WhatsApp configured, no OTP template (free text)
  mockGetClubSiteConfigValue.mockImplementation((_clubId: string, key: string) => {
    if (key === 'whatsapp_phone_number_id') return Promise.resolve('phone-id');
    if (key === 'whatsapp_access_token') return Promise.resolve('token');
    if (key === 'resend_api_key') return Promise.resolve('');
    if (key === 'portal_otp_enabled') return Promise.resolve('');
    return Promise.resolve('');
  });
});

describe('POST /api/member/auth/request-code', () => {
  it('rate limitea y devuelve 429 cuando se excede', async () => {
    mockRateLimit.mockReturnValue({ success: false, limit: 5, remaining: 0, resetAt: Date.now() + 60000 });

    const res = await requestCode(jsonRequest('/api/member/auth/request-code', {
      dni: '28111222', clubSlug: 'club-test',
    }));

    expect(res.status).toBe(429);
    expect(mockCreateLoginCode).not.toHaveBeenCalled();
  });

  it('envía el código por WhatsApp con plantilla cuando está configurada', async () => {
    mockGetClubSiteConfigValue.mockImplementation((_clubId: string, key: string) => {
      if (key === 'whatsapp_phone_number_id') return Promise.resolve('phone-id');
      if (key === 'whatsapp_access_token') return Promise.resolve('token');
      if (key === 'whatsapp_otp_template_name') return Promise.resolve('codigo_acceso');
      if (key === 'whatsapp_template_language') return Promise.resolve('es_AR');
      return Promise.resolve('');
    });

    const res = await requestCode(jsonRequest('/api/member/auth/request-code', {
      dni: '28111222', clubSlug: 'club-test',
    }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.otpRequired).toBe(true);
    expect(body.message).toBe('Si el DNI corresponde a un socio, recibirás un código.');
    expect(mockSendWhatsAppMessage).toHaveBeenCalledWith(
      'phone-id',
      'token',
      '543772123456',
      expect.stringContaining('123456'),
      expect.objectContaining({ name: 'codigo_acceso', language: 'es_AR', parameters: ['123456'] })
    );
    expect(mockCreateLoginCode).toHaveBeenCalledWith('c1', 'm1', 'whatsapp');
  });

  it('respuesta idéntica (anti-enumeración) cuando el DNI no existe', async () => {
    mockPrisma.member.findUnique.mockResolvedValue(null);

    const res = await requestCode(jsonRequest('/api/member/auth/request-code', {
      dni: '99999999', clubSlug: 'club-test',
    }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.otpRequired).toBe(true);
    expect(body.message).toBe('Si el DNI corresponde a un socio, recibirás un código.');
    expect(mockCreateLoginCode).not.toHaveBeenCalled();
    expect(mockSendWhatsAppMessage).not.toHaveBeenCalled();
  });

  it('sin canal configurado en el club → bypass: emite cookie y otpRequired=false', async () => {
    mockGetClubSiteConfigValue.mockResolvedValue('');

    const res = await requestCode(jsonRequest('/api/member/auth/request-code', {
      dni: '28111222', clubSlug: 'club-test',
    }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.otpRequired).toBe(false);
    expect(mockIssueSessionCookie).toHaveBeenCalledWith('c1', 'm1');
    expect(mockCreateLoginCode).not.toHaveBeenCalled();
    expect(res.headers.get('set-cookie')).toContain('member_session=');
  });

  it('portal_otp_enabled=false → bypass (kill switch por institución)', async () => {
    mockGetClubSiteConfigValue.mockImplementation((_clubId: string, key: string) => {
      if (key === 'portal_otp_enabled') return Promise.resolve('false');
      if (key === 'whatsapp_phone_number_id') return Promise.resolve('phone-id');
      if (key === 'whatsapp_access_token') return Promise.resolve('token');
      return Promise.resolve('');
    });

    const res = await requestCode(jsonRequest('/api/member/auth/request-code', {
      dni: '28111222', clubSlug: 'club-test',
    }));
    const body = await res.json();

    expect(body.otpRequired).toBe(false);
    expect(mockIssueSessionCookie).toHaveBeenCalled();
    expect(mockSendWhatsAppMessage).not.toHaveBeenCalled();
  });

  it('fallback a email si el socio no tiene teléfono pero hay Resend', async () => {
    mockPrisma.member.findUnique.mockResolvedValue({ ...MEMBER, phone: null });
    mockGetClubSiteConfigValue.mockImplementation((_clubId: string, key: string) => {
      if (key === 'whatsapp_phone_number_id') return Promise.resolve('phone-id');
      if (key === 'whatsapp_access_token') return Promise.resolve('token');
      if (key === 'resend_api_key') return Promise.resolve('re_key');
      if (key === 'resend_from_email') return Promise.resolve('no-reply@test.com');
      return Promise.resolve('');
    });

    const res = await requestCode(jsonRequest('/api/member/auth/request-code', {
      dni: '28111222', clubSlug: 'club-test',
    }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.otpRequired).toBe(true);
    expect(mockSendEmail).toHaveBeenCalledWith(
      're_key', 'no-reply@test.com', 'juan@test.com',
      expect.any(String), expect.stringContaining('123456')
    );
    expect(mockCreateLoginCode).toHaveBeenCalledWith('c1', 'm1', 'email');
  });

  it('fallo transitorio del envío con canal configurado → fail-closed (502)', async () => {
    mockSendWhatsAppMessage.mockRejectedValue(new Error('Meta API caída'));

    const res = await requestCode(jsonRequest('/api/member/auth/request-code', {
      dni: '28111222', clubSlug: 'club-test',
    }));

    expect(res.status).toBe(502);
    expect(mockIssueSessionCookie).not.toHaveBeenCalled();
  });

  it('socio sin teléfono ni email con canales configurados → error claro', async () => {
    mockPrisma.member.findUnique.mockResolvedValue({ ...MEMBER, phone: null, email: null });

    const res = await requestCode(jsonRequest('/api/member/auth/request-code', {
      dni: '28111222', clubSlug: 'club-test',
    }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('administración');
    expect(mockCreateLoginCode).not.toHaveBeenCalled();
  });
});

describe('POST /api/member/auth/verify-code', () => {
  it('código correcto → emite cookie de sesión httpOnly', async () => {
    mockVerifyLoginCode.mockResolvedValue({ ok: true, channel: 'whatsapp' });

    const res = await verifyCode(jsonRequest('/api/member/auth/verify-code', {
      dni: '28111222', clubSlug: 'club-test', code: '123456',
    }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(mockIssueSessionCookie).toHaveBeenCalledWith('c1', 'm1');
    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('member_session=');
    expect(setCookie.toLowerCase()).toContain('httponly');
    expect(setCookie.toLowerCase()).toContain('samesite=lax');
    expect(setCookie.toLowerCase()).toContain('secure');
  });

  it('código incorrecto → 401 con intentos restantes', async () => {
    mockVerifyLoginCode.mockResolvedValue({ ok: false, reason: 'invalid_code' });

    const res = await verifyCode(jsonRequest('/api/member/auth/verify-code', {
      dni: '28111222', clubSlug: 'club-test', code: '000000',
    }));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toContain('incorrecto');
    expect(res.headers.get('set-cookie')).toBeNull();
    expect(mockIssueSessionCookie).not.toHaveBeenCalled();
  });

  it('código expirado → 401 con mensaje de expiración', async () => {
    mockVerifyLoginCode.mockResolvedValue({ ok: false, reason: 'expired' });

    const res = await verifyCode(jsonRequest('/api/member/auth/verify-code', {
      dni: '28111222', clubSlug: 'club-test', code: '123456',
    }));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toContain('expiró');
  });

  it('intentos agotados → 429', async () => {
    mockVerifyLoginCode.mockResolvedValue({ ok: false, reason: 'too_many_attempts' });

    const res = await verifyCode(jsonRequest('/api/member/auth/verify-code', {
      dni: '28111222', clubSlug: 'club-test', code: '123456',
    }));

    expect(res.status).toBe(429);
  });

  it('DNI inexistente en verify → 401 genérico (no enumera DNIs)', async () => {
    mockPrisma.member.findUnique.mockResolvedValue(null);
    mockVerifyLoginCode.mockResolvedValue({ ok: false, reason: 'no_pending_code' });

    const res = await verifyCode(jsonRequest('/api/member/auth/verify-code', {
      dni: '99999999', clubSlug: 'club-test', code: '123456',
    }));
    const body = await res.json();

    // 401 (not 404): the response must not reveal whether the DNI exists.
    expect(res.status).toBe(401);
    expect(body.error).toBe('El código es incorrecto.');
    expect(mockIssueSessionCookie).not.toHaveBeenCalled();
  });
});

describe('POST /api/member/auth/logout', () => {
  it('borra la cookie con maxAge 0', async () => {
    const res = await logout();

    expect(res.status).toBe(200);
    const setCookie = (res.headers.get('set-cookie') ?? '').toLowerCase();
    expect(setCookie).toContain('member_session=');
    expect(setCookie).toContain('max-age=0');
  });
});
