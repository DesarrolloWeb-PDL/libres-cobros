import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { hashSync } from 'bcryptjs';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required to run the seed script');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const DEFAULT_CLUB = {
  name: 'Club Libres',
  slug: 'club-libres',
  commissionType: 'PERCENTAGE',
  commissionValue: 0,
  status: 'ACTIVE',
} as const;

// Canonical SiteConfig keys per club. `commission_rate` is gone (superseded by
// Club.commissionValue); `bank_holder` and `whatsapp_access_token` are canonical
// (legacy `bank_account_holder` / `whatsapp_token` variants are merged by the
// backfill script and must not be re-created here).
const SITE_CONFIG_KEYS = [
  'bank_alias',
  'bank_cbu',
  'bank_cuit',
  'bank_name',
  'bank_holder',
  'whatsapp_phone_number_id',
  'whatsapp_access_token',
  'whatsapp_template_name',
];

async function main() {
  const adminEmail = 'admin@libres.com';
  const existingAdmin = await prisma.adminUser.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    await prisma.adminUser.create({
      data: {
        email: adminEmail,
        name: 'Administrador',
        passwordHash: hashSync('admin123', 10),
        role: 'SUPER_ADMIN',
      },
    });
    console.log('Initial SUPER_ADMIN user created.');
  }

  const club = await prisma.club.upsert({
    where: { slug: DEFAULT_CLUB.slug },
    update: {},
    create: {
      ...DEFAULT_CLUB,
      commissionType: DEFAULT_CLUB.commissionType,
    },
  });
  console.log(`Default club ensured: ${club.name} (${club.slug}).`);

  const feeConfigs = [
    { category: 'ADULT', amount: 15000, description: 'Socio adulto' },
    { category: 'FAMILY', amount: 22000, description: 'Grupo familiar' },
    { category: 'MINOR', amount: 8000, description: 'Socio menor' },
  ];

  for (const config of feeConfigs) {
    await prisma.feeConfig.upsert({
      where: { clubId_category: { clubId: club.id, category: config.category } },
      update: {},
      create: { ...config, clubId: club.id },
    });
  }
  console.log(`Default fee configs ensured for club ${club.slug}.`);

  for (const key of SITE_CONFIG_KEYS) {
    await prisma.siteConfig.upsert({
      where: { clubId_key: { clubId: club.id, key } },
      update: {},
      create: { clubId: club.id, key, value: '' },
    });
  }
  console.log(`Site config keys ensured for club ${club.slug}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
