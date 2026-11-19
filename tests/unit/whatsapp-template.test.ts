import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    siteConfig: { findUnique: vi.fn() },
    member: { findUnique: vi.fn() },
    club: { findUnique: vi.fn() },
    smsLog: { create: vi.fn() },
  },
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));

import { sendWhatsAppMessage, sendWhatsAppReminder } from '@/lib/whatsapp';

const fetchMock = vi.fn();

function okResponse() {
  return {
    ok: true,
    json: () => Promise.resolve({ messages: [{ id: 'wamid.1' }] }),
  } as Response;
}

describe('sendWhatsAppMessage — plantilla vs texto libre', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = fetchMock as unknown as typeof fetch;
    fetchMock.mockResolvedValue(okResponse());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('envía texto libre cuando no se pasa plantilla (comportamiento existente)', async () => {
    const result = await sendWhatsAppMessage('phone-id', 'token', '1112345678', 'Hola Juan');

    expect(result.externalId).toBe('wamid.1');
    const [, init] = fetchMock.mock.calls[0];
    const payload = JSON.parse(init.body);
    expect(payload.type).toBe('text');
    expect(payload.text.body).toBe('Hola Juan');
    expect(payload.to).toBe('541112345678');
  });

  it('envía type: template con nombre, idioma y parámetros cuando hay plantilla', async () => {
    await sendWhatsAppMessage('phone-id', 'token', '1112345678', 'fallback', {
      name: 'recordatorio_pago',
      language: 'es_AR',
      parameters: ['Juan', '$15.000', '30/11/2026', 'https://x.test/pagos'],
    });

    const [, init] = fetchMock.mock.calls[0];
    const payload = JSON.parse(init.body);
    expect(payload.type).toBe('template');
    expect(payload.template.name).toBe('recordatorio_pago');
    expect(payload.template.language.code).toBe('es_AR');
    expect(payload.template.components[0].parameters).toEqual([
      { type: 'text', text: 'Juan' },
      { type: 'text', text: '$15.000' },
      { type: 'text', text: '30/11/2026' },
      { type: 'text', text: 'https://x.test/pagos' },
    ]);
  });

  it('usa es_AR por defecto cuando la plantilla no trae idioma', async () => {
    await sendWhatsAppMessage('phone-id', 'token', '1112345678', 'fallback', {
      name: 'recordatorio_pago',
      parameters: ['Juan'],
    });

    const [, init] = fetchMock.mock.calls[0];
    const payload = JSON.parse(init.body);
    expect(payload.template.language.code).toBe('es_AR');
  });

  it('lanza error si faltan credenciales', async () => {
    await expect(sendWhatsAppMessage('', 'token', '111', 'x')).rejects.toThrow(
      'Configuración de WhatsApp incompleta'
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('sendWhatsAppReminder — usa plantilla cuando está configurada', () => {
  const MEMBER = {
    id: 'm1',
    clubId: 'c1',
    firstName: 'Juan',
    phone: '1112345678',
    dni: '28111222',
    fees: [
      { amount: 15000, dueDate: new Date('2026-11-30T00:00:00Z'), status: 'PENDING' },
    ],
  };

  function mockConfig(values: Record<string, string>) {
    mockPrisma.siteConfig.findUnique.mockImplementation((args: unknown) => {
      const key = (args as { where: { clubId_key: { key: string } } }).where.clubId_key.key;
      return Promise.resolve(key in values ? { value: values[key] } : null);
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = fetchMock as unknown as typeof fetch;
    fetchMock.mockResolvedValue(okResponse());
    mockPrisma.member.findUnique.mockResolvedValue(MEMBER);
    mockPrisma.club.findUnique.mockResolvedValue({ slug: 'club-test' });
    mockPrisma.smsLog.create.mockResolvedValue({ id: 'log-1' });
  });

  it('envía plantilla con los 4 parámetros cuando whatsapp_template_name está configurado', async () => {
    mockConfig({
      whatsapp_phone_number_id: 'phone-id',
      whatsapp_access_token: 'token',
      whatsapp_template_name: 'recordatorio_pago',
      whatsapp_template_language: 'es_AR',
      next_public_url: 'https://club.test',
    });

    const result = await sendWhatsAppReminder('m1');

    expect(result.sent).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    const payload = JSON.parse(init.body);
    expect(payload.type).toBe('template');
    expect(payload.template.name).toBe('recordatorio_pago');
    expect(payload.template.language.code).toBe('es_AR');
    expect(payload.template.components[0].parameters).toHaveLength(4);
    expect(payload.template.components[0].parameters[0].text).toBe('Juan');
    expect(payload.template.components[0].parameters[3].text).toContain(
      'https://club.test/pagos/club-test'
    );
  });

  it('cae a texto libre cuando no hay plantilla configurada', async () => {
    mockConfig({
      whatsapp_phone_number_id: 'phone-id',
      whatsapp_access_token: 'token',
      whatsapp_template_name: '',
      next_public_url: 'https://club.test',
    });

    const result = await sendWhatsAppReminder('m1');

    expect(result.sent).toBe(1);
    const [, init] = fetchMock.mock.calls[0];
    const payload = JSON.parse(init.body);
    expect(payload.type).toBe('text');
    expect(payload.text.body).toContain('recordatorio de pago');
  });

  it('skipea si WhatsApp no está configurado para la institución', async () => {
    mockConfig({});

    const result = await sendWhatsAppReminder('m1');

    expect(result.skipped).toBe(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
