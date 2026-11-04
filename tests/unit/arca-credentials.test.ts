import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  encryptArcaKey,
  decryptArcaKey,
  isEncryptedArcaKey,
} from '@/lib/arca-crypto';
import {
  resolveClubArcaCredentials,
  resolvePlatformArcaCredentials,
  resolveClubArcaEmitterCuit,
  getUltimoAutorizado,
} from '@/lib/arca';

vi.mock('@/lib/site-config', () => ({
  getInstitutionSiteConfigValues: vi.fn(),
  getInstitutionSiteConfigValue: vi.fn(),
  getPlatformSiteConfigValues: vi.fn(),
  getPlatformSiteConfigValue: vi.fn(),
}));

import * as siteConfig from '@/lib/site-config';
import forge from 'node-forge';

const validCuit = '20301112223';

function generateTestCertAndKey(): { certPem: string; keyPem: string } {
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);
  const attrs = [{ name: 'commonName', value: 'test.libres-cobros.local' }];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(keys.privateKey, forge.md.sha1.create());
  return {
    certPem: forge.pki.certificateToPem(cert),
    keyPem: forge.pki.privateKeyToPem(keys.privateKey),
  };
}

const { certPem: validCert, keyPem: validKey } = generateTestCertAndKey();

describe('arca-crypto', () => {
  beforeEach(() => {
    vi.stubEnv('ARCA_STORAGE_SECRET', 'test-storage-secret-for-encryption');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('round-trips a private key and marks it as encrypted', () => {
    const encrypted = encryptArcaKey(validKey);
    expect(encrypted).not.toBe('');
    expect(isEncryptedArcaKey(encrypted)).toBe(true);
    expect(decryptArcaKey(encrypted)).toBe(validKey.trim());
  });

  it('returns empty for empty input without encrypting', () => {
    expect(encryptArcaKey('')).toBe('');
    expect(encryptArcaKey('   ')).toBe('');
  });

  it('returns empty when decrypting empty input', () => {
    expect(decryptArcaKey('')).toBe('');
    expect(decryptArcaKey('   ')).toBe('');
  });

  it('produces different ciphertexts for the same key (random IV/salt)', () => {
    const a = encryptArcaKey(validKey);
    const b = encryptArcaKey(validKey);
    expect(a).not.toBe(b);
    expect(decryptArcaKey(a)).toBe(decryptArcaKey(b));
  });

  it('throws when decrypting tampered or non-encrypted data', () => {
    expect(() => decryptArcaKey('not-encrypted')).toThrow();
    expect(() => decryptArcaKey('v1:bad')).toThrow();
  });

  it('falls back to NEXTAUTH_SECRET when ARCA_STORAGE_SECRET is absent', () => {
    vi.unstubAllEnvs();
    vi.stubEnv('NEXTAUTH_SECRET', 'fallback-secret');
    vi.stubEnv('ARCA_STORAGE_SECRET', '');

    const encrypted = encryptArcaKey(validKey);
    expect(decryptArcaKey(encrypted)).toBe(validKey.trim());
  });
});

describe('resolveClubArcaCredentials', () => {
  beforeEach(() => {
    vi.stubEnv('ARCA_STORAGE_SECRET', 'test-storage-secret-for-encryption');
    vi.stubEnv('ARCA_CUIT', '');
    vi.stubEnv('ARCA_CERT', '');
    vi.stubEnv('ARCA_KEY', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('prefers club-scoped stored credentials', async () => {
    vi.mocked(siteConfig.getInstitutionSiteConfigValues).mockImplementation(
      async (_clubId, keys) => {
        if (keys.includes('arca_key')) {
          return {
            arca_cuit: validCuit,
            arca_cert: validCert,
            arca_key: encryptArcaKey(validKey),
          };
        }
        return {} as Record<string, string>;
      }
    );
    vi.mocked(siteConfig.getPlatformSiteConfigValues).mockResolvedValue({});

    const creds = await resolveClubArcaCredentials('club-a');
    expect(creds).not.toBeNull();
    expect(creds?.cuit).toBe(validCuit);
    expect(creds?.certPem).toContain('BEGIN CERTIFICATE');
    expect(creds?.keyPem).toMatch(/BEGIN (RSA )?PRIVATE KEY/);
  });

  it('falls back to platform stored credentials when club credentials are incomplete', async () => {
    vi.mocked(siteConfig.getInstitutionSiteConfigValues).mockResolvedValue({
      arca_cuit: validCuit,
      arca_cert: '',
      arca_key: '',
    });
    vi.mocked(siteConfig.getPlatformSiteConfigValues).mockImplementation(
      async (keys) => {
        if (keys.includes('saas_arca_key')) {
          return {
            saas_arca_cuit: '30712345678',
            saas_arca_cert: validCert,
            saas_arca_key: encryptArcaKey(validKey),
          };
        }
        return {} as Record<string, string>;
      }
    );

    const creds = await resolveClubArcaCredentials('club-a');
    expect(creds?.cuit).toBe('30712345678');
    expect(creds?.certPem).toContain('BEGIN CERTIFICATE');
    expect(creds?.keyPem).toMatch(/BEGIN (RSA )?PRIVATE KEY/);
  });

  it('falls back to env credentials when nothing is stored', async () => {
    vi.mocked(siteConfig.getInstitutionSiteConfigValues).mockResolvedValue({});
    vi.mocked(siteConfig.getPlatformSiteConfigValues).mockResolvedValue({});
    vi.stubEnv('ARCA_CUIT', validCuit);
    vi.stubEnv('ARCA_CERT', validCert);
    vi.stubEnv('ARCA_KEY', validKey);

    const creds = await resolveClubArcaCredentials('club-a');
    expect(creds?.cuit).toBe(validCuit);
    expect(creds?.certPem).toContain('BEGIN CERTIFICATE');
    expect(creds?.keyPem).toMatch(/BEGIN (RSA )?PRIVATE KEY/);
  });

  it('returns null when no credentials exist anywhere', async () => {
    vi.mocked(siteConfig.getInstitutionSiteConfigValues).mockResolvedValue({});
    vi.mocked(siteConfig.getPlatformSiteConfigValues).mockResolvedValue({});

    const creds = await resolveClubArcaCredentials('club-a');
    expect(creds).toBeNull();
  });
});

describe('resolvePlatformArcaCredentials', () => {
  beforeEach(() => {
    vi.stubEnv('ARCA_STORAGE_SECRET', 'test-storage-secret-for-encryption');
    vi.stubEnv('ARCA_CUIT', '');
    vi.stubEnv('ARCA_CERT', '');
    vi.stubEnv('ARCA_KEY', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('prefers platform stored credentials over env', async () => {
    vi.mocked(siteConfig.getPlatformSiteConfigValues).mockImplementation(
      async (keys) => {
        if (keys.includes('saas_arca_key')) {
          return {
            saas_arca_cuit: '30712345678',
            saas_arca_cert: validCert,
            saas_arca_key: encryptArcaKey(validKey),
          };
        }
        return {} as Record<string, string>;
      }
    );
    vi.stubEnv('ARCA_CUIT', validCuit);
    vi.stubEnv('ARCA_CERT', validCert);
    vi.stubEnv('ARCA_KEY', validKey);

    const creds = await resolvePlatformArcaCredentials();
    expect(creds?.cuit).toBe('30712345678');
    expect(creds?.certPem).toContain('BEGIN CERTIFICATE');
    expect(creds?.keyPem).toMatch(/BEGIN (RSA )?PRIVATE KEY/);
  });

  it('falls back to env when no platform credentials are stored', async () => {
    vi.mocked(siteConfig.getPlatformSiteConfigValues).mockResolvedValue({});
    vi.stubEnv('ARCA_CUIT', validCuit);
    vi.stubEnv('ARCA_CERT', validCert);
    vi.stubEnv('ARCA_KEY', validKey);

    const creds = await resolvePlatformArcaCredentials();
    expect(creds?.cuit).toBe(validCuit);
    expect(creds?.certPem).toContain('BEGIN CERTIFICATE');
    expect(creds?.keyPem).toMatch(/BEGIN (RSA )?PRIVATE KEY/);
  });
});

describe('resolveClubArcaEmitterCuit', () => {
  beforeEach(() => {
    vi.stubEnv('ARCA_STORAGE_SECRET', 'test-storage-secret-for-encryption');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('returns the club CUIT from credentials resolution order', async () => {
    vi.mocked(siteConfig.getInstitutionSiteConfigValues).mockImplementation(
      async (_clubId, keys) => {
        const values: Record<string, string> = {};
        if (keys.includes('arca_cuit')) values.arca_cuit = validCuit;
        if (keys.includes('arca_cert')) values.arca_cert = validCert;
        if (keys.includes('arca_key')) values.arca_key = encryptArcaKey(validKey);
        return values;
      }
    );
    vi.mocked(siteConfig.getPlatformSiteConfigValues).mockResolvedValue({});

    const cuit = await resolveClubArcaEmitterCuit('club-a');
    expect(cuit).toBe(validCuit);
  });

  it('falls back to stored club arca_cuit even without complete credentials', async () => {
    vi.mocked(siteConfig.getInstitutionSiteConfigValues).mockResolvedValue({
      arca_cuit: validCuit,
    });
    vi.mocked(siteConfig.getPlatformSiteConfigValues).mockResolvedValue({});

    const cuit = await resolveClubArcaEmitterCuit('club-a');
    expect(cuit).toBe(validCuit);
  });

  it('falls back to platform cuit then env', async () => {
    vi.mocked(siteConfig.getInstitutionSiteConfigValues).mockResolvedValue({});
    vi.mocked(siteConfig.getPlatformSiteConfigValues).mockResolvedValue({
      saas_arca_cuit: '30712345678',
    });

    const cuit = await resolveClubArcaEmitterCuit('club-a');
    expect(cuit).toBe('30712345678');
  });
});

describe('getUltimoAutorizado with resolved credentials', () => {
  beforeEach(() => {
    vi.stubEnv('ARCA_STORAGE_SECRET', 'test-storage-secret-for-encryption');
    vi.stubEnv('ARCA_PRODUCTION', 'false');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  function buildTaResponse() {
    const ticket = Buffer.from(
      `<loginTicketResponse><credentials><token>tok123</token><sign>sig123</sign></credentials></loginTicketResponse>`,
      'utf8'
    ).toString('base64');
    return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <loginCmsResponse>
      <loginCmsReturn>${ticket}</loginCmsReturn>
    </loginCmsResponse>
  </soapenv:Body>
</soapenv:Envelope>`;
  }

  function buildWsfeResponse() {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <FECompUltimoAutorizadoResponse>
      <FECompUltimoAutorizadoResult>
        <CbteNro>5</CbteNro>
      </FECompUltimoAutorizadoResult>
    </FECompUltimoAutorizadoResponse>
  </soapenv:Body>
</soapenv:Envelope>`;
  }

  it('uses the provided cert/key instead of env vars', async () => {
    const calls: { url: string; body: string }[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init: { body: string }) => {
        calls.push({ url, body: init.body });
        const text = calls.length === 1 ? buildTaResponse() : buildWsfeResponse();
        return new Response(text, { status: 200 });
      })
    );

    const creds = {
      cuit: '20301112223',
      certPem: validCert,
      keyPem: validKey,
    };

    const ultimo = await getUltimoAutorizado(creds.cuit, 1, 15, creds);
    expect(ultimo).toBe(5);

    // The first call is WSAA LoginCms; it must contain a CMS signed with the
    // provided credentials (not env vars, which are empty in this test).
    expect(calls[0].url).toBe('https://wsaahomo.afip.gov.ar/ws/services/LoginCms');
    expect(calls[0].body).toContain('<wsaa:in0>');
    expect(calls[0].body).not.toContain(validKey);
  });
});
