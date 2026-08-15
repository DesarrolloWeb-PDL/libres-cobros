import { prisma } from '@/lib/db';

/**
 * Per-club SiteConfig access (composite unique `[clubId, key]`).
 *
 * Payment credentials (Stripe keys, MercadoPago tokens) and bank info live in
 * each club's own SiteConfig rows. Consumers resolve them through these
 * helpers instead of reading global env vars, which are dev-only fallbacks.
 */

export async function getClubSiteConfigValues(
  clubId: string,
  keys: string[]
): Promise<Record<string, string>> {
  const configs = await prisma.siteConfig.findMany({
    where: { clubId, key: { in: keys } },
  });
  return Object.fromEntries(configs.map((c) => [c.key, c.value]));
}

export async function getClubSiteConfigValue(
  clubId: string,
  key: string,
  defaultValue = ''
): Promise<string> {
  const config = await prisma.siteConfig.findUnique({
    where: { clubId_key: { clubId, key } },
  });
  return config?.value ?? defaultValue;
}
