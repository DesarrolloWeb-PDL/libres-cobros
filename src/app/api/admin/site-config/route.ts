import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { requireInstitution, AuthError } from '@/lib/access';
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
  'twilio_account_sid',
  'twilio_auth_token',
  'twilio_phone_number',
  'resend_api_key',
  'resend_from_email',
  'arca_enabled',
  'arca_cuit',
  'arca_punto_vta',
];

function serializeConfig(config: {
  id: string;
  key: string;
  value: string;
  updatedAt: Date;
}): SiteConfigListItem {
  return {
    id: config.id,
    key: config.key,
    value: config.value,
    description: getConfigDescription(config.key),
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

    // Platform-level config (SUPER_ADMIN without institution selection).
    // @@unique([clubId, key]) treats NULLs as distinct in PostgreSQL, so upsert
    // via the compound key is unreliable — use findFirst + update/create.
    if (!ctx.institutionId) {
      const updated = await prisma.$transaction(async (tx) => {
        const results = [];
        for (const config of configs) {
          const existing = await tx.siteConfig.findFirst({
            where: { clubId: null, key: config.key },
          });
          if (existing) {
            results.push(
              await tx.siteConfig.update({
                where: { id: existing.id },
                data: { value: config.value },
              })
            );
          } else {
            results.push(
              await tx.siteConfig.create({
                data: { clubId: null, key: config.key, value: config.value },
              })
            );
          }
        }
        return results;
      });

      return apiSuccess({ data: updated.map(serializeConfig) });
    }

    const updated = await prisma.$transaction(
      configs.map((config) =>
        prisma.siteConfig.upsert({
          where: { clubId_key: { clubId: ctx.institutionId!, key: config.key } },
          update: { value: config.value },
          create: {
            clubId: ctx.institutionId!,
            key: config.key,
            value: config.value,
          },
        })
      )
    );

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
    twilio_account_sid: 'Account SID de Twilio',
    twilio_auth_token: 'Auth Token de Twilio',
    twilio_phone_number: 'Número de teléfono de Twilio (formato +1...)',
    resend_api_key: 'API Key de Resend para envío de emails',
    resend_from_email: 'Email remitente (ej: Cuotas <cuotas@tudominio.com>)',
    arca_enabled: 'Emitir comprobantes electrónicos ARCA (Recibo C) ante cada pago confirmado',
    arca_cuit: 'CUIT de la institución ante ARCA (11 dígitos)',
    arca_punto_vta: 'Punto de venta ARCA habilitado para la emisión (número entero)',
  };
  return descriptions[key] ?? '';
}