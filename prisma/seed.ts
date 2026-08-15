import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { hashSync } from 'bcryptjs';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required to run the seed script');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

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
        role: 'ADMIN',
      },
    });
    console.log('Initial admin user created.');
  }

  const feeConfigs = [
    { category: 'ADULT', amount: 15000, description: 'Socio adulto' },
    { category: 'FAMILY', amount: 22000, description: 'Grupo familiar' },
    { category: 'MINOR', amount: 8000, description: 'Socio menor' },
  ];

  for (const config of feeConfigs) {
    await prisma.feeConfig.upsert({
      where: { category: config.category },
      update: {},
      create: config,
    });
  }
  console.log('Default fee configs ensured.');

  const siteConfigKeys = [
    'commission_rate',
    'bank_alias',
    'bank_cbu',
    'bank_cuit',
    'bank_name',
    'bank_account_holder',
    'whatsapp_phone_number_id',
    'whatsapp_access_token',
    'whatsapp_template_name',
  ];

  for (const key of siteConfigKeys) {
    await prisma.siteConfig.upsert({
      where: { key },
      update: {},
      create: { key, value: '' },
    });
  }
  console.log('Site config keys ensured.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
