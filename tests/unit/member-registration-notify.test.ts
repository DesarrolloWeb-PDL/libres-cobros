import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPrisma, mockSendEmail, mockSendWhatsApp } = vi.hoisted(() => ({
  mockPrisma: {
    adminUser: { findMany: vi.fn() },
    club: { findUnique: vi.fn() },
    siteConfig: { findMany: vi.fn() },
    smsLog: { create: vi.fn() },
  },
  mockSendEmail: vi.fn(),
  mockSendWhatsApp: vi.fn(),
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/email', () => ({ sendEmail: mockSendEmail }));
vi.mock('@/lib/whatsapp', () => ({ sendWhatsAppMessage: mockSendWhatsApp }));

import { notifyPendingMemberRegistration } from '@/lib/member-registration-notify';

const MEMBER = {
  id: 'm1',
  firstName: 'Juan',
  lastName: 'Perez',
  dni: '12345678',
  email: 'juan@test.com',
  phone: '111',
};

describe('notifyPendingMemberRegistration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.adminUser.findMany.mockResolvedValue([{ email: 'admin@club.com', name: 'Admin' }]);
    mockPrisma.club.findUnique.mockResolvedValue({ name: 'Club Test', phone: '541112345678' });
    mockPrisma.siteConfig.findMany.mockResolvedValue([
      { key: 'resend_api_key', value: 're_test' },
      { key: 'resend_from_email', value: 'from@test.com' },
      { key: 'whatsapp_phone_number_id', value: 'wa-phone' },
      { key: 'whatsapp_access_token', value: 'wa-token' },
    ]);
    mockPrisma.smsLog.create.mockResolvedValue({ id: 'log-1' });
    mockSendEmail.mockResolvedValue({ externalId: 'email-ext' });
    mockSendWhatsApp.mockResolvedValue({ externalId: 'wa-ext' });
  });

  it('sends email to admin users and logs SENT', async () => {
    const result = await notifyPendingMemberRegistration('club-1', MEMBER, mockPrisma as never);

    expect(result.emailsSent).toBe(1);
    expect(mockSendEmail).toHaveBeenCalledWith(
      're_test',
      'from@test.com',
      'admin@club.com',
      'Nueva solicitud de registro de socio',
      expect.stringContaining('Juan')
    );
    expect(mockPrisma.smsLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          clubId: 'club-1',
          memberId: 'm1',
          type: 'pending_member_registration_email',
          status: 'SENT',
          externalId: 'email-ext',
        }),
      })
    );
  });

  it('sends WhatsApp to club phone and logs SENT', async () => {
    const result = await notifyPendingMemberRegistration('club-1', MEMBER, mockPrisma as never);

    expect(result.whatsAppSent).toBe(1);
    expect(mockSendWhatsApp).toHaveBeenCalledWith(
      'wa-phone',
      'wa-token',
      '541112345678',
      expect.stringContaining('Juan')
    );
  });

  it('logs FAILED and counts error when email send fails', async () => {
    mockSendEmail.mockRejectedValueOnce(new Error('email down'));

    const result = await notifyPendingMemberRegistration('club-1', MEMBER, mockPrisma as never);

    expect(result.emailsSent).toBe(0);
    expect(result.errors).toBeGreaterThanOrEqual(1);
    expect(mockPrisma.smsLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'pending_member_registration_email',
          status: 'FAILED',
          error: 'email down',
        }),
      })
    );
  });

  it('skips channels when not configured', async () => {
    mockPrisma.siteConfig.findMany.mockResolvedValue([]);

    const result = await notifyPendingMemberRegistration('club-1', MEMBER, mockPrisma as never);

    expect(result.emailsSent).toBe(0);
    expect(result.whatsAppSent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(mockSendWhatsApp).not.toHaveBeenCalled();
  });

  it('never throws even when db fails', async () => {
    mockPrisma.adminUser.findMany.mockRejectedValueOnce(new Error('db down'));

    const result = await notifyPendingMemberRegistration('club-1', MEMBER, mockPrisma as never);
    expect(result.errors).toBeGreaterThanOrEqual(1);
  });
});
