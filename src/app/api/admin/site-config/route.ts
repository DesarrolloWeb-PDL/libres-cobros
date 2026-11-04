import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { requireInstitution, AuthError } from '@/lib/access';
import { encryptArcaKey } from '@/lib/arca';
import type { SiteConfigListItem, SiteConfigListResponse } from '@/types/config';

const UpdateSiteConfigSchema = z.object({
  configs: z
    .array(
      z.object({
        key: z.string().min(1),
        value: z.string(),
      })
    )
    .min(1),
});

const UpdateThemeSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  bgColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});

const CONFIG_KEYS = [
  'commission_rate',
  'bank_alias',
  'bank_cbu',
  'bank_cuit',
  'bank_name',
  'bank_holder',
  'bank_reference',
  'mercadopago_access_token',
  'mercadopago_client_secret',
  'stripe_secret_key',
  'stripe_webhook_secret',
  'whatsapp_phone_number_id',
  'whatsapp_access_token',
  'resend_api_key',
  'resend_from_email',
  'arca_enabled',
  'arca_cuit',
  'arca_punto_vta',
  'arca_cert',
  'arca_key',
  'stripe_enabled',
  'mercadopago_enabled',
  'bank_transfer_enabled',
  // Platform SaaS billing (platform-level; stored with clubId = null)
  'saas_billing_enabled',
  'saas_billing_day',
  'saas_arca_regime',
  'saas_arca_iva_rate',
  'saas_arca_pto_vta',
  'saas_arca_cuit',
  'saas_arca_cert',
  'saas_arca_key',
  'saas_reminder_days',
  'saas_due_soon_days',
];

// Institution-scoped keys must only be written when an institution is selected.
const INSTITUTION_ONLY_KEYS = [
  'commission_rate',
  'bank_alias',
  'bank_cbu',
  'bank_cuit',
  'bank_name',
  'bank_holder',
  'bank_reference',
  'mercadopago_access_token',
  'mercadopago_client_secret',
  'stripe_secret_key',
  'stripe_webhook_secret',
  'whatsapp_phone_number_id',
  'whatsapp_access_token',
  'resend_api_key',
  'resend_from_email',
  'arca_enabled',
  'arca_cuit',
  'arca_punto_vta',
  'arca_cert',
  'arca_key',
  'stripe_enabled',
  'mercadopago_enabled',
  'bank_transfer_enabled',
];

// Platform-scoped keys must only be written when no institution is selected.
const PLATFORM_ONLY_KEYS = [
  'saas_billing_enabled',
  'saas_billing_day',
  'saas_arca_regime',
  'saas_arca_iva_rate',
  'saas_arca_pto_vta',
  'saas_arca_cuit',
  'saas_arca_cert',
  'saas_arca_key',
  'saas_reminder_days',
  'saas_due_soon_days',
];

const PRIVATE_KEY_CONFIG_KEYS = new Set(['arca_key', 'saas_arca_key']);
const CERT_CONFIG_KEYS = new Set(['arca_cert', 'saas_arca_cert']);

function maskCertValue(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const tail = trimmed.slice(-20);
  return tail.length === 20 ? `···${tail}` : '';
}

