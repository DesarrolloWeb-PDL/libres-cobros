/**
 * ARCA (ex-AFIP) electronic receipt emission — Phase 1: Recibo C (tipo 15).
 *
 * Self-hosted integration:
 * - WSAA: we sign the TA (login ticket) request locally with node-forge
 *   (CMS/PKCS#7, SHA-1) and POST it to the official LoginCms endpoint. The
 *   X.509 private key NEVER leaves this server. NOTE: `@afipsdk/afip.js` was
 *   evaluated and rejected: its TA method uploads cert+key to app.afipsdk.com
 *   (a paid cloud intermediary).
 * - WSFE: FECAESolicitar / FECompUltimoAutorizado / FECompConsultar are plain
 *   fetch SOAP POSTs for full control over CondicionIvaReceptor and complete
 *   request/response audit capture.
 *
 * Env (server-only): ARCA_PRODUCTION ("false" → homolog), ARCA_CUIT (our
 * representative CUIT), ARCA_KEY / ARCA_CERT (PEM content, base64 allowed).
 *
 * Phase 1 limitations (documented on purpose):
 * - CAEA is never used (contingency-only).
 * - No automatic retry on ambiguous network errors: an emission whose outcome
 *   is unknown is marked ERROR and must be reconciled manually with
 *   FECompConsultar (`consultarComprobante`). Admin retry UI is out of scope.
 * - In-process per-club+punto-venta mutex serializes numbering within one
 *   instance only; serverless multi-instance races remain possible. Recovery
 *   path for a race: the Comprobante.paymentId unique constraint + manual
 *   FECompConsultar check.
 */

import { prisma } from '@/lib/db';
import { getInstitutionSiteConfigValues } from '@/lib/site-config';
import forge from 'node-forge';
import { XMLParser } from 'fast-xml-parser';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ArcaClubConfig {
  enabled: boolean;
  cuit: string | null; // club's CUIT (fiscal emitter, represented by ours)
  ptoVta: number | null;
}

export interface ReciboCAuth {
  token: string;
  sign: string;
  cuit: string;
}

export interface BuildReciboCPayloadParams {
  ptoVta: number;
  nro: number;
  docTipo: number; // 80 = CUIT, 99 = DNI/otro
  docNro: number;
  condicionIvaReceptor: number; // 5 CF, 6 MONO, 1 RI, 4 EXENTO
  total: number;
  fecha: Date | string; // CbteFch (Argentina emission date, yyyymmdd)
  auth?: ReciboCAuth;
}

export type EmitirReciboResult =
  | { estado: 'AUTORIZADO'; cae: string; caeVto: string | null }
  | { estado: 'ERROR'; error: string }
  | { estado: 'OMITIDO'; reason: string };

// ---------------------------------------------------------------------------
// Endpoints & config
// ---------------------------------------------------------------------------

const WSFE_URLS = {
  prod: 'https://servicios1.afip.gov.ar/wsfev1/service.asmx',
  homolog: 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx',
} as const;

const WSAA_LOGIN_CMS_URLS = {
  prod: 'https://wsaa.afip.gov.ar/ws/services/LoginCms',
  homolog: 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms',
} as const;

const SOAP_TIMEOUT_MS = 30_000;

export function isArcaProduction(): boolean {
  return process.env.ARCA_PRODUCTION === 'true';
}

function wsfeUrl(): string {
  return isArcaProduction() ? WSFE_URLS.prod : WSFE_URLS.homolog;
}

