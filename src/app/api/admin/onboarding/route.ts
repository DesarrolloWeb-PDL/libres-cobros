import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { requireInstitution, institutionWhere, AuthError } from '@/lib/access';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireInstitution(request);

    if (!ctx.institutionId) {
      return apiError(
        'Institución requerida',
        400,
        'Se requiere una institución para el onboarding',
        'INSTITUTION_REQUIRED'
      );
    }

    const institutionId = ctx.institutionId;

    const [club, membersCount, feesCount, siteConfigsCount, campaignsCount] = await Promise.all([
      prisma.club.findUnique({
        where: { id: institutionId },
        select: {
          id: true,
          name: true,
          phone: true,
          logoUrl: true,
          siglas: true,
          cuit: true,
        },
      }),
      prisma.member.count({ where: institutionWhere(institutionId) }),
      prisma.fee.count({ where: institutionWhere(institutionId) }),
      prisma.siteConfig.count({ where: { clubId: institutionId } }),
      prisma.massMessageCampaign.count({ where: { clubId: institutionId } }),
    ]);

    const clubConfigured = Boolean(
      club && (club.phone || club.logoUrl || club.siglas || club.cuit)
    );
    const hasMembers = membersCount > 0;
    const hasPaymentMethods = siteConfigsCount > 0;
    const hasFees = feesCount > 0;
    const hasMessages = campaignsCount > 0;

    const steps = [
      { id: 'club-data', label: 'Configurar datos del club', done: clubConfigured, href: '/admin/configuracion' },
      { id: 'members', label: 'Agregar socios', done: hasMembers, href: '/admin/socios/nuevo' },
      { id: 'payment-methods', label: 'Configurar medios de pago', done: hasPaymentMethods, href: '/admin/configuracion' },
      { id: 'first-fees', label: 'Generar primeras cuotas', done: hasFees, href: '/admin/cuotas/generar' },
      { id: 'first-message', label: 'Enviar primer mensaje', done: hasMessages, href: '/admin/mensajes' },
    ];

    const completedCount = steps.filter((step) => step.done).length;
    const totalCount = steps.length;
    const allComplete = completedCount === totalCount;

    return apiSuccess({
      institutionId,
      steps,
      completedCount,
      totalCount,
      allComplete,
      counts: {
        members: membersCount,
        fees: feesCount,
        siteConfigs: siteConfigsCount,
        campaigns: campaignsCount,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }
    return apiDbError(error, 'Error al cargar el onboarding');
  }
}