function serializeConfig(config: {
  id: string;
  key: string;
  value: string;
  updatedAt: Date;
}): SiteConfigListItem {
  const key = config.key;
  const rawValue = config.value;
  const configured = rawValue.trim().length > 0;

  if (PRIVATE_KEY_CONFIG_KEYS.has(key)) {
    return {
      id: config.id,
      key,
      value: '',
      keyConfigured: configured,
      description: getConfigDescription(key),
      updatedAt: config.updatedAt.toISOString(),
    };
  }

  if (CERT_CONFIG_KEYS.has(key)) {
    return {
      id: config.id,
      key,
      value: maskCertValue(rawValue),
      certConfigured: configured,
      description: getConfigDescription(key),
      updatedAt: config.updatedAt.toISOString(),
    };
  }

  return {
    id: config.id,
    key,
    value: rawValue,
    description: getConfigDescription(key),
    updatedAt: config.updatedAt.toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireInstitution(request);

    // Platform-level configs (SUPER_ADMIN without an institution selection).
    // Stored with clubId = null; theme lives on /api/admin/theme instead.
    if (!ctx.institutionId) {
      const platformConfigs = await prisma.siteConfig.findMany({
        where: { clubId: null, key: { in: CONFIG_KEYS } },
        orderBy: { key: 'asc' },
      });

      const platformMap = new Map(platformConfigs.map((c) => [c.key, c]));
      const ensuredPlatform = await prisma.$transaction(
        CONFIG_KEYS.filter((key) => !platformMap.has(key)).map((key) =>
          prisma.siteConfig.create({
            data: { clubId: null, key, value: '' },
          })
        )
      );

      const allPlatform = [...platformConfigs, ...ensuredPlatform].sort((a, b) =>
        a.key.localeCompare(b.key)
      );

      return apiSuccess({ data: allPlatform.map(serializeConfig), theme: null });
    }

    const configs = await prisma.siteConfig.findMany({
      where: { clubId: ctx.institutionId, key: { in: CONFIG_KEYS } },
      orderBy: { key: 'asc' },
    });

    const configMap = new Map(configs.map((c) => [c.key, c]));

    const ensuredConfigs = await prisma.$transaction(
      CONFIG_KEYS.filter((key) => !configMap.has(key)).map((key) =>
        prisma.siteConfig.create({
          data: {
            clubId: ctx.institutionId!,
            key,
            value: '',
          },
        })
      )
    );

    const allConfigs = [...configs, ...ensuredConfigs].sort((a, b) =>
      a.key.localeCompare(b.key)
    );

    // Get theme from first config record (they share the same theme)
    const themeConfig = allConfigs[0];
    const theme = themeConfig ? {
      primaryColor: themeConfig.primaryColor,
      secondaryColor: themeConfig.secondaryColor,
      accentColor: themeConfig.accentColor,
      bgColor: themeConfig.bgColor,
    } : null;

    const response: SiteConfigListResponse = {
      data: allConfigs.map(serializeConfig),
      theme,
    };

    return apiSuccess(response);
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }
    return apiDbError(error, 'Error al listar la configuración');
  }
}

export async function PUT(request: NextRequest) {
  try {
    const ctx = await requireInstitution(request);

    const body = await request.json();

    // Check if it's a theme update
    const themeParsed = UpdateThemeSchema.safeParse(body);
    if (themeParsed.success) {
      if (!ctx.institutionId) {
        return apiError(
          'Seleccione una institución',
          400,
          'Se requiere una institución para actualizar el tema',
          'INSTITUTION_REQUIRED'
        );
      }
      const { primaryColor, secondaryColor, accentColor, bgColor } = themeParsed.data;

      // Update all config records for this club with the new theme
      await prisma.siteConfig.updateMany({
        where: { clubId: ctx.institutionId },
        data: { primaryColor, secondaryColor, accentColor, bgColor },
      });

      return apiSuccess({ message: 'Tema actualizado correctamente' });
    }

    // Otherwise, process as config update
    const parsed = UpdateSiteConfigSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        'Datos inválidos',
        400,
        parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        'VALIDATION_ERROR'
      );
    }

    const { configs } = parsed.data;

    const invalidKeys = configs.filter((c) => !CONFIG_KEYS.includes(c.key));
    if (invalidKeys.length > 0) {
      return apiError(
        'Claves de configuración no permitidas',
        400,
        invalidKeys.map((c) => c.key).join(', '),
        'VALIDATION_ERROR'
      );
    }

    // Enforce scoping: institution keys require an institution selection and
    // platform keys require the platform-wide scope. This closes the cross-
    // tenant write hole where a SUPER_ADMIN without an institution selected
    // would write arca_* rows with clubId=null (dead data).
    const scopeError = ctx.institutionId
      ? configs.find((c) => PLATFORM_ONLY_KEYS.includes(c.key))
      : configs.find((c) => INSTITUTION_ONLY_KEYS.includes(c.key));
    if (scopeError) {
      return apiError(
        'Clave fuera de alcance',
        400,
        `${scopeError.key} no puede guardarse en este ámbito`,
        'VALIDATION_ERROR'
      );
    }

    const commissionRate = configs.find((c) => c.key === 'commission_rate');
    if (commissionRate) {
      const rate = parseFloat(commissionRate.value);
      if (Number.isNaN(rate) || rate < 0 || rate > 100) {
        return apiError(
          'Tasa de comisión inválida',
          400,
          'Debe ser un número entre 0 y 100',
          'VALIDATION_ERROR'
        );
      }
    }

    const clubId = ctx.institutionId;

    // Platform-level config (SUPER_ADMIN without institution selection).
    // @@unique([clubId, key]) treats NULLs as distinct in PostgreSQL, so upsert
    // via the compound key is unreliable — use findFirst + update/create.
    const updated = await prisma.$transaction(async (tx) => {
      const results = [];
      for (const config of configs) {
        const existing = clubId
          ? await tx.siteConfig.findUnique({
              where: { clubId_key: { clubId, key: config.key } },
            })
          : await tx.siteConfig.findFirst({
              where: { clubId: null, key: config.key },
            });

        const isSecretKey = PRIVATE_KEY_CONFIG_KEYS.has(config.key);
        const isCertKey = CERT_CONFIG_KEYS.has(config.key);
        const currentValue = existing?.value ?? '';

        // Write-only secrets: an empty/masked value means "keep existing".
        // This lets the UI show "configured" without echoing the PEM back.
        let nextValue = config.value;
        if ((isSecretKey || isCertKey) && !nextValue.trim()) {
          nextValue = currentValue;
        }
        if (isSecretKey && nextValue.trim() && nextValue !== currentValue) {
          nextValue = encryptArcaKey(nextValue);
        }

        if (existing) {
          results.push(
            await tx.siteConfig.update({
              where: { id: existing.id },
              data: { value: nextValue },
            })
          );
        } else {
          results.push(
            await tx.siteConfig.create({
              data: clubId
                ? { clubId, key: config.key, value: nextValue }
                : { clubId: null, key: config.key, value: nextValue },
            })
          );
        }
      }
      return results;
    });

    const response: SiteConfigListResponse = {
      data: updated.map(serializeConfig),
    };

    return apiSuccess(response);
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }
    return apiDbError(error, 'Error al actualizar la configuración');
  }
}

