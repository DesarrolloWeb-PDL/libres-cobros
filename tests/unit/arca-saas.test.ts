import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  buildFecaPayload,
  resolveSaasCbteTipo,
  emitirComprobanteSaas,
} from '@/lib/arca';

vi.mock('@/lib/site-config', () => ({
  getPlatformSiteConfigValues: vi.fn(),
  getPlatformSiteConfigValue: vi.fn(),
  getInstitutionSiteConfigValues: vi.fn(),
  getInstitutionSiteConfigValue: vi.fn(),
}));

vi.mock('@/lib/db', () => {
  const state = {
    invoices: [] as Array<Record<string, unknown>>,
    comprobantes: [] as Array<Record<string, unknown>>,
  };

  const reset = () => {
    state.invoices.length = 0;
    state.comprobantes.length = 0;
  };

  const client = {
    saasInvoice: {
      findUnique: vi.fn(async ({ where: { id } }: { where: { id: string } }) => {
        return state.invoices.find((i) => i.id === id) ?? null;
      }),
    },
    saasComprobante: {
      findUnique: vi.fn(
        async ({ where: { invoiceId } }: { where: { invoiceId: string } }) => {
          return state.comprobantes.find((c) => c.invoiceId === invoiceId) ?? null;
        }
      ),
      create: vi.fn(async (args: { data: Record<string, unknown> }) => {
        const comprobante = { id: `sc-${state.comprobantes.length + 1}`, ...args.data };
        state.comprobantes.push(comprobante);
        return comprobante;
      }),
      update: vi.fn(
        async (args: { where: { id: string }; data: Record<string, unknown> }) => {
          const target = state.comprobantes.find((c) => c.id === args.where.id);
          if (target) Object.assign(target, args.data);
          return { id: args.where.id, ...args.data };
        }
      ),
    },
    $reset: reset,
  };

  return { prisma: client };
});

import * as siteConfig from '@/lib/site-config';
import { prisma } from '@/lib/db';

const prismaMock = prisma as unknown as {
  saasInvoice: {
    findUnique: ReturnType<typeof vi.fn>;
  };
  saasComprobante: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  $reset: () => void;
};

describe('resolveSaasCbteTipo', () => {
  it('maps MONOTRIBUTO regime to Recibo C tipo 15', () => {
    expect(resolveSaasCbteTipo('MONOTRIBUTO', 'RI')).toBe(15);
    expect(resolveSaasCbteTipo('MONOTRIBUTO', 'CF')).toBe(15);
  });

  it('maps RESPONSABLE_INSCRIPTO regime to Factura A for RI recipients', () => {
    expect(resolveSaasCbteTipo('RESPONSABLE_INSCRIPTO', 'RI')).toBe(1);
  });

  it('maps RESPONSABLE_INSCRIPTO regime to Factura B for non-RI recipients', () => {
    expect(resolveSaasCbteTipo('RESPONSABLE_INSCRIPTO', 'CF')).toBe(6);
    expect(resolveSaasCbteTipo('RESPONSABLE_INSCRIPTO', 'MONO')).toBe(6);
    expect(resolveSaasCbteTipo('RESPONSABLE_INSCRIPTO', 'EXENTO')).toBe(6);
  });
});

