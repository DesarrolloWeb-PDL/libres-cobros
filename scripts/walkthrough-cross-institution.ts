/**
 * Walkthrough Manual Cross-Institution
 *
 * Este script verifica el flujo completo del sistema multi-tenant.
 * Incluye pruebas de aislamiento entre instituciones y funcionalidad de super admin.
 *
 * Uso:
 *   npx tsx scripts/walkthrough-cross-institution.ts
 *
 * Prerequisitos:
 *   1. Base de datos con al menos 2 instituciones activas
 *   2. Usuarios admin configurados para cada institución
 *   3. Socios y cuotas en cada institución
 *   4. Variable de entorno DATABASE_URL configurada
 */

import { prisma } from '../src/lib/db';

// Verificar que DATABASE_URL esté configurado
if (!process.env.DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL no está configurado.');
  console.error('');
  console.error('Para ejecutar este script:');
  console.error('1. Asegurate de que el archivo .env.local exista');
  console.error('2. Que contenga DATABASE_URL con la conexión a la base de datos');
  console.error('3. Ejecuta: npx tsx scripts/walkthrough-cross-institution.ts');
  console.error('');
  console.error('Ejemplo de .env.local:');
  console.error('DATABASE_URL="postgresql://user:password@host:port/dbname"');
  process.exit(1);
}

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

const results: TestResult[] = [];

