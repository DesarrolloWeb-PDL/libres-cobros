/**
 * E2E harness setup for the fee-automation feature (spec S1-S6).
 * Creates a QA institution whose generation day is TODAY (Argentina time),
 * due day20 (with generation day >=20 the due date rolls to the next month),
 * an explicit past start date, notifications off, plus one plan + member so
 * generation actually creates a fee.
 *
 * Run with the dev server up: NEXT_PUBLIC_URL=... CRON_SECRET=local-cron-test npx next dev -p3127
 * Clean up afterwards with fee-e2e-teardown.ts.
 */
import { config } from 'dotenv';
config();
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const p = new PrismaClient({ adapter });

const SLUG = 'qa-fee-automation';

(async () => {
  const existing = await p.club.findUnique({ where: { slug: SLUG } });
  if (existing) {
    console.log('SETUP already exists', existing.id);
    await p.$disconnect();
    return;
  }

  const club = await p.club.create({
    data: { name: 'QA Fee Automation', slug: SLUG, status: 'ACTIVE' },
    select: { id: true },
  });

  const artDay = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: 'numeric',
  }).format(new Date());

  const rows = [
    { key: 'fee_generation_day', value: artDay },
    { key: 'fee_due_day', value: '20' },
    { key: 'fee_notify_enabled', value: 'false' },
    { key: 'fee_generation_start', value: '2026-11-01' },
  ];
  for (const row of rows) {
    await p.siteConfig.create({ data: { clubId: club.id, ...row } });
  }

  await p.plan.create({
    data: { id: 'qa-fee-plan', clubId: club.id, name: 'QA Plan', amount: 1500, isActive: true },
  });
  await p.member.create({
    data: {
      id: 'qa-fee-member',
      clubId: club.id,
      dni: '99999991',
      firstName: 'QA',
      lastName: 'Member',
      planId: 'qa-fee-plan',
      status: 'ACTIVE',
    },
  });

  console.log('SETUP', JSON.stringify({ id: club.id, generationDay: artDay, dueDay: 20 }));
  await p.$disconnect();
})().catch((e) => {
  console.error('ERR', e.message);
  process.exit(1);
});