describe('buildFecaPayload', () => {
  const baseParams = {
    ptoVta: 3,
    nro: 42,
    docTipo: 80,
    docNro: '30712345678',
    condicionIvaReceptor: 1,
    total: 12100,
    fecha: '20261016',
  };

  it('builds a Recibo C (tipo 15) envelope with Concepto 1 and no IVA breakup', () => {
    const xml = buildFecaPayload({ ...baseParams, cbteTipo: 15 });

    expect(xml).toContain('<wsfe:FECAESolicitar>');
    expect(xml).toContain('<wsfe:CantReg>1</wsfe:CantReg>');
    expect(xml).toContain('<wsfe:PtoVta>3</wsfe:PtoVta>');
    expect(xml).toContain('<wsfe:CbteTipo>15</wsfe:CbteTipo>');
    expect(xml).toContain('<wsfe:Concepto>1</wsfe:Concepto>');
    expect(xml).toContain('<wsfe:DocTipo>80</wsfe:DocTipo>');
    expect(xml).toContain('<wsfe:DocNro>30712345678</wsfe:DocNro>');
    expect(xml).toContain('<wsfe:ImpTotal>12100.00</wsfe:ImpTotal>');
    expect(xml).toContain('<wsfe:ImpTotConc>12100.00</wsfe:ImpTotConc>');
    expect(xml).toContain('<wsfe:ImpNetoGravado>0.00</wsfe:ImpNetoGravado>');
    expect(xml).toContain('<wsfe:ImpOpEx>0.00</wsfe:ImpOpEx>');
    expect(xml).toContain('<wsfe:ImpTrib>0.00</wsfe:ImpTrib>');
    expect(xml).not.toContain('<wsfe:Iva>');
    expect(xml).not.toContain('<wsfe:ImpIVA>');
  });

  it('builds a Factura A (tipo 1) envelope with default 21% IVA breakdown', () => {
    const xml = buildFecaPayload({ ...baseParams, cbteTipo: 1 });

    expect(xml).toContain('<wsfe:CbteTipo>1</wsfe:CbteTipo>');
    expect(xml).toContain('<wsfe:Concepto>2</wsfe:Concepto>');
    expect(xml).toContain('<wsfe:ImpTotal>12100.00</wsfe:ImpTotal>');
    expect(xml).toContain('<wsfe:ImpTotConc>0.00</wsfe:ImpTotConc>');
    expect(xml).toContain('<wsfe:ImpNetoGravado>10000.00</wsfe:ImpNetoGravado>');
    expect(xml).toContain('<wsfe:ImpIVA>2100.00</wsfe:ImpIVA>');
    expect(xml).toContain('<wsfe:Iva>');
    expect(xml).toContain('<wsfe:AlicIva>');
    expect(xml).toContain('<wsfe:Id>5</wsfe:Id>');
    expect(xml).toContain('<wsfe:BaseImp>10000.00</wsfe:BaseImp>');
    expect(xml).toContain('<wsfe:Importe>2100.00</wsfe:Importe>');
  });

  it('builds a Factura B (tipo 6) envelope with a custom IVA rate', () => {
    const xml = buildFecaPayload({
      ...baseParams,
      cbteTipo: 6,
      total: 11050,
      ivaRate: 0.105,
    });

    expect(xml).toContain('<wsfe:CbteTipo>6</wsfe:CbteTipo>');
    expect(xml).toContain('<wsfe:ImpTotal>11050.00</wsfe:ImpTotal>');
    expect(xml).toContain('<wsfe:ImpNetoGravado>10000.00</wsfe:ImpNetoGravado>');
    expect(xml).toContain('<wsfe:ImpIVA>1050.00</wsfe:ImpIVA>');
    expect(xml).toContain('<wsfe:Id>4</wsfe:Id>');
  });

  it('escapes XML in the auth block', () => {
    const xml = buildFecaPayload({
      ...baseParams,
      cbteTipo: 1,
      auth: {
        token: 'tok<en&>',
        sign: "sign'quote\"x",
        cuit: '20301112223',
      },
    });

    expect(xml).toContain('<wsfe:Token>tok&lt;en&amp;&gt;</wsfe:Token>');
    expect(xml).toContain('<wsfe:Sign>sign&apos;quote&quot;x</wsfe:Sign>');
    expect(xml).toContain('<wsfe:Cuit>20301112223</wsfe:Cuit>');
  });

  it('formats Date-based fecha as yyyymmdd in Argentina time', () => {
    const xml = buildFecaPayload({
      ...baseParams,
      cbteTipo: 15,
      fecha: new Date('2026-10-16T12:00:00Z'),
    });
    expect(xml).toContain('<wsfe:CbteFch>20261016</wsfe:CbteFch>');
  });
});

describe('emitirComprobanteSaas', () => {
  beforeEach(() => {
    prismaMock.$reset();
    vi.clearAllMocks();
    vi.mocked(siteConfig.getPlatformSiteConfigValues).mockImplementation(async (keys) => {
      const values: Record<string, string> = {
        saas_arca_regime: 'RESPONSABLE_INSCRIPTO',
        saas_arca_pto_vta: '3',
        saas_arca_iva_rate: '21',
      };
      return Object.fromEntries(keys.map((k) => [k, values[k] ?? '']));
    });
    vi.stubEnv('ARCA_CUIT', '20301112223');
    vi.stubEnv(
      'ARCA_CERT',
      '-----BEGIN CERTIFICATE-----\nMIIBkTCB+wIJAKHBfpE\n-----END CERTIFICATE-----'
    );
    vi.stubEnv(
      'ARCA_KEY',
      '-----BEGIN PRIVATE KEY-----\nMIGHAgEAMBMG\n-----END PRIVATE KEY-----'
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('records ERROR and does not emit when the institution has no CUIT', async () => {
    prismaMock.saasInvoice.findUnique.mockResolvedValue({
      id: 'inv-1',
      institutionId: 'club-1',
      amount: 35000,
      status: 'PAID',
      paidAt: new Date('2026-10-16T12:00:00Z'),
      institution: {
        id: 'club-1',
        cuit: null,
        ivaCondicion: 'RI',
      },
    });

    const result = await emitirComprobanteSaas('inv-1');

    expect(result.estado).toBe('ERROR');
    expect(prismaMock.saasComprobante.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          invoiceId: 'inv-1',
          tipo: 1,
          docTipo: 80,
          estado: 'ERROR',
        }),
      })
    );
  });
});