function getConfigDescription(key: string): string {
  const descriptions: Record<string, string> = {
    commission_rate: 'Porcentaje de comisión aplicado a cada pago confirmado',
    bank_alias: 'Alias de la cuenta bancaria para transferencias',
    bank_cbu: 'CBU de la cuenta bancaria',
    bank_cuit: 'CUIT del titular de la cuenta bancaria',
    bank_name: 'Nombre del banco',
    bank_holder: 'Titular de la cuenta bancaria',
    bank_reference: 'Concepto o referencia sugerida para transferencias',
    mercadopago_access_token: 'Access Token de tu cuenta de Mercado Pago (producción)',
    mercadopago_client_secret: 'Client Secret de tu app de Mercado Pago (valida webhooks)',
    stripe_secret_key: 'Secret Key de tu cuenta de Stripe (producción)',
    stripe_webhook_secret: 'Signing secret del webhook de Stripe (whsec_...)',
    whatsapp_phone_number_id: 'Phone Number ID de WhatsApp Cloud API (Meta)',
    whatsapp_access_token: 'Access Token de WhatsApp Cloud API (Meta)',
    resend_api_key: 'API Key de Resend para envío de emails',
    resend_from_email: 'Email remitente (ej: Cuotas <cuotas@tudominio.com>)',
    arca_enabled: 'Emitir comprobantes electrónicos ARCA (Recibo C) ante cada pago confirmado',
    arca_cuit: 'CUIT de la institución ante ARCA (11 dígitos)',
    arca_punto_vta: 'Punto de venta ARCA habilitado para la emisión (número entero)',
    arca_cert: 'Certificado X.509 de la institución ante ARCA (PEM)',
    arca_key: 'Clave privada X.509 de la institución ante ARCA (PEM, cifrada en reposo)',
    stripe_enabled: 'Permitir pagos con Stripe a los socios',
    mercadopago_enabled: 'Permitir pagos con Mercado Pago a los socios',
    bank_transfer_enabled: 'Permitir pagos por transferencia bancaria a los socios',
    saas_billing_enabled: 'Habilita la facturacion SaaS plataforma-institucion (cron, UI, alertas)',
    saas_billing_day: 'Dia del mes (1-28) en que corre el billing SaaS (zona horaria Buenos Aires)',
    saas_arca_regime: 'Regimen ARCA plataforma: MONOTRIBUTO o RESPONSABLE_INSCRIPTO',
    saas_arca_iva_rate: 'Tasa de IVA (porcentaje) para comprobantes SaaS (default 21)',
    saas_arca_pto_vta: 'Punto de venta ARCA para comprobantes SaaS plataforma',
    saas_arca_cuit: 'CUIT emisor de la plataforma ante ARCA (11 dígitos)',
    saas_arca_cert: 'Certificado X.509 de la plataforma ante ARCA (PEM)',
    saas_arca_key: 'Clave privada X.509 de la plataforma ante ARCA (PEM, cifrada en reposo)',
    saas_reminder_days: 'Dias de recordatorio de vencimiento SaaS (CSV, ej: 1,7,15; vacio = desactivado)',
    saas_due_soon_days: 'Dias de anticipacion para mostrar la alerta de vencimiento proximo SaaS (default 5)',
  };
  return descriptions[key] ?? '';
}