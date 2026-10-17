/**
 * Seed script: Club Libres — test club with realistic member data.
 *
 * Covers: active/overdue/paid fees, members with/without contact info,
 * members with/without plan, CUIT for ARCA, payment history.
 *
 * Usage: npx tsx scripts/seed-club-libres.ts
 * Safe to re-run: uses upserts and skipDuplicates where possible.
 */

import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const CLUB_SLUG = 'club-libres';
const CLUB_NAME = 'Club Libres';

const DEFAULT_PLANS = [
  { name: 'ADULT', amount: 15000, description: 'Cuota adulto' },
  { name: 'FAMILY', amount: 22000, description: 'Cuota familiar' },
  { name: 'MINOR', amount: 8000, description: 'Cuota menor' },
];

const SITE_CONFIG_KEYS = [
  'bank_alias',
  'bank_cbu',
  'bank_cuit',
  'bank_name',
  'bank_holder',
  'bank_reference',
  'whatsapp_phone_number_id',
  'whatsapp_access_token',
  'mercadopago_access_token',
  'mercadopago_client_secret',
  'stripe_secret_key',
  'stripe_webhook_secret',
  'resend_api_key',
  'resend_from_email',
  'arca_enabled',
  'arca_cuit',
  'arca_punto_vta',
];

// Test members — varied contact data and plans
const MEMBERS = [
  {
    dni: '28123456',
    firstName: 'María',
    lastName: 'González',
    email: 'maria.gonzalez@test.com',
    phone: '+54 9 11 2345-6789',
    cuit: '27281234563',
    ivaCondicion: 'MONO',
    plan: 'ADULT',
    notes: 'Socio completa: email + phone + CUIT. Recibe todos los canales.',
  },
  {
    dni: '30987654',
    firstName: 'Juan',
    lastName: 'Pérez',
    email: 'juan.perez@test.com',
    phone: '+54 9 11 8765-4321',
    cuit: null,
    ivaCondicion: 'CF',
    plan: 'ADULT',
    notes: 'Solo WhatsApp (sin CUIT para ARCA).',
  },
  {
    dni: '32555111',
    firstName: 'Lucía',
    lastName: 'Fernández',
    email: 'lucia.fernandez@test.com',
    phone: null,
    cuit: null,
    ivaCondicion: 'CF',
    plan: 'FAMILY',
    notes: 'Solo email (sin teléfono).',
  },
  {
    dni: '34777222',
    firstName: 'Carlos',
    lastName: 'Rodríguez',
    email: null,
    phone: '+54 9 11 5555-1111',
    cuit: null,
    ivaCondicion: 'CF',
    plan: 'ADULT',
    notes: 'Solo teléfono (sin email). Ideal para probar skip de email.',
  },
  {
    dni: '36999333',
    firstName: 'Ana',
    lastName: 'Martínez',
    email: null,
    phone: null,
    cuit: null,
    ivaCondicion: 'CF',
    plan: 'ADULT',
    notes: 'Sin datos de contacto. Debe skipearse en mensajes.',
  },
  {
    dni: '38111444',
    firstName: 'Pedro',
    lastName: 'López',
    email: 'pedro.lopez@test.com',
    phone: '+54 9 11 2222-3333',
    cuit: '20381114447',
    ivaCondicion: 'RI',
    plan: 'FAMILY',
    notes: 'Responsable inscripto. CUIT presente para Recibo A/B futuro.',
  },
  {
    dni: '40222555',
    firstName: 'Sofía',
    lastName: 'García',
    email: 'sofia.garcia@test.com',
    phone: '+54 9 11 4444-5555',
    cuit: null,
    ivaCondicion: 'CF',
    plan: 'MINOR',
    notes: 'Plan menor. Cuota más baja.',
  },
  {
    dni: '42333666',
    firstName: 'Diego',
    lastName: 'Sánchez',
    email: 'diego.sanchez@test.com',
    phone: '+54 9 11 6666-7777',
    cuit: null,
    ivaCondicion: 'CF',
    plan: null, // no plan — won't get fees
    status: 'ACTIVE',
    notes: 'Sin plan asignado. No debe generar cuotas.',
  },
  {
    dni: '44444777',
    firstName: 'Valentina',
    lastName: 'Romero',
    email: 'valentina.romero@test.com',
    phone: '+54 9 11 7777-8888',
    cuit: null,
    ivaCondicion: 'CF',
    plan: 'ADULT',
    status: 'INACTIVE',
    notes: 'Socio inactivo. No debe recibir mensajes ni generar cuotas nuevas.',
  },
  {
    dni: '46555888',
    firstName: 'Martín',
    lastName: 'Álvarez',
    email: 'martin.alvarez@test.com',
    phone: '+54 9 11 8888-9999',
    cuit: '20465558881',
    ivaCondicion: 'MONO',
    plan: 'ADULT',
    notes: 'Monotributista con CUIT. Para probar Recibo C.',
  },
];

