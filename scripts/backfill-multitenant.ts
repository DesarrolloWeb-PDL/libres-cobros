import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

/**
 * Multi-tenant backfill (step 2 of 3).
 *
 * Run AFTER migration A (`add_club_multitenant`) and BEFORE migration B
 * (`club_constraints`). This script:
 *
 *  1. Records pre-migration row counts per tenant table (parity baseline).
 *  2. Creates the default club "Club Libres" (slug `club-libres`), deriving
 *     `commissionValue` from the legacy global `commission_rate` SiteConfig key.
 *  3. Assigns the default club's id to every existing Member, FeeConfig, Fee,
 *     Payment, Commission, MonthlyClosing, WhatsAppLog and SiteConfig row.
 *  4. Merges legacy SiteConfig key variants into the canonical keys:
 *     `bank_account_holder` -> `bank_holder`, `whatsapp_token` -> `whatsapp_access_token`.
 *  5. Removes the superseded `commission_rate` SiteConfig key.
 *  6. Promotes every existing AdminUser to SUPER_ADMIN (clubId stays null = all clubs).
 *  7. Verifies parity: post-migration counts must match pre-migration counts
 *     (SiteConfig adjusted for removed keys) and no row may keep a null clubId.
 *     Exits with a non-zero code on any mismatch.
 *
 * Usage:
 *   DATABASE_URL=<postgres-url> npx tsx scripts/backfill-multitenant.ts
 *
 * The script is safe to re-run: an existing default club is reused and key
 * merges/promotions are idempotent.
 */

const DEFAULT_CLUB_NAME = 'Club Libres';
const DEFAULT_CLUB_SLUG = 'club-libres';

const LEGACY_KEY_MERGES: ReadonlyArray<{ legacy: string; canonical: string }> = [
  { legacy: 'bank_account_holder', canonical: 'bank_holder' },
  { legacy: 'whatsapp_token', canonical: 'whatsapp_access_token' },
];

const REMOVED_KEYS: ReadonlyArray<string> = ['commission_rate'];

// [prisma model delegate, sql table name]
const TENANT_TABLES = [
  ['member', 'Member'],
  ['feeConfig', 'FeeConfig'],
  ['fee', 'Fee'],
  ['payment', 'Payment'],
  ['commission', 'Commission'],
  ['monthlyClosing', 'MonthlyClosing'],
  ['whatsAppLog', 'WhatsAppLog'],
  ['siteConfig', 'SiteConfig'],
] as const;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required to run the backfill script');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

type PrismaDelegate = {
  count: (args?: unknown) => Promise<number>;
  updateMany: (args: { where?: unknown; data: unknown }) => Promise<{ count: number }>;
};

function delegate(model: string): PrismaDelegate {
  const d = (prisma as unknown as Record<string, unknown>)[model];
  if (!d) throw new Error(`Unknown Prisma model delegate: ${model}`);
  return d as PrismaDelegate;
}

async function countTable(table: string): Promise<number> {
  const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
    `SELECT COUNT(*) AS count FROM "${table}"`
  );
  return Number(rows[0]?.count ?? 0);
}

async function countNullClubId(table: string): Promise<number> {
  const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
    `SELECT COUNT(*) AS count FROM "${table}" WHERE "clubId" IS NULL`
  );
  return Number(rows[0]?.count ?? 0);
}

async function readCommissionRate(): Promise<number> {
  const config = await prisma.siteConfig.findFirst({
    where: { key: 'commission_rate' },
  });
  if (!config || config.value === '') return 0;
  const parsed = parseFloat(config.value);
  return Number.isNaN(parsed) || parsed < 0 ? 0 : parsed;
}

