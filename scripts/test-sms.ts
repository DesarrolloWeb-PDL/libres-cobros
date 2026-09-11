/**
 * Script de testing para integración SMS/Twilio
 * 
 * Este script verifica que la integración SMS funcione correctamente.
 * Requiere credenciales de Twilio configuradas en la institución via Admin UI.
 * 
 * Uso:
 *   npx tsx scripts/test-sms.ts
 * 
 * Prerequisitos:
 *   1. Tener una institución configurada con credenciales de Twilio
 *   2. Tener al menos un socio con teléfono registrado
 *   3. Tener cuotas pendientes para el socio
 *   4. Variable de entorno DATABASE_URL configurada
 */

import { prisma } from '../src/lib/db';
import { getConfiguredChannel, normalizePhone } from '../src/lib/sms';

// Verificar que DATABASE_URL esté configurado
if (!process.env.DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL no está configurado.');
  console.error('');
  console.error('Para ejecutar este script:');
  console.error('1. Asegurate de que el archivo .env.local exista');
  console.error('2. Que contenga DATABASE_URL con la conexión a la base de datos');
  console.error('3. Ejecuta: npx tsx scripts/test-sms.ts');
  console.error('');
  console.error('Ejemplo de .env.local:');
  console.error('DATABASE_URL="postgresql://user:password@host:port/dbname"');
  process.exit(1);
}

async function testSmsIntegration() {
  console.log('=== Test SMS Integration ===\n');

  // 1. Verificar conexión a base de datos
  try {
    await prisma.$connect();
    console.log('✅ Conexión a base de datos exitosa');
  } catch (error) {
    console.error('❌ Error al conectar a la base de datos:', error);
    return;
  }

  // 2. Buscar una institución activa
  const club = await prisma.club.findFirst({
    where: { status: 'ACTIVE' },
    select: { id: true, name: true, slug: true },
  });

  if (!club) {
    console.error('❌ No hay instituciones activas en la base de datos');
    return;
  }

  console.log(`\n📋 Institución encontrada: ${club.name} (${club.slug})`);

  // 3. Verificar canal configurado
  try {
    const channel = await getConfiguredChannel(club.id);
    console.log(`📱 Canal configurado: ${channel}`);
  } catch (error) {
    console.error('❌ Error al obtener canal configurado:', error);
    return;
  }

  // 4. Verificar configuración de Twilio
  const twilioConfig = await prisma.siteConfig.findMany({
    where: {
      clubId: club.id,
      key: { in: ['twilio_account_sid', 'twilio_auth_token', 'twilio_phone_number'] },
    },
  });

  console.log('\n🔧 Configuración de Twilio:');
  const configMap: Record<string, string> = {};
  for (const config of twilioConfig) {
    const value = config.value ? '✅ Configurado' : '❌ No configurado';
    console.log(`   ${config.key}: ${value}`);
    configMap[config.key] = config.value;
  }

  if (!configMap['twilio_account_sid'] || !configMap['twilio_auth_token'] || !configMap['twilio_phone_number']) {
    console.log('\n⚠️  Twilio no está completamente configurado para esta institución.');
    console.log('   Para configurar Twilio:');
    console.log('   1. Ir a /admin/configuracion');
    console.log('   2. Pestaña "Mensajería"');
    console.log('   3. Completar los campos de Twilio SMS');
    console.log('   4. Guardar configuración');
    return;
  }

  // 5. Buscar un socio con teléfono
  const member = await prisma.member.findFirst({
    where: {
      clubId: club.id,
      phone: { not: null },
      fees: {
        some: {
          status: { in: ['PENDING', 'OVERDUE'] },
        },
      },
    },
    select: {
      id: true,
      firstName: true,
      phone: true,
      dni: true,
    },
  });

  if (!member) {
    console.log('\n⚠️  No hay socios con teléfono y cuotas pendientes.');
    console.log('   Para probar el SMS:');
    console.log('   1. Crear un socio con número de teléfono');
    console.log('   2. Generar cuotas pendientes para el socio');
    return;
  }

  console.log(`\n👤 Socio encontrado: ${member.firstName} (${member.dni})`);
  console.log(`   Teléfono: ${member.phone}`);

  // 6. Normalizar teléfono
  if (member.phone) {
    const normalizedPhone = normalizePhone(member.phone);
    console.log(`   Teléfono normalizado: ${normalizedPhone}`);

    // 7. Verificar formato de teléfono
    if (!normalizedPhone.startsWith('+54')) {
      console.log('⚠️  El teléfono no parece ser un número argentino');
    }
  } else {
    console.log('⚠️  El socio no tiene teléfono registrado');
  }

  // 8. Intentar enviar SMS de prueba (dry run)
  console.log('\n🧪 Modo de prueba (dry run):');
  console.log('   Para enviar un SMS real, descomenta la línea 90 en este script.');
  console.log('   ⚠️  Esto enviará un SMS real al número del socio.');

  // Descomentar para enviar SMS real:
  // try {
  //   const result = await sendMessage(institution.id, member.phone, 'Test de SMS - Libres Cobros');
  //   console.log(`   ✅ SMS enviado exitosamente`);
  //   console.log(`   ID externo: ${result.externalId}`);
  //   console.log(`   Canal: ${result.channel}`);
  // } catch (error) {
  //   console.error('   ❌ Error al enviar SMS:', error);
  // }

  // 9. Verificar logs de SMS
  const recentLogs = await prisma.smsLog.findMany({
    where: { clubId: club.id },
    take: 5,
    select: {
      type: true,
      status: true,
      message: true,
      error: true,
    },
  });

  console.log('\n📊 Últimos 5 logs de SMS:');
  if (recentLogs.length === 0) {
    console.log('   No hay logs de SMS');
  } else {
    for (const log of recentLogs) {
      const status = log.status === 'SENT' ? '✅' : log.status === 'FAILED' ? '❌' : '⏭️';
      console.log(`   ${status} ${log.type} - ${log.status}`);
      if (log.error) {
        console.log(`      Error: ${log.error}`);
      }
    }
  }

  console.log('\n=== Test completado ===');
  console.log('\nPróximos pasos:');
  console.log('1. Configurar credenciales de Twilio en /admin/configuracion');
  console.log('2. Probar envío real desde el panel de admin');
  console.log('3. Verificar que el SMS llega al número del socio');
  console.log('4. Revisar logs en la base de datos');
}

// Ejecutar test
testSmsIntegration()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
