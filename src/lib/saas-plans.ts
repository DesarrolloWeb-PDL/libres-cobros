import { prisma } from '@/lib/db';

export interface LandingPlan {
  id: string;
  name: string;
  audience: string;
  price: string;
  period: string;
  highlight: boolean;
  features: string[];
  cta: string;
}

export function formatPlanAudience(minMembers: number, maxMembers: number): string {
  if (minMembers === 0) {
    return `Hasta ${maxMembers} socios`;
  }
  if (maxMembers >= 999_999) {
    return `Más de ${minMembers - 1} socios`;
  }
  return `De ${minMembers} a ${maxMembers} socios`;
}

export function formatPlanPrice(priceArs: number): string {
  if (priceArs === 0) {
    return '$ 0';
  }
  return `$ ${Math.round(priceArs).toLocaleString('es-AR')}`;
}

export function getPlanFeatures(maxMembers: number): string[] {
  if (maxMembers <= 50) {
    return [
      'Hasta 50 socios, sin vencimiento',
      '0% sobre lo que recaudás',
      'Links de pago por WhatsApp',
      'Recordatorios por WhatsApp y email',
      'Comprobantes con código QR',
      'Importación y exportación desde Excel',
    ];
  }

  if (maxMembers <= 200) {
    return [
      'Todo lo del plan gratis',
      '0% sobre lo que recaudás',
      'Débito automático con Mercado Pago y Stripe',
      'Reportes de pagos, deudas y cierres',
      'Multi-institución',
      'Soporte por WhatsApp',
    ];
  }

  if (maxMembers <= 800) {
    return [
      'Todo lo del plan de crecimiento',
      '0% sobre lo que recaudás',
      'Tramos de socios publicados, sin saltos sorpresa',
      'Panel multi-institución ilimitado',
      'Alta prioridad en soporte',
      'Para más de 800 socios: escribinos y armamos el tramo',
    ];
  }

  return [
    'Todo lo de los planes publicados',
    '0% sobre lo que recaudás',
    'Tramos personalizados según el tamaño de tu club',
    'Panel multi-institución ilimitado',
    'Soporte prioritario',
    'Precio publicado, sin sorpresas',
  ];
}

export async function getActiveLandingPlans(): Promise<LandingPlan[]> {
  const plans = await prisma.saasPlan.findMany({
    where: { isActive: true },
    orderBy: { maxMembers: 'asc' },
  });

  return plans.map((plan) => ({
    id: plan.id,
    name: plan.name,
    audience: formatPlanAudience(plan.minMembers, plan.maxMembers),
    price: formatPlanPrice(plan.priceArs),
    period: plan.priceArs === 0 ? 'para siempre' : 'por mes',
    highlight: plan.highlight,
    features: getPlanFeatures(plan.maxMembers),
    cta: 'Registrar mi club',
  }));
}
