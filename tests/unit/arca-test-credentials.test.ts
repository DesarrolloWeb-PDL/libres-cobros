import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/admin/arca/test-credentials/route';

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

vi.mock('@/lib/arca', () => ({
  resolveClubArcaCredentials: vi.fn(),
  resolvePlatformArcaCredentials: vi.fn(),
  requestTa: vi.fn(),
}));

import * as access from '@/lib/access';
import * as arca from '@/lib/arca';

describe('POST /api/admin/arca/test-credentials', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('ARCA_PRODUCTION', 'false');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function makeRequest(institutionId: string | null) {
    vi.mocked(access.requireInstitution).mockResolvedValue({
      role: institutionId ? 'ADMIN' : 'SUPER_ADMIN',
      institutionId,
    });
    return new NextRequest('http://localhost/api/admin/arca/test-credentials', {
      method: 'POST',
    });
  }

  it('tests platform credentials for SUPER_ADMIN without institution', async () => {
    vi.mocked(arca.resolvePlatformArcaCredentials).mockResolvedValue({
      cuit: '20301112223',
      certPem: 'cert',
      keyPem: 'key',
    });

    const response = await POST(makeRequest(null));
    const body = await response.json();

    expect(body.ok).toBe(true);
    expect(body.environment).toBe('homologacion');
    expect(arca.requestTa).toHaveBeenCalledWith('20301112223', {
      cuit: '20301112223',
      certPem: 'cert',
      keyPem: 'key',
    });
  });

  it('tests club credentials for an admin scoped to their institution', async () => {
    vi.mocked(arca.resolveClubArcaCredentials).mockResolvedValue({
      cuit: '30712345678',
      certPem: 'cert',
      keyPem: 'key',
    });

    const response = await POST(makeRequest('club-a'));
    const body = await response.json();

    expect(body.ok).toBe(true);
    expect(arca.resolveClubArcaCredentials).toHaveBeenCalledWith('club-a');
    expect(arca.requestTa).toHaveBeenCalledWith('30712345678', {
      cuit: '30712345678',
      certPem: 'cert',
      keyPem: 'key',
    });
  });

  it('returns ok:false when no credentials are configured', async () => {
    vi.mocked(arca.resolvePlatformArcaCredentials).mockResolvedValue(null);

    const response = await POST(makeRequest(null));
    const body = await response.json();

    expect(body.ok).toBe(false);
    expect(body.environment).toBe('homologacion');
    expect(body.error).toBeDefined();
    expect(arca.requestTa).not.toHaveBeenCalled();
  });

  it('reports the production environment when ARCA_PRODUCTION=true', async () => {
    vi.unstubAllEnvs();
    vi.stubEnv('ARCA_PRODUCTION', 'true');
    vi.mocked(arca.resolvePlatformArcaCredentials).mockResolvedValue({
      cuit: '20301112223',
      certPem: 'cert',
      keyPem: 'key',
    });

    const response = await POST(makeRequest(null));
    const body = await response.json();

    expect(body.environment).toBe('produccion');
  });

  it('returns 500 on TA error without leaking PEM material', async () => {
    vi.mocked(arca.resolvePlatformArcaCredentials).mockResolvedValue({
      cuit: '20301112223',
      certPem: 'cert',
      keyPem: 'key',
    });
    vi.mocked(arca.requestTa).mockRejectedValue(new Error('WSAA rejected the CMS'));

    const response = await POST(makeRequest(null));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Error al probar credenciales ARCA');
    expect(body.details).toBe('WSAA rejected the CMS');
    expect(JSON.stringify(body)).not.toContain('key');
  });
});