function wsaaUrl(): string {
  return isArcaProduction() ? WSAA_LOGIN_CMS_URLS.prod : WSAA_LOGIN_CMS_URLS.homolog;
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatAmount(amount: number): string {
  return amount.toFixed(2);
}

/** CbteFch / CAEFchVto format: yyyymmdd (Argentina date). */
export function formatArcaDate(date: Date = new Date()): string {
  // en-CA renders as YYYY-MM-DD for the given time zone.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(date)
    .replace(/-/g, '');
}

function parseArcaDate(value: string): Date | null {
  if (!/^\d{8}$/.test(value)) return null;
  const y = Number(value.slice(0, 4));
  const m = Number(value.slice(4, 6));
  const d = Number(value.slice(6, 8));
  return new Date(Date.UTC(y, m - 1, d));
}

/**
 * Accepts a PEM value or its base64-encoded form (env vars without the
 * "-----BEGIN ...-----" header). Also tolerates literal "\n" sequences.
 */
export function decodePemEnv(value: string): string {
  let pem = value.trim();
  if (!pem.includes('BEGIN')) {
    pem = Buffer.from(pem, 'base64').toString('utf8');
  } else if (!pem.includes('\n') && pem.includes('\\n')) {
    pem = pem.replace(/\\n/g, '\n');
  }
  return pem.trim();
}

const xmlParser = new XMLParser({
  ignoreAttributes: true,
  removeNSPrefix: true,
  parseTagValue: true,
});

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

// ---------------------------------------------------------------------------
// Per-club SiteConfig
// ---------------------------------------------------------------------------

export async function getArcaConfig(clubId: string): Promise<ArcaClubConfig> {
  const values = await getInstitutionSiteConfigValues(clubId, [
    'arca_enabled',
    'arca_cuit',
    'arca_punto_vta',
  ]);

  const rawPtoVta = (values.arca_punto_vta ?? '').trim();
  const ptoVta = /^\d+$/.test(rawPtoVta) ? Number(rawPtoVta) : null;
  const cuit = (values.arca_cuit ?? '').trim();
  const normalizedCuit = /^\d{11}$/.test(cuit) ? cuit : null;

  return {
    enabled: values.arca_enabled === 'true',
    cuit: normalizedCuit,
    ptoVta: ptoVta !== null && ptoVta > 0 ? ptoVta : null,
  };
}

// ---------------------------------------------------------------------------
// CondicionIvaReceptor (mandatory in production since 2025-07-01)
// ---------------------------------------------------------------------------

const IVA_RECEPTOR_CODES: Record<string, number> = {
  CF: 5, // Consumidor Final
  MONO: 6, // Monotributo
  RI: 1, // Responsable Inscripto
  EXENTO: 4, // Exento
};

export function getIvaReceptorCode(cond: string): number {
  const code = IVA_RECEPTOR_CODES[cond];
  if (code === undefined) {
    throw new Error(`Unknown IVA condition: ${cond}`);
  }
  return code;
}

// ---------------------------------------------------------------------------
// QR (RG 5.614) — https://www.arca.gob.ar/fe/qr/
// TODO: confirm the exact "own data" fields required for Recibo C (tipo 15)
// against the official spec PDF (https://www.arca.gob.ar/fe/qr/documentos/
// QRespecificaciones.pdf); the compact base64 format below follows the
// documented general layout.
// ---------------------------------------------------------------------------

export function buildArcaQrUrl(params: {
  emitterCuit: string;
  tipo: number;
  ptoVta: number;
  nro: number;
  cae: string;
  caeVto: string; // yyyymmdd
  importe: number;
  ownData?: string[];
}): string {
  const parts = [
    '1',
    params.emitterCuit,
    String(params.tipo),
    String(params.ptoVta),
    String(params.nro),
    params.cae,
    params.caeVto,
    formatAmount(params.importe),
    ...(params.ownData ?? []),
  ];
  const payload = Buffer.from(parts.join('|'), 'utf8').toString('base64');
  return `https://www.arca.gob.ar/fe/qr/?p=${payload}`;
}

// ---------------------------------------------------------------------------
// FECAESolicitar payload (pure — exported for tests)
// ---------------------------------------------------------------------------

export function buildReciboCPayload({
  ptoVta,
  nro,
  docTipo,
  docNro,
  condicionIvaReceptor,
  total,
  fecha,
  auth,
}: BuildReciboCPayloadParams): string {
  const cbteFch = typeof fecha === 'string' ? fecha : formatArcaDate(fecha);
  const amount = formatAmount(total);

  // Recibo C (type C): NO IVA breakdown array is allowed. The whole amount
  // goes to ImpTotConc (no gravado), with ImpNetoGravado/ImpOpEx/ImpTrib = 0.
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wsfe="http://ar.gov.afip.dif.FEV1/">
  <soapenv:Header/>
  <soapenv:Body>
    <wsfe:FECAESolicitar>
      <wsfe:FeCAEReq>
        <wsfe:FeCabReq>
          <wsfe:CantReg>1</wsfe:CantReg>
          <wsfe:PtoVta>${ptoVta}</wsfe:PtoVta>
          <wsfe:CbteTipo>15</wsfe:CbteTipo>
        </wsfe:FeCabReq>
        <wsfe:FeDetReq>
          <wsfe:FECAEDetRequest>
            <wsfe:Concepto>1</wsfe:Concepto>
            <wsfe:DocTipo>${docTipo}</wsfe:DocTipo>
            <wsfe:DocNro>${docNro}</wsfe:DocNro>
            <wsfe:CbteDesde>${nro}</wsfe:CbteDesde>
            <wsfe:CbteHasta>${nro}</wsfe:CbteHasta>
            <wsfe:CbteFch>${cbteFch}</wsfe:CbteFch>
            <wsfe:ImpTotal>${amount}</wsfe:ImpTotal>
            <wsfe:ImpTotConc>${amount}</wsfe:ImpTotConc>
            <wsfe:ImpNetoGravado>0.00</wsfe:ImpNetoGravado>
            <wsfe:ImpOpEx>0.00</wsfe:ImpOpEx>
            <wsfe:ImpTrib>0.00</wsfe:ImpTrib>
            <wsfe:MonId>PES</wsfe:MonId>
            <wsfe:MonCtz>1.000000</wsfe:MonCtz>
            <wsfe:CondicionIvaReceptor>${condicionIvaReceptor}</wsfe:CondicionIvaReceptor>
          </wsfe:FECAEDetRequest>
        </wsfe:FeDetReq>
      </wsfe:FeCAEReq>
      <wsfe:FeAuthReq>
        <wsfe:Token>${escapeXml(auth?.token ?? '')}</wsfe:Token>
        <wsfe:Sign>${escapeXml(auth?.sign ?? '')}</wsfe:Sign>
        <wsfe:Cuit>${escapeXml(auth?.cuit ?? '')}</wsfe:Cuit>
      </wsfe:FeAuthReq>
    </wsfe:FECAESolicitar>
  </soapenv:Body>
</soapenv:Envelope>`;
}

// ---------------------------------------------------------------------------
// SOAP transport
// ---------------------------------------------------------------------------

async function soapPost(url: string, body: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SOAP_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        SOAPAction: '""',
      },
      body,
      signal: controller.signal,
    });
    const text = await response.text();
    if (!response.ok) {
      // Do not include the request body (may contain the TA) in the error.
      throw new Error(`ARCA SOAP HTTP ${response.status} from ${new URL(url).host}`);
    }
    return text;
  } finally {
    clearTimeout(timer);
  }
}

interface SoapFault {
  faultcode?: string;
  faultstring?: string;
}

function extractSoapFault(xmlDoc: unknown): string | null {
  const fault = (xmlDoc as { Envelope?: { Body?: { Fault?: SoapFault } } })
    ?.Envelope?.Body?.Fault;
  if (!fault) return null;
  return [fault.faultcode, fault.faultstring].filter(Boolean).join(' — ') || 'SOAP Fault';
}

// ---------------------------------------------------------------------------
// WSAA — TA (token + sign) via LoginCms, signed locally with node-forge
// ---------------------------------------------------------------------------

interface TaCredentials {
  cuit: string;
  token: string;
  sign: string;
  expiresAt: number;
}

// In-process TA cache (TA is valid 12h; we refresh after 11h). Multi-instance
// deployments will each hold their own TA — that is fine, WSAA allows several.
const taCache = new Map<string, TaCredentials>();

function readArcaCredentials(): { cuit: string; certPem: string; keyPem: string } | null {
  const cuit = (process.env.ARCA_CUIT ?? '').trim();
  const certRaw = (process.env.ARCA_CERT ?? '').trim();
  const keyRaw = (process.env.ARCA_KEY ?? '').trim();
  if (!cuit || !certRaw || !keyRaw) return null;
  if (!/^\d{11}$/.test(cuit)) return null;
  try {
    return { cuit, certPem: decodePemEnv(certRaw), keyPem: decodePemEnv(keyRaw) };
  } catch {
    return null;
  }
}

export function hasArcaCredentials(): boolean {
  return readArcaCredentials() !== null;
}

function buildLoginTicketRequestXml(cuit: string): string {
  const now = new Date();
  const expires = new Date(now.getTime() + 12 * 60 * 60 * 1000);
  const uniqueId = Math.floor(Math.random() * 2_147_483_647);
  const iso = (d: Date) => d.toISOString();
  return `<loginTicketRequest version="1.0">
  <header>
    <uniqueId>${uniqueId}</uniqueId>
    <generationTime>${iso(now)}</generationTime>
    <expirationTime>${iso(expires)}</expirationTime>
  </header>
  <service>wsfe</service>
  <cuit>${cuit}</cuit>
</loginTicketRequest>`;
}

/** Signs the TA request XML as detached CMS/PKCS#7 (SHA-1, per WSAA spec). */
export function signLoginTicketRequest(taXml: string, certPem: string, keyPem: string): string {
  const certificate = forge.pki.certificateFromPem(certPem);
  const privateKey = forge.pki.privateKeyFromPem(keyPem);

  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(taXml, 'utf8');
  p7.addCertificate(certificate);
  p7.addSigner({
    key: privateKey,
    certificate,
    digestAlgorithm: forge.pki.oids.sha1,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest },
      // node-forge accepts a Date here; the ambient types are overly strict.
      { type: forge.pki.oids.signingTime, value: new Date() as unknown as string },
    ],
  });
  p7.sign({ detached: true });

  const der = forge.asn1.toDer(p7.toAsn1()).getBytes();
  return Buffer.from(der, 'binary').toString('base64');
}

async function requestTa(cuit: string): Promise<TaCredentials> {
  const cached = taCache.get(cuit);
  if (cached && cached.expiresAt > Date.now()) {
    return cached;
  }

  const creds = readArcaCredentials();
  if (!creds) {
    throw new Error('ARCA credentials are not configured');
  }

  const cms = signLoginTicketRequest(buildLoginTicketRequestXml(cuit), creds.certPem, creds.keyPem);

  const envelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wsaa="http://wsaa.view.sua.dvadac.com.ar/">
  <soapenv:Header/>
  <soapenv:Body>
    <wsaa:loginCms>
      <wsaa:in0>${escapeXml(cms)}</wsaa:in0>
    </wsaa:loginCms>
  </soapenv:Body>
</soapenv:Envelope>`;

  const raw = await soapPost(wsaaUrl(), envelope);
  const doc = xmlParser.parse(raw) as {
    Envelope?: {
      Body?: {
        loginCmsResponse?: { loginCmsReturn?: string };
        Fault?: SoapFault;
      };
    };
  };

  const fault = extractSoapFault(doc);
  if (fault) {
    // Never include token/sign material; WSAA faults carry reason text only.
    throw new Error(`WSAA LoginCms fault: ${fault}`);
  }

  const returned = doc.Envelope?.Body?.loginCmsResponse?.loginCmsReturn;
  if (!returned) {
    throw new Error('WSAA LoginCms returned an unexpected response');
  }

  const ticketDoc = xmlParser.parse(Buffer.from(returned, 'base64').toString('utf8')) as {
    loginTicketResponse?: {
      credentials?: { token?: string; sign?: string };
    };
  };

  const token = ticketDoc.loginTicketResponse?.credentials?.token;
  const sign = ticketDoc.loginTicketResponse?.credentials?.sign;
  if (!token || !sign) {
    throw new Error('WSAA LoginCms response is missing token/sign');
  }

  const credentials: TaCredentials = {
    cuit,
    token,
    sign,
    // Refresh at 11h; the TA itself is valid 12h.
    expiresAt: Date.now() + 11 * 60 * 60 * 1000,
  };
  taCache.set(cuit, credentials);
  return credentials;
}

/** Test-only: clears the in-process TA cache. */
export function clearArcaTaCache(): void {
  taCache.clear();
}

// ---------------------------------------------------------------------------
// WSFE calls
// ---------------------------------------------------------------------------

interface FeAuthParams {
  token: string;
  sign: string;
  cuit: string;
}

function authXml(auth: FeAuthParams): string {
  return `<wsfe:FeAuthReq>
      <wsfe:Token>${escapeXml(auth.token)}</wsfe:Token>
      <wsfe:Sign>${escapeXml(auth.sign)}</wsfe:Sign>
      <wsfe:Cuit>${escapeXml(auth.cuit)}</wsfe:Cuit>
    </wsfe:FeAuthReq>`;
}

export async function getUltimoAutorizado(cuit: string, ptoVta: number, tipo = 15): Promise<number> {
  const auth = await requestTa(cuit);
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wsfe="http://ar.gov.afip.dif.FEV1/">
  <soapenv:Header/>
  <soapenv:Body>
    <wsfe:FECompUltimoAutorizado>
      <wsfe:FeCompUltimoAutorizadoReq>
        <wsfe:PtoVta>${ptoVta}</wsfe:PtoVta>
        <wsfe:CbteTipo>${tipo}</wsfe:CbteTipo>
      </wsfe:FeCompUltimoAutorizadoReq>
      ${authXml(auth)}
    </wsfe:FECompUltimoAutorizado>
  </soapenv:Body>
</soapenv:Envelope>`;

  const raw = await soapPost(wsfeUrl(), body);
  const doc = xmlParser.parse(raw) as {
    Envelope?: {
      Body?: {
        FECompUltimoAutorizadoResponse?: {
          FECompUltimoAutorizadoResult?: { CbteNro?: number | string };
        };
        Fault?: SoapFault;
      };
    };
  };

  const fault = extractSoapFault(doc);
  if (fault) throw new Error(`WSFE FECompUltimoAutorizado fault: ${fault}`);

  const result =
    doc.Envelope?.Body?.FECompUltimoAutorizadoResponse?.FECompUltimoAutorizadoResult;
  const ultimo = Number(result?.CbteNro);
  if (!Number.isInteger(ultimo) || Number.isNaN(ultimo)) {
    throw new Error('WSFE FECompUltimoAutorizado returned an unexpected response');
  }
  return ultimo;
}

export interface SolicitarCaeResult {
  resultado: string; // A | R | O | ...
  cae: string;
  caeVto: string | null; // yyyymmdd
  observaciones: string[];
  errores: string[];
  rawResponse: string;
}

interface FeObs {
  Code?: number | string;
  Msg?: string;
}

function collectObservaciones(det: Record<string, unknown>): string[] {
  const obs = asArray<FeObs>(
    det.Observaciones as FeObs | FeObs[] | undefined
  );
  return obs
    .map((o) => `${o.Code ?? ''} ${o.Msg ?? ''}`.trim())
    .filter(Boolean);
}

export async function solicitarCAE(cuit: string, xml: string): Promise<SolicitarCaeResult> {
  const raw = await soapPost(wsfeUrl(), xml);
  const doc = xmlParser.parse(raw) as {
    Envelope?: {
      Body?: {
        FECAESolicitarResponse?: {
          FECAESolicitarResult?: {
            FeCabResp?: { Resultado?: string };
            FeDetResp?: {
              FECAEDetResponse?: Record<string, unknown> | Record<string, unknown>[];
            };
            Errors?: { Err?: FeObs | FeObs[] };
          };
        };
        Fault?: SoapFault;
      };
    };
  };

  const fault = extractSoapFault(doc);
  if (fault) {
    return {
      resultado: 'R',
      cae: '',
      caeVto: null,
      observaciones: [],
      errores: [`SOAP Fault: ${fault}`],
      rawResponse: raw,
    };
  }

  const result =
    doc.Envelope?.Body?.FECAESolicitarResponse?.FECAESolicitarResult;
  if (!result) {
    return {
      resultado: 'ERROR',
      cae: '',
      caeVto: null,
      observaciones: [],
      errores: ['WSFE FECAESolicitar returned an unexpected response'],
      rawResponse: raw,
    };
  }

  const detResponses = asArray<Record<string, unknown>>(
    result.FeDetResp?.FECAEDetResponse
  );
  const det = detResponses[0] ?? {};

  const errores = asArray<FeObs>(result.Errors?.Err).map(
    (e) => `${e.Code ?? ''} ${e.Msg ?? ''}`.trim()
  );

  const resultado =
    (det.Resultado as string | undefined) ??
    (result.FeCabResp?.Resultado as string | undefined) ??
    '';

  // CAE (14 digits) and CAEFchVto (8 digits) are parsed as numbers by
  // fast-xml-parser — always stringify before use.
  return {
    resultado: resultado !== undefined && resultado !== null ? String(resultado) : '',
    cae: det.CAE !== undefined && det.CAE !== null ? String(det.CAE) : '',
    caeVto:
      det.CAEFchVto !== undefined && det.CAEFchVto !== null
        ? String(det.CAEFchVto)
        : null,
    observaciones: collectObservaciones(det),
    errores,
    rawResponse: raw,
  };
}

/**
 * FECompConsultar — used to reconcile ambiguous outcomes (e.g. timeout after
 * the request may have reached ARCA). Never retried automatically.
 */
export async function consultarComprobante(
  cuit: string,
  ptoVta: number,
  nro: number,
  tipo = 15
): Promise<{ cae: string; caeVto: string | null; resultado: string } | null> {
  const auth = await requestTa(cuit);
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wsfe="http://ar.gov.afip.dif.FEV1/">
  <soapenv:Header/>
  <soapenv:Body>
    <wsfe:FECompConsultar>
      <wsfe:FeCompConsultarReq>
        <wsfe:PtoVta>${ptoVta}</wsfe:PtoVta>
        <wsfe:CbteTipo>${tipo}</wsfe:CbteTipo>
        <wsfe:CbteNro>${nro}</wsfe:CbteNro>
      </wsfe:FeCompConsultarReq>
      ${authXml(auth)}
    </wsfe:FECompConsultar>
  </soapenv:Body>
</soapenv:Envelope>`;

  const raw = await soapPost(wsfeUrl(), body);
  const doc = xmlParser.parse(raw) as {
    Envelope?: {
      Body?: {
        FECompConsultarResponse?: {
          FECompConsultarResult?: {
            Resultado?: string;
            CAE?: string;
            CAEFchVto?: string;
          };
        };
        Fault?: SoapFault;
      };
    };
  };

  if (extractSoapFault(doc)) return null;

  const result = doc.Envelope?.Body?.FECompConsultarResponse?.FECompConsultarResult;
  if (!result || !result.CAE) return null;

  return {
    cae: String(result.CAE),
    caeVto: result.CAEFchVto ? String(result.CAEFchVto) : null,
    resultado: String(result.Resultado ?? ''),
  };
}

// ---------------------------------------------------------------------------
// Emission entry point
// ---------------------------------------------------------------------------

// Per club+punto-venta+tipo promise chain: serializes "ultimo → solicitar" so
// two concurrent confirmations in the SAME instance cannot grab the same
// number. Serverless multi-instance races remain possible (see file header).
const emissionChains = new Map<string, Promise<unknown>>();

function withEmissionLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const previous = emissionChains.get(key) ?? Promise.resolve();
  const run = previous.then(fn, fn);
  emissionChains.set(
    key,
    run.catch(() => undefined)
  );
  return run;
}

