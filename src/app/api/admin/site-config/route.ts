import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { authOptions } from '@/lib/auth';
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

const CONFIG_KEYS = [
  'commission_rate',
  'bank_alias',
  'bank_cbu',
  'bank_cuit',
  'bank_name',
  'bank_holder',
  'bank_reference',
  'whatsapp_token',
  'whatsapp_phone_number_id',
  'whatsapp_template_name',
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

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.role || session.user.role !== 'ADMIN') {
      return apiError('No autorizado', 401);
    }

    const configs = await prisma.siteConfig.findMany({
      where: { key: { in: CONFIG_KEYS } },
      orderBy: { key: 'asc' },
    });

    const configMap = new Map(configs.map((c) => [c.key, c]));

    const ensuredConfigs = await prisma.$transaction(
      CONFIG_KEYS.filter((key) => !configMap.has(key)).map((key) =>
        prisma.siteConfig.create({
          data: {
            key,
            value: '',
          },
        })
      )
    );

    const allConfigs = [...configs, ...ensuredConfigs].sort((a, b) =>
      a.key.localeCompare(b.key)
    );

    const response: SiteConfigListResponse = {
      data: allConfigs.map(serializeConfig),
    };

    return apiSuccess(response);
  } catch (error) {
    return apiDbError(error, 'Error al listar la configuración');
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.role || session.user.role !== 'ADMIN') {
      return apiError('No autorizado', 401);
    }

    const body = await request.json();
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

    const updated = await prisma.$transaction(
      configs.map((config) =>
        prisma.siteConfig.upsert({
          where: { key: config.key },
          update: { value: config.value },
          create: {
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
    whatsapp_token: 'Token de acceso de la API de WhatsApp Business',
    whatsapp_phone_number_id: 'ID del número de teléfono de WhatsApp Business',
    whatsapp_template_name: 'Nombre de la plantilla aprobada para recordatorios',
  };
  return descriptions[key] ?? '';
}
