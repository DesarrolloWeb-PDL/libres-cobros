import { config } from 'dotenv';
config();
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

/**
 * Backfill: adds the portal-OTP config rows for clubs created before the
 * member-portal OTP feature existed, so the admin switches/fields render.
 *
 * - portal_otp_enabled = 'true' (feature ON by default, matches "absent = on")
 * - whatsapp_otp_template_name = '' (empty until the Meta template is created)
 *
 * Idempotent: only inserts rows that do not exist yet.
 */

const KEYS: Array<{ key: string; value: string }> = [
  { key: 'portal_otp_enabled', value: 'true' },
  { key: 'whatsapp_otp_template_name', value: '' },
  { key: 'portal_otp_test_code', value: '' },
];

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const p = new PrismaClient({ adapter });

(async () => {
  const clubs = await p.club.findMany({ select: { id: true, name: true } });
  let inserted = 0;

  for (const club of clubs) {
    for (const { key, value } of KEYS) {
      const existing = await p.siteConfig.findUnique({
        where: { clubId_key: { clubId: club.id, key } },
      });
      if (!existing) {
        await p.siteConfig.create({ data: { clubId: club.id, key, value } });
        inserted += 1;
        console.log(`+ ${club.name}: ${key}`);
      }
    }
  }

  console.log(`Done. Clubs: ${clubs.length}, rows inserted: ${inserted}`);
  await p.$disconnect();
})().catch((e) => {
  console.error('ERR', e.message);
  process.exit(1);
});