function resolveDocIdentificador(member: {
  cuit: string | null;
  dni: string | null;
}): { docTipo: number; docNro: number } | null {
  if (member.cuit && /^\d{11}$/.test(member.cuit)) {
    return { docTipo: 80, docNro: Number(member.cuit) };
  }
  if (member.dni && /^\d{7,8}$/.test(member.dni)) {
    return { docTipo: 99, docNro: Number(member.dni) };
  }
  return null;
}

export async function emitirReciboC(paymentId: string): Promise<EmitirReciboResult> {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { member: true },
    });

    if (!payment) {
      return { estado: 'ERROR', error: `Payment ${paymentId} not found` };
    }

    // Idempotency: the unique Comprobante.paymentId row is the emission lock.
    const existing = await prisma.comprobante.findUnique({
      where: { paymentId },
    });
    if (existing) {
      if (existing.estado === 'AUTORIZADO') {
        return {
          estado: 'AUTORIZADO',
          cae: existing.cae,
          caeVto: existing.caeVto?.toISOString() ?? null,
        };
      }
      if (existing.estado === 'ERROR') {
        return { estado: 'ERROR', error: existing.error ?? 'Previous emission failed' };
      }
      // PENDIENTE (stale, e.g. crash mid-emission): do NOT blindly re-emit —
      // an unknown outcome must be reconciled with FECompConsultar first.
      // Manual retry is the recovery path (admin UI: out of scope).
      return {
        estado: 'OMITIDO',
        reason: existing.error ?? 'Emission left in PENDIENTE; reconcile with FECompConsultar',
      };
    }

    const config = await getArcaConfig(payment.clubId);
    if (!config.enabled) {
      return { estado: 'OMITIDO', reason: 'ARCA emission disabled for this club' };
    }
    if (!config.cuit || !config.ptoVta) {
      console.warn(
        `[arca] club ${payment.clubId} has arca_enabled but is missing arca_cuit/arca_punto_vta; skipping emission`
      );
      return { estado: 'OMITIDO', reason: 'Incomplete ARCA club config' };
    }
    // Capture narrowed locals so the emission closure keeps non-null types.
    const clubCuit: string = config.cuit;
    const puntoVta: number = config.ptoVta;
    if (!hasArcaCredentials()) {
      console.warn(
        '[arca] ARCA_CUIT/ARCA_KEY/ARCA_CERT env vars are not configured; skipping emission'
      );
      return { estado: 'OMITIDO', reason: 'ARCA credentials not configured' };
    }

    const doc = resolveDocIdentificador(payment.member);
    if (!doc) {
      // Lock the payment with an ERROR row so the gap is visible/auditable.
      await prisma.comprobante.create({
        data: {
          clubId: payment.clubId,
          paymentId: payment.id,
          memberId: payment.memberId,
          tipo: 15,
          ptoVta: puntoVta,
          nro: 0,
          total: payment.amount,
          docTipo: 0,
          docNro: 0,
          condicionIvaReceptor: 0,
          estado: 'ERROR',
          error:
            'El socio no tiene CUIT ni DNI válidos; no se puede emitir el Recibo C',
        },
      });
      return {
        estado: 'ERROR',
        error: 'El socio no tiene CUIT ni DNI válidos; no se puede emitir el Recibo C',
      };
    }

    const condicionIvaReceptor = getIvaReceptorCode(payment.member.ivaCondicion || 'CF');
    const lockKey = `${clubCuit}:${puntoVta}:15`;

    return await withEmissionLock(lockKey, async () => {
      // Re-check after acquiring the lock (another concurrent call may have
      // finished while we waited).
      const raceRow = await prisma.comprobante.findUnique({ where: { paymentId } });
      if (raceRow) {
        if (raceRow.estado === 'AUTORIZADO') {
          return {
            estado: 'AUTORIZADO' as const,
            cae: raceRow.cae,
            caeVto: raceRow.caeVto?.toISOString() ?? null,
          };
        }
        return {
          estado: 'OMITIDO' as const,
          reason: 'Concurrent emission already created the comprobante row',
        };
      }

      // Create the PENDIENTE row FIRST: the unique paymentId constraint is
      // the cross-instance guard against double emission. nro is filled in
      // after FECompUltimoAutorizado (placeholder 0).
      const comprobante = await prisma.comprobante.create({
        data: {
          clubId: payment.clubId,
          paymentId: payment.id,
          memberId: payment.memberId,
          tipo: 15,
          ptoVta: puntoVta,
          nro: 0,
          total: payment.amount,
          docTipo: doc.docTipo,
          docNro: doc.docNro,
          condicionIvaReceptor,
          estado: 'PENDIENTE',
        },
      });

      try {
        const auth = await requestTa(clubCuit);
        const ultimo = await getUltimoAutorizado(clubCuit, puntoVta);
        const nro = ultimo + 1;

        const xml = buildReciboCPayload({
          ptoVta: puntoVta,
          nro,
          docTipo: doc.docTipo,
          docNro: doc.docNro,
          condicionIvaReceptor,
          total: payment.amount,
          fecha: payment.confirmedAt ?? new Date(),
          auth,
        });

        const caeResult = await solicitarCAE(clubCuit, xml);

        if (caeResult.resultado === 'A' && caeResult.cae) {
          const caeVto = parseArcaDate(caeResult.caeVto ?? '');
          await prisma.comprobante.update({
            where: { id: comprobante.id },
            data: {
              nro,
              cae: caeResult.cae,
              caeVto,
              estado: 'AUTORIZADO',
              rawRequest: xml,
              rawResponse: caeResult.rawResponse,
            },
          });
          return {
            estado: 'AUTORIZADO' as const,
            cae: caeResult.cae,
            caeVto: caeResult.caeVto,
          };
        }

        const messages = [...caeResult.errores, ...caeResult.observaciones];
        const errorText =
          messages.length > 0
            ? `Resultado ${caeResult.resultado}: ${messages.join(' | ')}`
            : `Resultado ${caeResult.resultado} sin CAE`;
        await prisma.comprobante.update({
          where: { id: comprobante.id },
          data: {
            nro,
            estado: 'ERROR',
            error: errorText,
            rawRequest: xml,
            rawResponse: caeResult.rawResponse,
          },
        });
        return { estado: 'ERROR' as const, error: errorText };
      } catch (error) {
        // Never retry automatically: the outcome of a timed-out FECAESolicitar
        // is unknown and a blind retry could duplicate the receipt. Mark ERROR;
        // reconciliation via consultarComprobante + manual retry is the path.
        const message = error instanceof Error ? error.message : String(error);
        await prisma.comprobante
          .update({
            where: { id: comprobante.id },
            data: { estado: 'ERROR', error: message },
          })
          .catch(() => undefined);
        return { estado: 'ERROR' as const, error: message };
      }
    });
  } catch (error) {
    // emitirReciboC must NEVER throw: it runs after payment confirmation and
    // a receipt failure cannot break the payment flow.
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[arca] emitirReciboC failed for payment ${paymentId}: ${message}`);
    return { estado: 'ERROR', error: message };
  }
}
