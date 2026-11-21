import { config } from 'dotenv';
config();
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

/**
 * Cleanup of cross-scope junk rows created by the old GET auto-ensure:
 * - saas_* rows attached to clubs (platform keys must live at clubId=null)
 * - institution keys stored at clubId=null (must live per club)
 * Both sets are dead data: no code reads them (verified by grep). Idempotent.
 */

const INSTITUTION_KEYS_AT_NULL = [
  'commission_rate',
  'bank_alias', 'bank_cbu', 'bank_cuit', 'bank_name', 'bank_holder', 'bank_reference',
  'mercadopago_access_token', 'mercadopago_client_secret',
  'stripe_secret_key', 'stripe_webhook_secret',
  'whatsapp_phone_number_id', 'whatsapp_access_token',
  'whatsapp_template_name', 'whatsapp_template_language',
  'whatsapp_otp_template_name',
  'portal_otp_enabled', 'portal_otp_test_code',
  'resend_api_key', 'resend_from_email',
  'arca_enabled', 'arca_cuit', 'arca_punto_vta', 'arca_cert', 'arca_key',
  'stripe_enabled', 'mercadopago_enabled', 'bank_transfer_enabled',
];

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const p = new PrismaClient({ adapter });

(async () => {
  const clubSaas = await p.siteConfig.deleteMany({
    where: { clubId: { not: null }, key: { startsWith: 'saas_' } },
  });
  const nullInst = await p.siteConfig.deleteMany({
    where: { clubId: null, key: { in: INSTITUTION_KEYS_AT_NULL } },
  });
  console.log(`Deleted club-scope saas_* rows: ${clubSaas.count}`);
  console.log(`Deleted null-scope institution rows: ${nullInst.count}`);

  // Sanity: what remains at null scope should be platform keys only.
  const remainingNull = await p.siteConfig.findMany({
    where: { clubId: null },
    select: { key: true },
  });
  const bad = remainingNull.filter((r) => !r.key.startsWith('saas_'));
  console.log(`Remaining clubId=null rows: ${remainingNull.length} (non-saas: ${bad.length}${bad.length ? ' -> ' + bad.map((b) => b.key).join(', ') : ''})`);

  await p.$disconnect();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