async function main() {
  // 1. Pre-flight: record row counts per tenant table.
  const preCounts = new Map<string, number>();
  for (const [model, table] of TENANT_TABLES) {
    preCounts.set(model, await countTable(table));
  }
  const preAdminUsers = await countTable('AdminUser');
  console.log('[pre-flight] row counts:', Object.fromEntries(preCounts), { adminUsers: preAdminUsers });

  // 2. Create (or reuse) the default club, deriving commissionValue from the
  //    legacy global commission_rate SiteConfig key.
  const commissionValue = await readCommissionRate();
  let club = await prisma.club.findUnique({ where: { slug: DEFAULT_CLUB_SLUG } });
  if (!club) {
    club = await prisma.club.create({
      data: {
        name: DEFAULT_CLUB_NAME,
        slug: DEFAULT_CLUB_SLUG,
        commissionType: 'PERCENTAGE',
        commissionValue,
        status: 'ACTIVE',
      },
    });
    console.log(
      `[club] created ${club.name} (${club.slug}) commissionType=PERCENTAGE commissionValue=${commissionValue}`
    );
  } else {
    console.log(
      `[club] reused existing ${club.name} (${club.slug}) commissionValue=${club.commissionValue}`
    );
  }

  // 3. Assign the default club id to every existing row (all rows are null after
  //    migration A, so updateMany without a where covers them all).
  for (const [model] of TENANT_TABLES) {
    const result = await delegate(model).updateMany({ data: { clubId: club.id } });
    console.log(`[assign] ${model}: updated ${result.count} row(s)`);
  }

  // 4. Merge legacy SiteConfig key variants into canonical keys, then delete the
  //    legacy row. Track created and deleted rows so parity can account for the
  //    net row-count change (merge = -1 legacy +1 canonical = net 0).
  let deletedSiteConfigKeys = 0;
  let createdSiteConfigKeys = 0;
  for (const { legacy, canonical } of LEGACY_KEY_MERGES) {
    const legacyRow = await prisma.siteConfig.findFirst({ where: { key: legacy } });
    if (!legacyRow) continue;
    const canonicalRow = await prisma.siteConfig.findFirst({ where: { key: canonical } });
    if (!canonicalRow && legacyRow.value) {
      await prisma.siteConfig.create({
        data: { clubId: club.id, key: canonical, value: legacyRow.value },
      });
      createdSiteConfigKeys += 1;
      console.log(`[keys] merged ${legacy} -> ${canonical} (value "${legacyRow.value}")`);
    } else if (!canonicalRow) {
      console.log(`[keys] skipped ${legacy} -> ${canonical}: legacy value is empty`);
    }
    await prisma.siteConfig.delete({ where: { id: legacyRow.id } });
    deletedSiteConfigKeys += 1;
    console.log(`[keys] removed legacy key ${legacy}`);
  }

  // 5. Remove the superseded commission_rate key (billing lives on Club now).
  for (const key of REMOVED_KEYS) {
    const removed = await prisma.siteConfig.deleteMany({ where: { key } });
    if (removed.count > 0) {
      deletedSiteConfigKeys += removed.count;
      console.log(`[keys] removed superseded key ${key}`);
    }
  }

  // 6. Promote every existing admin to SUPER_ADMIN. clubId stays null: null means
  //    "all clubs" for a SUPER_ADMIN (see design: All existing admins promoted).
  const promotion = await prisma.adminUser.updateMany({ data: { role: 'SUPER_ADMIN' } });
  console.log(`[admin] promoted ${promotion.count} user(s) to SUPER_ADMIN`);

  // 7. Post-flight: parity + no-null verification.
  let failed = false;
  const postCounts = new Map<string, number>();
  for (const [model, table] of TENANT_TABLES) {
    const post = await countTable(table);
    postCounts.set(model, post);

    const expected =
      model === 'siteConfig'
        ? preCounts.get(model)! - deletedSiteConfigKeys + createdSiteConfigKeys
        : preCounts.get(model)!;
    if (post !== expected) {
      failed = true;
      console.error(
        `[parity] MISMATCH ${table}: pre=${preCounts.get(model)} post=${post} expected=${expected}`
      );
    }

    const nulls = await countNullClubId(table);
    if (nulls !== 0) {
      failed = true;
      console.error(`[parity] NULL clubId rows in ${table}: ${nulls}`);
    }
  }
  const postAdminUsers = await countTable('AdminUser');
  if (postAdminUsers !== preAdminUsers) {
    failed = true;
    console.error(
      `[parity] MISMATCH AdminUser: pre=${preAdminUsers} post=${postAdminUsers}`
    );
  }

  console.log('[post-flight] row counts:', Object.fromEntries(postCounts), {
    adminUsers: postAdminUsers,
    deletedSiteConfigKeys,
    createdSiteConfigKeys,
  });

  if (failed) {
    console.error('[backfill] FAILED: parity or null-clubId checks did not pass.');
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log('[backfill] OK: parity verified, no null clubId rows remain.');
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('[backfill] error:', err);
  process.exit(1);
});