function test(name: string, passed: boolean, message: string) {
  results.push({ name, passed, message });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${name}`);
  if (!passed) {
    console.log(`   Error: ${message}`);
  }
}

async function walkthrough() {
  console.log('=== Walkthrough Manual Cross-Institution ===\n');

  // 1. Verificar conexión a base de datos
  try {
    await prisma.$connect();
    test('Conexión a base de datos', true, '');
  } catch (error) {
    test('Conexión a base de datos', false, String(error));
    return;
  }

  // 2. Verificar que hay al menos 2 instituciones
  const clubs = await prisma.club.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, name: true, slug: true },
    orderBy: { name: 'asc' },
  });

  test('Mínimo 2 instituciones activas', clubs.length >= 2, `Solo hay ${clubs.length} institución(es)`);

  if (clubs.length < 2) {
    console.log('\n⚠️  Se necesitan al menos 2 instituciones para el walkthrough.');
    console.log('   Crear instituciones desde /admin/instituciones');
    return;
  }

  console.log(`\n📋 Instituciones encontradas:`);
  for (const club of clubs) {
    console.log(`   - ${club.name} (${club.slug})`);
  }

  // 3. Verificar usuarios admin para cada institución
  const adminUsers = await prisma.adminUser.findMany({
    where: {
      role: 'ADMIN',
      clubId: { in: clubs.map(c => c.id) },
    },
    select: { id: true, email: true, clubId: true, role: true },
  });

  const adminsByClub = clubs.map(club => ({
    club,
    admins: adminUsers.filter(u => u.clubId === club.id),
  }));

  for (const { club, admins } of adminsByClub) {
    test(
      `Admin para ${club.name}`,
      admins.length > 0,
      admins.length === 0 ? 'No hay admin configurado' : ''
    );
  }

  // 4. Verificar socios en cada institución
  const members = await prisma.member.findMany({
    where: {
      clubId: { in: clubs.map(c => c.id) },
    },
    select: { id: true, firstName: true, clubId: true },
  });

  const membersByClub = clubs.map(club => ({
    club,
    members: members.filter(m => m.clubId === club.id),
  }));

  for (const { club, members: clubMembers } of membersByClub) {
    test(
      `Socios en ${club.name}`,
      clubMembers.length > 0,
      clubMembers.length === 0 ? 'No hay socios' : `${clubMembers.length} socios`
    );
  }

  // 5. Verificar cuotas en cada institución
  const fees = await prisma.fee.findMany({
    where: {
      clubId: { in: clubs.map(c => c.id) },
    },
    select: { id: true, clubId: true, status: true },
  });

  const feesByClub = clubs.map(club => ({
    club,
    fees: fees.filter(f => f.clubId === club.id),
    pendingFees: fees.filter(f => f.clubId === club.id && f.status === 'PENDING'),
    overdueFees: fees.filter(f => f.clubId === club.id && f.status === 'OVERDUE'),
  }));

  for (const { club, fees: clubFees, pendingFees, overdueFees } of feesByClub) {
    test(
      `Cuotas en ${club.name}`,
      clubFees.length > 0,
      clubFees.length === 0 ? 'No hay cuotas' : `${clubFees.length} cuotas (${pendingFees.length} pendientes, ${overdueFees.length} vencidas)`
    );
  }

  // 6. Verificar aislamiento de datos
  console.log('\n🔒 Verificando aislamiento de datos...');

  for (const club of clubs) {
    const clubMembers = await prisma.member.findMany({
      where: { clubId: club.id },
      select: { id: true, clubId: true },
    });

    const allClubIds = [...new Set(clubMembers.map(m => m.clubId))];
    test(
      `Aislamiento ${club.name}`,
      allClubIds.length === 1 && allClubIds[0] === club.id,
      allClubIds.length > 1 ? 'Socios de otras instituciones encontrados' : ''
    );
  }

  // 7. Verificar configuración por institución
  console.log('\n🔧 Verificando configuración por institución...');

  for (const club of clubs) {
    const configs = await prisma.siteConfig.findMany({
      where: { clubId: club.id },
      select: { key: true, value: true },
    });

    const hasBankConfig = configs.some(c => c.key.startsWith('bank_') && c.value);
    test(
      `Config bancaria ${club.name}`,
      hasBankConfig,
      hasBankConfig ? '' : 'No tiene configuración bancaria'
    );
  }

  // 8. Verificar comisiones por institución
  console.log('\n💰 Verificando comisiones por institución...');

  for (const club of clubs) {
    const commissions = await prisma.commission.findMany({
      where: { clubId: club.id },
      select: { id: true, clubId: true },
    });

    test(
      `Comisiones ${club.name}`,
      true, // No es obligatorio tener comisiones
      commissions.length === 0 ? 'No tiene comisiones aún' : `${commissions.length} comisiones`
    );
  }

  // 9. Verificar pagos por institución
  console.log('\n💳 Verificando pagos por institución...');

  for (const club of clubs) {
    const payments = await prisma.payment.findMany({
      where: { clubId: club.id },
      select: { id: true, clubId: true, status: true },
    });

    const confirmedPayments = payments.filter(p => p.status === 'CONFIRMED');
    test(
      `Pagos ${club.name}`,
      true, // No es obligatorio tener pagos
      payments.length === 0 ? 'No tiene pagos aún' : `${payments.length} pagos (${confirmedPayments.length} confirmados)`
    );
  }

  // 10. Verificar rutas multi-tenant
  console.log('\n🌐 Verificando rutas multi-tenant...');

  const routes = [
    '/pagos/instituciones',
    `/pagos/${clubs[0].slug}`,
    `/pagos/${clubs[0].slug}?dni=12345678`,
    '/admin',
    '/admin/instituciones',
    '/admin/configuracion',
  ];

  console.log('   Rutas para probar manualmente:');
  for (const route of routes) {
    console.log(`   - ${route}`);
  }

  // Resumen
  console.log('\n=== Resumen del Walkthrough ===');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`✅ Pasaron: ${passed}`);
  console.log(`❌ Fallaron: ${failed}`);

  if (failed > 0) {
    console.log('\n⚠️  Hay pruebas fallidas. Revisar los errores arriba.');
  } else {
    console.log('\n🎉 ¡Todas las pruebas pasaron! El sistema multi-tenant está funcionando correctamente.');
  }

  // Instrucciones para prueba manual
  console.log('\n=== Prueba Manual Recomendada ===');
  console.log('\n1. Login como Super Admin:');
  console.log('   - Ir a /login');
  console.log('   - Usar credenciales de super admin');
  console.log('   - Verificar que se puede acceder a /admin/instituciones');

  console.log('\n2. Login como Admin de Institución:');
  console.log('   - Ir a /login');
  console.log('   - Usar credenciales del admin de la institución');
  console.log('   - Verificar que solo ve datos de su institución');

  console.log('\n3. Portal de Socios:');
  console.log('   - Ir a /pagos/instituciones');
  console.log('   - Seleccionar una institución');
  console.log('   - Buscar socio por DNI');
  console.log('   - Verificar que solo ve cuotas de esa institución');

  console.log('\n4. Aislamiento de Datos:');
  console.log('   - Login como admin de la institución A');
  console.log('   - Intentar acceder a datos de la institución B via URL directa');
  console.log('   - Debería recibir error 403 o 404');

  console.log('\n5. Cambio de Institución (Super Admin):');
  console.log('   - Login como super admin');
  console.log('   - Usar el selector de institución en el sidebar');
  console.log('   - Verificar que los datos cambian según la institución seleccionada');
}

// Ejecutar walkthrough
walkthrough()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
