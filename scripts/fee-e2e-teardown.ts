/**
 * E2E harness teardown for fee-e2e-setup.ts.
 * Verifies the generated fee landed on the rolled-over due date (spec S2)
 * before deleting every QA row.
 */
import { config } from 'dotenv';
config();
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const p = new PrismaClient({ adapter });

const SLUG = 'qa-fee-automation';
const EXPECTED_DUE_PREFIX = '2026-12-'; // due day20 <= generation day → next month

(async () => {
  const club = await p.club.findUnique({ where: { slug: SLUG } });
  if (!club) {
    console.log('TEARDOWN nothing to delete');
    await p.$disconnect();
    return;
  }

  const fees = await p.fee.findMany({
    where: { clubId: club.id },
    select: { dueDate: true, month: true, year: true },
  });
  const dueOk =
    fees.length > 0 && fees.every((f) => f.dueDate.toISOString().startsWith(EXPECTED_DUE_PREFIX));
  console.log(
    'VERIFY_FEES',
    JSON.stringify({ count: fees.length, dueDates: fees.map((f) => f.dueDate.toISOString()), dueRolloverOk: dueOk })
  );

  const notifyLogs = await p.smsLog.count({ where: { clubId: club.id, type: 'fee_generated' } });
  console.log('NOTIFY_LOGS', notifyLogs, '(0 esperado: notify off / sin canal)');

  await p.smsLog.deleteMany({ where: { clubId: club.id } });
  await p.fee.deleteMany({ where: { clubId: club.id } });
  await p.siteConfig.deleteMany({ where: { clubId: club.id } });
  await p.member.deleteMany({ where: { clubId: club.id } });
  await p.plan.deleteMany({ where: { clubId: club.id } });
  await p.club.delete({ where: { id: club.id } });
  console.log('TEARDOWN deleted club + member + plan + fees + configs + logs');
  await p.$disconnect();
  process.exit(dueOk ? 0 : 1);
})().catch((e) => {
  console.error('ERR', e.message);
  process.exit(1);
});
