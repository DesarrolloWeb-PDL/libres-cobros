import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PUT } from '@/app/api/admin/site-config/route';

vi.mock('@/lib/access', () => ({
  requireInstitution: vi.fn(),
  AuthError: class AuthError extends Error {
    constructor(
      public readonly status: number,
      message: string
    ) {
      super(message);
      this.name = 'AuthError';
    }
  },
}));

vi.mock('@/lib/db', () => {
  const state: {
    configs: Array<{
      id: string;
      clubId: string | null;
      key: string;
      value: string;
      updatedAt: Date;
    }>;
  } = { configs: [] };

  const reset = () => {
    state.configs.length = 0;
  };

  const findFirst = async (where: { where: { clubId: null; key: string } }) => {
    return (
      state.configs.find(
        (c) => c.clubId === where.where.clubId && c.key === where.where.key
      ) ?? null
    );
  };

  const findUnique = async (where: {
    where: { clubId_key: { clubId: string; key: string } };
  }) => {
    return (
      state.configs.find(
        (c) =>
          c.clubId === where.where.clubId_key.clubId &&
          c.key === where.where.clubId_key.key
      ) ?? null
    );
  };

  const findMany = async (query: {
    where: { clubId: string | null; key: { in: string[] } };
  }) => {
    return state.configs.filter(
      (c) =>
        c.clubId === query.where.clubId && query.where.key.in.includes(c.key)
    );
  };

  const client = {
    siteConfig: {
      findFirst: vi.fn(findFirst),
      findUnique: vi.fn(findUnique),
      findMany: vi.fn(findMany),
      create: vi.fn(async (args: { data: Record<string, unknown> }) => {
        const config = {
          id: `sc-${state.configs.length + 1}`,
          updatedAt: new Date(),
          ...args.data,
        } as (typeof state.configs)[number];
        state.configs.push(config);
        return config;
      }),
      update: vi.fn(
        async (args: { where: { id: string }; data: Record<string, unknown> }) => {
          const target = state.configs.find((c) => c.id === args.where.id);
          if (target) Object.assign(target, args.data);
          return {
            id: args.where.id,
            clubId: target?.clubId ?? null,
            key: target?.key ?? '',
            ...args.data,
            updatedAt: new Date(),
          };
        }
      ),
    },
    $transaction: vi.fn(async (fn: unknown) => {
      if (typeof fn === 'function') {
        return fn(client);
      }
      return Promise.all(fn as Promise<unknown>[]);
    }),
    $reset: reset,
  };

  return { prisma: client };
});

vi.mock('@/lib/arca', async () => {
  const actual = await vi.importActual<typeof import('@/lib/arca')>('@/lib/arca');
  return {
    ...actual,
    encryptArcaKey: vi.fn((value: string) => `encrypted:${value}`),
  };
});

import * as access from '@/lib/access';
import { prisma } from '@/lib/db';
import { encryptArcaKey } from '@/lib/arca';

const prismaMock = prisma as unknown as {
  siteConfig: {
    findFirst: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
  $reset: () => void;
};

describe('GET /api/admin/site-config ARCA masking', () => {
  beforeEach(() => {
    prismaMock.$reset();
    vi.clearAllMocks();
    vi.stubEnv('ARCA_STORAGE_SECRET', 'test-secret');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('never returns the private key; returns keyConfigured indicator', async () => {
    vi.mocked(access.requireInstitution).mockResolvedValue({
      role: 'SUPER_ADMIN',
      institutionId: null,
    });

    prismaMock.siteConfig.findMany.mockResolvedValue([
      {
        id: '1',
        clubId: null,
        key: 'saas_arca_key',
        value: 'encrypted:-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----',
        updatedAt: new Date('2026-01-01T00:00:00Z'),
      },
    ]);

    const response = await GET(new NextRequest('http://localhost/api/admin/site-config'));
    const body = await response.json();

    const keyConfig = body.data.find((c: { key: string }) => c.key === 'saas_arca_key');
    expect(keyConfig).toBeDefined();
    expect(keyConfig.value).toBe('');
    expect(keyConfig.keyConfigured).toBe(true);
  });

  it('masks the certificate value and returns certConfigured indicator', async () => {
    vi.mocked(access.requireInstitution).mockResolvedValue({
      role: 'SUPER_ADMIN',
      institutionId: null,
    });

    prismaMock.siteConfig.findMany.mockResolvedValue([
      {
        id: '1',
        clubId: null,
        key: 'saas_arca_cert',
        value: '-----BEGIN CERTIFICATE-----\nMIIBkTCB+wIJAKHBfpE\n-----END CERTIFICATE-----',
        updatedAt: new Date('2026-01-01T00:00:00Z'),
      },
    ]);

    const response = await GET(new NextRequest('http://localhost/api/admin/site-config'));
    const body = await response.json();

    const certConfig = body.data.find((c: { key: string }) => c.key === 'saas_arca_cert');
    expect(certConfig).toBeDefined();
    expect(certConfig.value).not.toContain('BEGIN CERTIFICATE');
    expect(certConfig.value.startsWith('···')).toBe(true);
    expect(certConfig.certConfigured).toBe(true);
  });
});

describe('PUT /api/admin/site-config ARCA scoping', () => {
  beforeEach(() => {
    prismaMock.$reset();
    vi.clearAllMocks();
    vi.stubEnv('ARCA_STORAGE_SECRET', 'test-secret');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function putRequest(body: unknown, institutionId: string | null) {
    vi.mocked(access.requireInstitution).mockResolvedValue({
      role: institutionId ? 'ADMIN' : 'SUPER_ADMIN',
      institutionId,
    });
    return new NextRequest('http://localhost/api/admin/site-config', {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  it('rejects institution-scoped keys when writing platform scope', async () => {
    const response = await PUT(
      putRequest({ configs: [{ key: 'arca_cuit', value: '20301112223' }] }, null)
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('rejects platform-scoped keys when writing institution scope', async () => {
    const response = await PUT(
      putRequest({ configs: [{ key: 'saas_arca_cuit', value: '20301112223' }] }, 'club-a')
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('encrypts private keys before storing', async () => {
    const response = await PUT(
      putRequest(
        { configs: [{ key: 'saas_arca_key', value: '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----' }] },
        null
      )
    );

    expect(response.status).toBe(200);
    expect(encryptArcaKey).toHaveBeenCalled();
  });

  it('preserves existing key when an empty value is sent', async () => {
    prismaMock.siteConfig.findFirst.mockResolvedValue({
      id: '1',
      clubId: null,
      key: 'saas_arca_key',
      value: 'encrypted:existing-key',
      updatedAt: new Date(),
    });

    const response = await PUT(
      putRequest({ configs: [{ key: 'saas_arca_key', value: '' }] }, null)
    );

    expect(response.status).toBe(200);
    expect(prismaMock.siteConfig.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { value: 'encrypted:existing-key' },
      })
    );
  });
});
