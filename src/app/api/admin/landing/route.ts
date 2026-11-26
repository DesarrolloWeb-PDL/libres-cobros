import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { requireInstitution, AuthError } from '@/lib/access';
import { getInstitutionSiteConfigValues } from '@/lib/site-config';
import { LANDING_KEYS, readLandingContent } from '@/lib/landing';

export const dynamic = 'force-dynamic';

const DATA_URL = /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/;

const imageField = (maxChars: number) =>
  z
    .string()
    .max(maxChars, 'Imagen demasiado grande')
    .refine((value) => DATA_URL.test(value), 'Formato de imagen inválido (data-URL)')
    .nullable();

const CoverSchema = z.object({
  image: imageField(3_000_000),
  title: z.string().max(140),
  subtitle: z.string().max(240),
  ctaLabel: z.string().max(60),
  ctaHref: z.string().max(300),
});

const EventSchema = z.object({
  id: z.string().max(40).optional(),
  title: z.string().min(1, 'El título es obligatorio').max(140),
  image: imageField(1_400_000),
  date: z.string().max(40),
  link: z.string().max(300),
});

const AuthoritySchema = z.object({
  id: z.string().max(40).optional(),
  name: z.string().min(1, 'El nombre es obligatorio').max(90),
  role: z.string().max(90),
});

const ContactSchema = z.object({
  id: z.string().max(40).optional(),
  area: z.string().min(1, 'El área es obligatoria').max(70),
  phone: z.string().max(40),
  email: z.string().max(130),
  note: z.string().max(180),
});

const AppearanceSchema = z.object({
  dark: z.boolean(),
  sections: z.object({
    events: z.boolean(),
    authorities: z.boolean(),
    contacts: z.boolean(),
    history: z.boolean(),
  }),
  heroStyle: z.enum(['overlay', 'brand']),
});

const PatchLandingSchema = z.object({
  url: z.string().url('URL inválida').nullable().optional(),
  cover: CoverSchema.nullable().optional(),
  events: z.array(EventSchema).max(8, 'Máximo 8 eventos').optional(),
  authorities: z.array(AuthoritySchema).max(12, 'Máximo 12 autoridades').optional(),
  contacts: z.array(ContactSchema).max(10, 'Máximo 10 contactos').optional(),
  history: z.string().max(20000).optional(),
  appearance: AppearanceSchema.optional(),
});

type PatchInput = z.infer<typeof PatchLandingSchema>;

function withIds<T extends { id?: string }>(items: T[], prefix: string): T[] {
  return items.map((item, index) =>
    item.id ? item : { ...item, id: `${prefix}-${index}-${Date.now().toString(36)}` }
  );
}

/** Collects the provided sections as SiteConfig writes (partial update). */
function buildWrites(data: PatchInput): { key: string; value: string }[] {
  const writes: { key: string; value: string }[] = [];

  if (data.url !== undefined) {
    writes.push({ key: LANDING_KEYS.url, value: data.url ?? '' });
  }
  if (data.cover !== undefined) {
    writes.push({ key: LANDING_KEYS.cover, value: data.cover ? JSON.stringify(data.cover) : '' });
  }
  if (data.events !== undefined) {
    writes.push({
      key: LANDING_KEYS.events,
      value: JSON.stringify(withIds(data.events, 'ev')),
    });
  }
  if (data.authorities !== undefined) {
    writes.push({
      key: LANDING_KEYS.authorities,
      value: JSON.stringify(withIds(data.authorities, 'au')),
    });
  }
  if (data.contacts !== undefined) {
    writes.push({
      key: LANDING_KEYS.contacts,
      value: JSON.stringify(withIds(data.contacts, 'ct')),
    });
  }
  if (data.history !== undefined) {
    writes.push({ key: LANDING_KEYS.history, value: data.history });
  }
  if (data.appearance !== undefined) {
    writes.push({ key: LANDING_KEYS.appearance, value: JSON.stringify(data.appearance) });
  }

  return writes;
}

async function readContent(institutionId: string) {
  const values = await getInstitutionSiteConfigValues(institutionId, Object.values(LANDING_KEYS));
  return readLandingContent(values);
}

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireInstitution(request);

    if (!ctx.institutionId) {
      return apiError('Seleccione una institución', 400, 'Se requiere una institución', 'INSTITUTION_REQUIRED');
    }

    const content = await readContent(ctx.institutionId);
    return apiSuccess(content);
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }
    return apiDbError(error, 'Error al obtener la landing');
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const ctx = await requireInstitution(request);

    if (!ctx.institutionId) {
      return apiError('Seleccione una institución', 400, 'Se requiere una institución', 'INSTITUTION_REQUIRED');
    }

    const body = await request.json();
    const parsed = PatchLandingSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        'Datos inválidos',
        400,
        parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        'VALIDATION_ERROR'
      );
    }

    const writes = buildWrites(parsed.data);
    if (writes.length === 0) {
      return apiError('Nada para guardar', 400, 'No se enviaron secciones', 'VALIDATION_ERROR');
    }

    for (const write of writes) {
      const existing = await prisma.siteConfig.findUnique({
        where: { clubId_key: { clubId: ctx.institutionId!, key: write.key } },
      });
      if (existing) {
        await prisma.siteConfig.update({
          where: { id: existing.id },
          data: { value: write.value },
        });
      } else {
        await prisma.siteConfig.create({
          data: { clubId: ctx.institutionId!, key: write.key, value: write.value },
        });
      }
    }

    const content = await readContent(ctx.institutionId);
    return apiSuccess(content);
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }
    return apiDbError(error, 'Error al guardar la landing');
  }
}
