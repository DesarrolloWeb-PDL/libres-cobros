import { z } from 'zod';

// --- Status enums (string unions, kept in sync with Prisma string defaults) ---

export const SaasSubscriptionStatus = {
  ACTIVE: 'ACTIVE',
  CANCELLED: 'CANCELLED',
} as const;
export type SaasSubscriptionStatusType =
  (typeof SaasSubscriptionStatus)[keyof typeof SaasSubscriptionStatus];

export const SaasPlanChangeRequestStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;
export type SaasPlanChangeRequestStatusType =
  (typeof SaasPlanChangeRequestStatus)[keyof typeof SaasPlanChangeRequestStatus];

export const SaasInvoiceStatus = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  OVERDUE: 'OVERDUE',
} as const;
export type SaasInvoiceStatusType =
  (typeof SaasInvoiceStatus)[keyof typeof SaasInvoiceStatus];

export const SaasAutoDebitStatus = {
  PENDING_AUTH: 'PENDING_AUTH',
  ACTIVE: 'ACTIVE',
  CANCELLED: 'CANCELLED',
  FAILED: 'FAILED',
} as const;
export type SaasAutoDebitStatusType =
  (typeof SaasAutoDebitStatus)[keyof typeof SaasAutoDebitStatus];

export const SaasComprobanteEstado = {
  PENDIENTE: 'PENDIENTE',
  AUTORIZADO: 'AUTORIZADO',
  ERROR: 'ERROR',
} as const;
export type SaasComprobanteEstadoType =
  (typeof SaasComprobanteEstado)[keyof typeof SaasComprobanteEstado];

export const SaasArcaRegime = {
  MONOTRIBUTO: 'MONOTRIBUTO',
  RESPONSABLE_INSCRIPTO: 'RESPONSABLE_INSCRIPTO',
} as const;
export type SaasArcaRegimeType =
  (typeof SaasArcaRegime)[keyof typeof SaasArcaRegime];

// --- Zod enums ---

export const saasSubscriptionStatusSchema = z.enum(['ACTIVE', 'CANCELLED']);
export const saasPlanChangeRequestStatusSchema = z.enum([
  'PENDING',
  'APPROVED',
  'REJECTED',
]);
export const saasInvoiceStatusSchema = z.enum(['PENDING', 'PAID', 'OVERDUE']);
export const saasAutoDebitStatusSchema = z.enum([
  'PENDING_AUTH',
  'ACTIVE',
  'CANCELLED',
  'FAILED',
]);
export const saasComprobanteEstadoSchema = z.enum([
  'PENDIENTE',
  'AUTORIZADO',
  'ERROR',
]);
export const saasArcaRegimeSchema = z.enum([
  'MONOTRIBUTO',
  'RESPONSABLE_INSCRIPTO',
]);

// --- Zod schemas ---

export const saasPlanSchema = z.object({
  name: z.string().min(1),
  minMembers: z.number().int().min(0),
  maxMembers: z.number().int().min(0),
  priceArs: z.number().min(0),
  highlight: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const saasPlanUpdateSchema = saasPlanSchema.partial();

export const saasInvoicePaySchema = z.object({
  transferRef: z.string().min(1),
});

export const saasAutoDebitEnrollSchema = z.object({
  gateway: z.enum(['mercadopago', 'stripe']),
  amount: z.number().min(0),
  payerEmail: z.string().email().optional(),
});

export const saasPlanChangeRequestSchema = z.object({
  requestedSaasPlanId: z.string().min(1),
});

export const saasPlanChangeDecisionSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
});

// --- Site config saas keys (platform-level) ---

export const SAAS_SITE_CONFIG_KEYS = [
  'saas_billing_enabled',
  'saas_billing_day',
  'saas_arca_regime',
  'saas_arca_iva_rate',
  'saas_arca_pto_vta',
  'saas_reminder_days',
] as const;

export type SaasSiteConfigKey = (typeof SAAS_SITE_CONFIG_KEYS)[number];

// --- Inferred types ---

export type SaasPlanInput = z.infer<typeof saasPlanSchema>;
export type SaasPlanUpdateInput = z.infer<typeof saasPlanUpdateSchema>;
export type SaasInvoicePayInput = z.infer<typeof saasInvoicePaySchema>;
export type SaasAutoDebitEnrollInput = z.infer<typeof saasAutoDebitEnrollSchema>;
export type SaasPlanChangeRequestInput = z.infer<
  typeof saasPlanChangeRequestSchema
>;
export type SaasPlanChangeDecisionInput = z.infer<
  typeof saasPlanChangeDecisionSchema
>;
