import { describe, it, expect } from 'vitest';
import {
  buildReciboCPayload,
  getIvaReceptorCode,
  buildArcaQrUrl,
  formatArcaDate,
  escapeXml,
  decodePemEnv,
} from '@/lib/arca';

describe('getIvaReceptorCode', () => {
  it('maps IVA conditions to CondicionIvaReceptor codes', () => {
    expect(getIvaReceptorCode('CF')).toBe(5);
    expect(getIvaReceptorCode('MONO')).toBe(6);
    expect(getIvaReceptorCode('RI')).toBe(1);
    expect(getIvaReceptorCode('EXENTO')).toBe(4);
  });

  it('throws on unknown conditions', () => {
    expect(() => getIvaReceptorCode('NO_EXISTE')).toThrow(/Unknown IVA condition/);
  });
});

describe('buildReciboCPayload', () => {
  const baseParams = {
    ptoVta: 3,
    nro: 42,
    docTipo: 99,
    docNro: 12345678,
    condicionIvaReceptor: 5,
    total: 15000.5,
    fecha: '20261016',
  };

  it('builds a Recibo C (tipo 15) FECAESolicitar envelope', () => {
    const xml = buildReciboCPayload(baseParams);

    expect(xml).toContain('<wsfe:FECAESolicitar>');
    expect(xml).toContain('<wsfe:CantReg>1</wsfe:CantReg>');
    expect(xml).toContain('<wsfe:PtoVta>3</wsfe:PtoVta>');
    expect(xml).toContain('<wsfe:CbteTipo>15</wsfe:CbteTipo>');
    expect(xml).toContain('<wsfe:CbteDesde>42</wsfe:CbteDesde>');
    expect(xml).toContain('<wsfe:CbteHasta>42</wsfe:CbteHasta>');
    expect(xml).toContain('<wsfe:CbteFch>20261016</wsfe:CbteFch>');
    expect(xml).toContain('<wsfe:DocTipo>99</wsfe:DocTipo>');
    expect(xml).toContain('<wsfe:DocNro>12345678</wsfe:DocNro>');
    expect(xml).toContain('<wsfe:Concepto>1</wsfe:Concepto>');
    expect(xml).toContain('<wsfe:MonId>PES</wsfe:MonId>');
    expect(xml).toContain('<wsfe:MonCtz>1.000000</wsfe:MonCtz>');
  });

  it('sets CondicionIvaReceptor per the given code', () => {
    const xml = buildReciboCPayload({ ...baseParams, condicionIvaReceptor: 6 });
    expect(xml).toContain('<wsfe:CondicionIvaReceptor>6</wsfe:CondicionIvaReceptor>');
  });

  it('puts the whole amount in ImpTotal/ImpTotConc with zero gravado (no IVA breakdown)', () => {
    const xml = buildReciboCPayload(baseParams);

    expect(xml).toContain('<wsfe:ImpTotal>15000.50</wsfe:ImpTotal>');
    expect(xml).toContain('<wsfe:ImpTotConc>15000.50</wsfe:ImpTotConc>');
    expect(xml).toContain('<wsfe:ImpNetoGravado>0.00</wsfe:ImpNetoGravado>');
    expect(xml).toContain('<wsfe:ImpOpEx>0.00</wsfe:ImpOpEx>');
    expect(xml).toContain('<wsfe:ImpTrib>0.00</wsfe:ImpTrib>');

    // Type C receipts must NOT carry an IVA breakup array.
    expect(xml).not.toContain('IVA');
    expect(xml).not.toContain('<wsfe:CbtesAsoc');
    expect(xml).not.toContain('<wsfe:Tributos');
  });

  it('uses CUIT (80) when the doc tipo says so', () => {
    const xml = buildReciboCPayload({
      ...baseParams,
      docTipo: 80,
      docNro: 30712345678,
    });
    expect(xml).toContain('<wsfe:DocTipo>80</wsfe:DocTipo>');
    expect(xml).toContain('<wsfe:DocNro>30712345678</wsfe:DocNro>');
  });

  it('fills Auth from the provided TA and escapes XML-significant characters', () => {
    const xml = buildReciboCPayload({
      ...baseParams,
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

  it('uses empty Auth placeholders when no TA is provided', () => {
    const xml = buildReciboCPayload(baseParams);
    expect(xml).toContain('<wsfe:Token></wsfe:Token>');
    expect(xml).toContain('<wsfe:Sign></wsfe:Sign>');
    expect(xml).toContain('<wsfe:Cuit></wsfe:Cuit>');
  });

  it('formats Date-based fecha as yyyymmdd in Argentina time', () => {
    const xml = buildReciboCPayload({
      ...baseParams,
      fecha: new Date('2026-10-16T12:00:00Z'),
    });
    // 12:00 UTC == 09:00 ART same day.
    expect(xml).toContain('<wsfe:CbteFch>20261016</wsfe:CbteFch>');
  });
});

describe('buildArcaQrUrl', () => {
  it('encodes the documented compact payload as base64', () => {
    const url = buildArcaQrUrl({
      emitterCuit: '30712345678',
      tipo: 15,
      ptoVta: 1,
      nro: 12,
      cae: '71234567890123',
      caeVto: '20261030',
      importe: 15000.5,
    });

    expect(url.startsWith('https://www.arca.gob.ar/fe/qr/?p=')).toBe(true);

    const payload = url.split('?p=')[1];
    const decoded = Buffer.from(payload, 'base64').toString('utf8');
    expect(decoded).toBe('1|30712345678|15|1|12|71234567890123|20261030|15000.50');
  });

  it('appends own data fields when provided', () => {
    const url = buildArcaQrUrl({
      emitterCuit: '30712345678',
      tipo: 15,
      ptoVta: 1,
      nro: 12,
      cae: '71234567890123',
      caeVto: '20261030',
      importe: 100,
      ownData: ['Club Test', 'Perez Juan'],
    });
    const decoded = Buffer.from(url.split('?p=')[1], 'base64').toString('utf8');
    expect(decoded).toBe(
      '1|30712345678|15|1|12|71234567890123|20261030|100.00|Club Test|Perez Juan'
    );
  });
});

describe('escapeXml', () => {
  it('escapes all XML-significant characters', () => {
    expect(escapeXml(`a&b<c>d"e'f`)).toBe('a&amp;b&lt;c&gt;d&quot;e&apos;f');
  });
});

describe('decodePemEnv', () => {
  const pem = '-----BEGIN CERTIFICATE-----\nabc123\n-----END CERTIFICATE-----';

  it('returns PEM content untouched', () => {
    expect(decodePemEnv(pem)).toBe(pem);
  });

  it('decodes base64-encoded values (no BEGIN header)', () => {
    const b64 = Buffer.from(pem, 'utf8').toString('base64');
    expect(decodePemEnv(b64)).toBe(pem);
  });

  it('expands literal \\n sequences in PEM env values', () => {
    const inline = pem.replace(/\n/g, '\\n');
    expect(decodePemEnv(inline)).toBe(pem);
  });
});

describe('formatArcaDate', () => {
  it('formats as yyyymmdd in Argentina time zone', () => {
    expect(formatArcaDate(new Date('2026-01-01T02:00:00Z'))).toBe('20251231');
    expect(formatArcaDate(new Date('2026-10-16T15:30:00Z'))).toBe('20261016');
  });
});