async function main() {
  console.log(`\n🌱 Seeding ${CLUB_NAME} (slug: ${CLUB_SLUG})...\n`);

  // 1. Club
  const club = await prisma.club.upsert({
    where: { slug: CLUB_SLUG },
    update: { status: 'ACTIVE', commissionValue: 5 },
    create: {
      name: CLUB_NAME,
      siglas: 'LIBRES',
      slug: CLUB_SLUG,
      phone: '+54 9 11 4321-0000',
      status: 'ACTIVE',
      commissionType: 'PERCENTAGE',
      commissionValue: 5,
      primaryColor: '#ea580c',
      secondaryColor: '#fb923c',
      accentColor: '#c2410c',
      bgColor: '#fff7ed',
    },
  });
  console.log(`✅ Club: ${club.name} (${club.id})`);

  // 2. Admin user for the club
  const bcrypt = await import('bcryptjs');
  const hashedPassword = await bcrypt.hash('club123', 10);
  await prisma.adminUser.upsert({
    where: { email: 'admin@clublibres.test' },
    update: { clubId: club.id, role: 'ADMIN' },
    create: {
      email: 'admin@clublibres.test',
      passwordHash: hashedPassword,
      name: 'Admin Club Libres',
      role: 'ADMIN',
      clubId: club.id,
      mustChangePassword: false,
    },
  });
  console.log(`✅ Admin: admin@clublibres.test / club123`);

  // 3. Plans
  const planMap = new Map<string, string>();
  for (const plan of DEFAULT_PLANS) {
    const existing = await prisma.plan.findFirst({
      where: { clubId: club.id, name: plan.name },
    });
    const record =
      existing ??
      (await prisma.plan.create({
        data: { clubId: club.id, ...plan },
      }));
    planMap.set(plan.name, record.id);
  }
  console.log(`✅ Plans: ${DEFAULT_PLANS.map((p) => p.name).join(', ')}`);

  // 4. SiteConfig keys (empty values — admin fills via UI)
  for (const key of SITE_CONFIG_KEYS) {
    await prisma.siteConfig.upsert({
      where: { clubId_key: { clubId: club.id, key } },
      update: {},
      create: { clubId: club.id, key, value: '' },
    });
  }
  console.log(`✅ SiteConfig keys: ${SITE_CONFIG_KEYS.length} rows`);

  // 5. Members
  const memberMap = new Map<string, string>(); // dni -> id
  for (const m of MEMBERS) {
    const planId = m.plan ? planMap.get(m.plan) ?? null : null;
    const existing = await prisma.member.findUnique({
      where: { clubId_dni: { clubId: club.id, dni: m.dni } },
    });

    const record =
      existing ??
      (await prisma.member.create({
        data: {
          clubId: club.id,
          dni: m.dni,
          firstName: m.firstName,
          lastName: m.lastName,
          email: m.email,
          phone: m.phone,
          cuit: m.cuit,
          ivaCondicion: m.ivaCondicion,
          planId,
          status: m.status ?? 'ACTIVE',
          notes: m.notes,
          joinDate: new Date('2026-01-15'),
        },
      }));
    memberMap.set(m.dni, record.id);
  }
  console.log(`✅ Members: ${MEMBERS.length}`);

  // 6. Fees — generate for current month + 2 past months
  //    This creates the overdue/paid/pending scenarios.
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const periods = [
    { month: currentMonth === 1 ? 12 : currentMonth - 1, year: currentMonth === 1 ? currentYear - 1 : currentYear }, // last month
    { month: currentMonth === 1 ? 11 : currentMonth - 2, year: currentMonth === 1 ? currentYear - 1 : currentYear }, // 2 months ago
    { month: currentMonth, year: currentYear }, // current month
  ];

  // Only generate for ACTIVE members WITH a plan
  const eligibleMembers = MEMBERS.filter((m) => (m.status ?? 'ACTIVE') === 'ACTIVE' && m.plan);

  for (const period of periods) {
    let created = 0;
    for (const m of eligibleMembers) {
      const memberId = memberMap.get(m.dni)!;
      const planId = planMap.get(m.plan!)!;
      const plan = DEFAULT_PLANS.find((p) => p.name === m.plan)!;

      const existingFee = await prisma.fee.findUnique({
        where: {
          memberId_month_year: { memberId, month: period.month, year: period.year },
        },
      });

      if (!existingFee) {
        const dueDate = new Date(Date.UTC(period.year, period.month - 1, 10));
        await prisma.fee.create({
          data: {
            clubId: club.id,
            memberId,
            planId,
            month: period.month,
            year: period.year,
            amount: plan.amount,
            dueDate,
            status: 'PENDING',
          },
        });
        created++;
      }
    }
    console.log(`✅ Fees ${period.month}/${period.year}: ${created} created`);
  }

  // 7. Mark old fees as OVERDUE (past due date)
  const overdueResult = await prisma.fee.updateMany({
    where: {
      clubId: club.id,
      status: 'PENDING',
      dueDate: { lt: now },
    },
    data: { status: 'OVERDUE' },
  });
  console.log(`✅ Overdue fees: ${overdueResult.count} marked OVERDUE`);

  // 8. Mark some fees as PAID + create confirmed payments
  //    María (first member) — pay her most recent fee via bank_transfer
  const mariaId = memberMap.get('28123456')!;
  const mariaCurrentFee = await prisma.fee.findUnique({
    where: {
      memberId_month_year: { memberId: mariaId, month: currentMonth, year: currentYear },
    },
  });

  if (mariaCurrentFee && mariaCurrentFee.status !== 'PAID') {
    const payment = await prisma.payment.create({
      data: {
        clubId: club.id,
        feeId: mariaCurrentFee.id,
        memberId: mariaId,
        amount: mariaCurrentFee.amount,
        method: 'bank_transfer',
        status: 'PENDING',
        bankTransferRef: `TR-TEST-${Date.now()}`,
      },
    });
    // Confirm it
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'PAID', confirmedAt: new Date() },
    });
    await prisma.fee.update({
      where: { id: mariaCurrentFee.id },
      data: { status: 'PAID' },
    });
    console.log(`✅ María González: fee ${currentMonth}/${currentYear} PAID (bank_transfer)`);
  }

  // 9. Create a pending bank_transfer payment for Juan (to test admin confirm)
  const juanId = memberMap.get('30987654')!;
  const juanCurrentFee = await prisma.fee.findUnique({
    where: {
      memberId_month_year: { memberId: juanId, month: currentMonth, year: currentYear },
    },
  });

  if (juanCurrentFee && juanCurrentFee.status === 'OVERDUE') {
    const existingPayment = await prisma.payment.findFirst({
      where: { feeId: juanCurrentFee.id, status: 'PENDING' },
    });
    if (!existingPayment) {
      await prisma.payment.create({
        data: {
          clubId: club.id,
          feeId: juanCurrentFee.id,
          memberId: juanId,
          amount: juanCurrentFee.amount,
          method: 'bank_transfer',
          status: 'PENDING',
          bankTransferRef: `TR-PEND-${Date.now()}`,
        },
      });
      console.log(`✅ Juan Pérez: PENDING bank_transfer payment created (for admin confirm test)`);
    }
  }

  // 10. Create SmsLog entries for message history
  const sampleMessages = [
    { dni: '28123456', type: 'mass_message', message: 'Hola María, recordatorio de pago del mes.', status: 'SENT' as const },
    { dni: '30987654', type: 'mass_message', message: 'Hola Juan, recordatorio de pago del mes.', status: 'SENT' as const },
    { dni: '32555111', type: 'mass_message', message: 'Hola Lucía, recordatorio de pago del mes.', status: 'FAILED' as const, error: 'Socio sin teléfono' },
    { dni: '36999333', type: 'mass_message', message: 'Hola Ana, recordatorio de pago del mes.', status: 'SKIPPED' as const, error: 'Socio sin email' },
    { dni: '28123456', type: 'payment_reminder_whatsapp', message: 'Recordatorio: cuota vencida.', status: 'SENT' as const },
    { dni: '46555888', type: 'payment_reminder_email', message: 'Recordatorio: cuota vencida.', status: 'SENT' as const },
  ];

  for (const msg of sampleMessages) {
    const memberId = memberMap.get(msg.dni);
    if (!memberId) continue;
    const exists = await prisma.smsLog.findFirst({
      where: { clubId: club.id, memberId, message: msg.message },
    });
    if (!exists) {
      await prisma.smsLog.create({
        data: {
          clubId: club.id,
          memberId,
          type: msg.type,
          message: msg.message,
          status: msg.status,
          error: 'error' in msg ? msg.error : null,
        },
      });
    }
  }
  console.log(`✅ SmsLog: ${sampleMessages.length} entries`);

  // Summary
  const memberCount = await prisma.member.count({ where: { clubId: club.id } });
  const feeCount = await prisma.fee.count({ where: { clubId: club.id } });
  const paidCount = await prisma.fee.count({ where: { clubId: club.id, status: 'PAID' } });
  const overdueCount = await prisma.fee.count({ where: { clubId: club.id, status: 'OVERDUE' } });
  const pendingCount = await prisma.fee.count({ where: { clubId: club.id, status: 'PENDING' } });

  console.log(`\n📊 Summary:`);
  console.log(`   Club: ${club.name} (${club.slug}) — commission ${club.commissionValue}%`);
  console.log(`   Members: ${memberCount}`);
  console.log(`   Fees: ${feeCount} total (${paidCount} PAID, ${overdueCount} OVERDUE, ${pendingCount} PENDING)`);
  console.log(`\n🔑 Admin login: admin@clublibres.test / club123`);
  console.log(`🌐 Member portal: /pagos/${club.slug}?dni=28123456`);
  console.log(`\n⚠️  SiteConfig credentials are EMPTY — fill them via admin UI.`);
  console.log(`   Bank data, MP/Stripe, WhatsApp, ARCA must be configured for full testing.\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
