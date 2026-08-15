import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

/**
 * Multi-tenant revert (rollback for work unit 1).
 *
 * Best-effort reverse of migration B (`club_constraints`) and migration A
 * (`add_club_multitenant`) plus the backfill. Primary rollback is a database
 * snapshot; this script is the programmatic fallback. It:
 *
 *  1. Verifies no duplicates exist on the global-unique columns (aborts if any).
 *  2. Drops the per-club composite uniques and re-adds the global uniques.
 *  3. Drops NOT NULL on clubId and nulls the clubId values on the 8 tenant tables.
 *  4. Demotes every SUPER_ADMIN back to ADMIN.
 *  5. Restores the legacy SiteConfig keys (`commission_rate` from the default
 *     club's commissionValue; `bank_account_holder` / `whatsapp_token` aliases
 *     from their canonical counterparts).
 *  6. Drops the clubId foreign keys, then drops ProviderInvoice and Club.
 *
 * The AdminUser.role column stays an enum; only the values are demoted. Re-applying
 * migration A+B on a rolled-back database is not supported without re-running the
 * backfill first.
 *
 * Usage:
 *   DATABASE_URL=<postgres-url> npx tsx scripts/revert-multitenant.ts
 */

const DEFAULT_CLUB_SLUG = 'club-libres';

const TENANT_TABLES = [
  'Member',
  'FeeConfig',
  'Fee',
  'Payment',
  'Commission',
  'MonthlyClosing',
  'WhatsAppLog',
  'SiteConfig',
] as const;

const COMPOSITE_UNIQUES = [
  'Member_clubId_dni_key',
  'Member_clubId_email_key',
  'FeeConfig_clubId_category_key',
  'MonthlyClosing_clubId_month_year_key',
  'SiteConfig_clubId_key_key',
] as const;

const GLOBAL_UNIQUES: ReadonlyArray<{ name: string; sql: string }> = [
  { name: 'Member_dni_key', sql: 'CREATE UNIQUE INDEX "Member_dni_key" ON "Member"("dni")' },
  { name: 'Member_email_key', sql: 'CREATE UNIQUE INDEX "Member_email_key" ON "Member"("email")' },
  { name: 'FeeConfig_category_key', sql: 'CREATE UNIQUE INDEX "FeeConfig_category_key" ON "FeeConfig"("category")' },
  { name: 'MonthlyClosing_month_year_key', sql: 'CREATE UNIQUE INDEX "MonthlyClosing_month_year_key" ON "MonthlyClosing"("month", "year")' },
  { name: 'SiteConfig_key_key', sql: 'CREATE UNIQUE INDEX "SiteConfig_key_key" ON "SiteConfig"("key")' },
] as const;

const CLUB_ID_FKEYS: ReadonlyArray<{ table: string; name: string }> = [
  { table: 'Member', name: 'Member_clubId_fkey' },
  { table: 'FeeConfig', name: 'FeeConfig_clubId_fkey' },
  { table: 'Fee', name: 'Fee_clubId_fkey' },
  { table: 'Payment', name: 'Payment_clubId_fkey' },
  { table: 'Commission', name: 'Commission_clubId_fkey' },
  { table: 'MonthlyClosing', name: 'MonthlyClosing_clubId_fkey' },
  { table: 'WhatsAppLog', name: 'WhatsAppLog_clubId_fkey' },
  { table: 'SiteConfig', name: 'SiteConfig_clubId_fkey' },
  { table: 'AdminUser', name: 'AdminUser_clubId_fkey' },
] as const;

// [canonical key, legacy key] restored as aliases of the canonical value.
const LEGACY_ALIASES: ReadonlyArray<{ canonical: string; legacy: string }> = [
  { canonical: 'bank_holder', legacy: 'bank_account_holder' },
  { canonical: 'whatsapp_access_token', legacy: 'whatsapp_token' },
];

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required to run the revert script');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function assertNoDuplicates(): Promise<void> {
  const checks: ReadonlyArray<{ label: string; sql: string }> = [
    { label: 'Member.dni', sql: 'SELECT "dni" FROM "Member" WHERE "dni" IS NOT NULL GROUP BY "dni" HAVING COUNT(*) > 1' },
    { label: 'Member.email', sql: 'SELECT "email" FROM "Member" WHERE "email" IS NOT NULL GROUP BY "email" HAVING COUNT(*) > 1' },
    { label: 'FeeConfig.category', sql: 'SELECT "category" FROM "FeeConfig" GROUP BY "category" HAVING COUNT(*) > 1' },
    { label: 'MonthlyClosing.month+year', sql: 'SELECT "month", "year" FROM "MonthlyClosing" GROUP BY "month", "year" HAVING COUNT(*) > 1' },
    { label: 'SiteConfig.key', sql: 'SELECT "key" FROM "SiteConfig" GROUP BY "key" HAVING COUNT(*) > 1' },
  ];

  const duplicates: string[] = [];
  for (const check of checks) {
    const rows = await prisma.$queryRawUnsafe<unknown[]>(check.sql);
    if (rows.length > 0) {
      duplicates.push(`${check.label}: ${rows.length} duplicated value(s)`);
    }
  }

  if (duplicates.length > 0) {
    throw new Error(
      `[revert] ABORT: duplicates found on global-unique columns; restoring global ` +
        `uniques would fail.\n${duplicates.join('\n')}\n` +
        `Resolve duplicates or restore from a pre-migration snapshot instead.`
    );
  }
  console.log('[dedupe] OK: no duplicates on global-unique columns');
}

async function dropCompositeUniques(): Promise<void> {
  for (const name of COMPOSITE_UNIQUES) {
    await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "${name}"`);
  }
  console.log('[uniques] dropped composite uniques');
}

async function addGlobalUniques(): Promise<void> {
  for (const unique of GLOBAL_UNIQUES) {
    await prisma.$executeRawUnsafe(`${unique.sql}`);
  }
  console.log('[uniques] restored global uniques');
}

async function dropClubIdNotNull(): Promise<void> {
  for (const table of TENANT_TABLES) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "${table}" ALTER COLUMN "clubId" DROP NOT NULL`
    );
  }
  console.log('[nullable] clubId made nullable on tenant tables');
}

async function nullOutClubIds(): Promise<void> {
  for (const table of TENANT_TABLES) {
    await prisma.$executeRawUnsafe(`UPDATE "${table}" SET "clubId" = NULL`);
  }
  console.log('[null] clubId values cleared on tenant tables');
}

async function demoteAdmins(): Promise<void> {
  const result = await prisma.adminUser.updateMany({ data: { role: 'ADMIN' } });
  console.log(`[admin] demoted ${result.count} user(s) to ADMIN`);
}

async function restoreSiteConfigKeys(): Promise<void> {
  const club = await prisma.club.findFirst({ where: { slug: DEFAULT_CLUB_SLUG } });

  // commission_rate restored from the default club's commissionValue.
  if (club) {
    const existing = await prisma.siteConfig.findFirst({ where: { key: 'commission_rate' } });
    if (!existing) {
      const value = String(club.commissionValue);
      await prisma.$executeRawUnsafe(
        `INSERT INTO "SiteConfig" ("id", "key", "value", "updatedAt") VALUES ($1, $2, $3, NOW())`,
        randomUUID(),
        'commission_rate',
        value
      );
      console.log(`[keys] restored commission_rate = "${value}"`);
    } else {
      console.log('[keys] commission_rate already present, skipped');
    }
  } else {
    console.log('[keys] default club not found, commission_rate not restored');
  }

  // Legacy aliases restored from their canonical counterparts.
  for (const { canonical, legacy } of LEGACY_ALIASES) {
    const canonicalRow = await prisma.siteConfig.findFirst({ where: { key: canonical } });
    const legacyRow = await prisma.siteConfig.findFirst({ where: { key: legacy } });
    if (canonicalRow && !legacyRow) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "SiteConfig" ("id", "key", "value", "updatedAt") VALUES ($1, $2, $3, NOW())`,
        randomUUID(),
        legacy,
        canonicalRow.value
      );
      console.log(`[keys] restored legacy alias ${legacy} from ${canonical}`);
    }
  }
}

async function dropClubReferences(): Promise<void> {
  for (const fk of CLUB_ID_FKEYS) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "${fk.table}" DROP CONSTRAINT IF EXISTS "${fk.name}"`
    );
  }
  console.log('[fk] dropped clubId foreign keys');
}

async function dropTables(): Promise<void> {
  await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "ProviderInvoice"`);
  await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "Club"`);
  console.log('[tables] dropped ProviderInvoice and Club');
}

async function main() {
  console.log('[revert] starting multi-tenant rollback');

  await assertNoDuplicates();
  await dropCompositeUniques();
  await addGlobalUniques();
  await dropClubIdNotNull();
  await demoteAdmins();
  await restoreSiteConfigKeys();
  await nullOutClubIds();
  await dropClubReferences();
  await dropTables();

  console.log('[revert] OK: global uniques restored, clubId nullable, admins demoted, Club/ProviderInvoice removed.');
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('[revert] error:', err);
  process.exit(1);
});
