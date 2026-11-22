import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { requireInstitution, AuthError } from '@/lib/access';
import type {
  SaasSubscriptionListItem,
  SaasInvoiceListItem,
  SaasPlanChangeRequestListItem,
  SaasPlanListItem,
  SaasSubscriptionDetailResponse,
} from '@/types/saas';

export const dynamic = 'force-dynamic';

function serializeSubscription(subscription: {
  id: string;
  institutionId: string;
  institution: { id: string; name: string };
  saasPlanId: string;
  saasPlan: { id: string; name: string; priceArs: number; maxMembers: number };
  pendingSaasPlanId: string | null;
  pendingSaasPlan: { id: string; name: string } | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): SaasSubscriptionListItem {
  return {
    ...subscription,
    createdAt: subscription.createdAt.toISOString(),
    updatedAt: subscription.updatedAt.toISOString(),
  };
}

function serializeInvoice(invoice: {
  id: string;
  institutionId: string;
  institution: { id: string; name: string };
  saasPlanId: string;
  saasPlan: { id: string; name: string };
  month: number;
  year: number;
  amount: number;
  status: string;
  dueDate: Date;
  paidAt: Date | null;
  paymentMethod: string | null;
  transferRef: string | null;
  remindersSent: number;
  createdAt: Date;
  updatedAt: Date;
}): SaasInvoiceListItem {
  return {
    ...invoice,
    dueDate: invoice.dueDate.toISOString(),
    paidAt: invoice.paidAt ? invoice.paidAt.toISOString() : null,
    createdAt: invoice.createdAt.toISOString(),
    updatedAt: invoice.updatedAt.toISOString(),
  };
}

function serializeRequest(request: {
  id: string;
  institutionId: string;
  institution: { id: string; name: string };
  requestedSaasPlanId: string;
  requestedSaasPlan: { id: string; name: string; priceArs: number; maxMembers: number };
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): SaasPlanChangeRequestListItem {
  return {
    ...request,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
  };
}

function serializePlan(plan: {
  id: string;
  name: string;
  minMembers: number;
  maxMembers: number;
  priceArs: number;
  highlight: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): SaasPlanListItem {
  return {
    ...plan,
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireInstitution(request);
    const { id } = await params;

    if (ctx.role === 'ADMIN' && ctx.institutionId !== id) {
      return apiError('No autorizado', 403, 'Solo podés ver tu propia suscripción', 'FORBIDDEN');
    }

    if (ctx.role !== 'SUPER_ADMIN' && ctx.role !== 'ADMIN') {
      return apiError('No autorizado', 403, 'Rol no permitido', 'FORBIDDEN');
    }

    const institution = await prisma.club.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!institution) {
      return apiError('Institución no encontrada', 404, 'ID de institución inválido', 'INSTITUTION_NOT_FOUND');
    }

    const [subscription, invoices, changeRequests, availablePlans] = await Promise.all([
      prisma.saasSubscription.findUnique({
        where: { institutionId: id },
        include: {
          institution: { select: { id: true, name: true } },
          saasPlan: { select: { id: true, name: true, priceArs: true, maxMembers: true } },
          pendingSaasPlan: { select: { id: true, name: true } },
        },
      }),
      prisma.saasInvoice.findMany({
        where: { institutionId: id },
        include: {
          institution: { select: { id: true, name: true } },
          saasPlan: { select: { id: true, name: true } },
        },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        take: 24,
      }),
      prisma.saasPlanChangeRequest.findMany({
        where: { institutionId: id },
        include: {
          institution: { select: { id: true, name: true } },
          requestedSaasPlan: { select: { id: true, name: true, priceArs: true, maxMembers: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 12,
      }),
      prisma.saasPlan.findMany({
        where: { isActive: true },
        orderBy: [{ minMembers: 'asc' }, { maxMembers: 'asc' }],
      }),
    ]);

    const response: SaasSubscriptionDetailResponse = {
      subscription: subscription ? serializeSubscription(subscription) : null,
      invoices: invoices.map(serializeInvoice),
      changeRequests: changeRequests.map(serializeRequest),
      availablePlans: availablePlans.map(serializePlan),
    };

    return apiSuccess(response);
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }
    return apiDbError(error, 'Error al obtener la suscripción SaaS');
  }
}

const AssignSubscriptionSchema = z.object({
  saasPlanId: z.string().min(1, 'El plan es obligatorio'),
});

/**
 * SUPER_ADMIN assigns the first SaaS plan directly (e.g. right after
 * creating the institution). Later plan changes go through the
 * request/approve flow, which updates the pending plan instead.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireInstitution(request);
    const { id } = await params;

    if (ctx.role !== 'SUPER_ADMIN') {
      return apiError('No autorizado', 403, 'Solo SUPER_ADMIN puede asignar suscripciones', 'FORBIDDEN');
    }

    const body = await request.json();
    const parsed = AssignSubscriptionSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        'Datos inválidos',
        400,
        parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        'VALIDATION_ERROR'
      );
    }

    const institution = await prisma.club.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!institution) {
      return apiError('Institución no encontrada', 404, 'ID de institución inválido', 'INSTITUTION_NOT_FOUND');
    }

    const plan = await prisma.saasPlan.findUnique({
      where: { id: parsed.data.saasPlanId },
    });

    if (!plan || !plan.isActive) {
      return apiError('Plan no encontrado', 404, 'El plan no existe o está inactivo', 'PLAN_NOT_FOUND');
    }

    const existing = await prisma.saasSubscription.findUnique({
      where: { institutionId: id },
    });

    if (existing) {
      return apiError(
        'La institución ya tiene una suscripción',
        409,
        'Para cambiar de plan usá el flujo de solicitudes',
        'SUBSCRIPTION_EXISTS'
      );
    }

    const subscription = await prisma.saasSubscription.create({
      data: {
        institutionId: id,
        saasPlanId: plan.id,
        status: 'ACTIVE',
      },
      include: {
        institution: { select: { id: true, name: true } },
        saasPlan: { select: { id: true, name: true, priceArs: true, maxMembers: true } },
        pendingSaasPlan: { select: { id: true, name: true } },
      },
    });

    return apiSuccess(serializeSubscription(subscription));
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }
    return apiDbError(error, 'Error al asignar la suscripción SaaS');
  }
}

/**
 * SUPER_ADMIN assigns or replaces the plan of an EXISTING institution
 * (immediate effect: the plan changes now and any pending change request
 * plan is cleared). Institutions without a subscription get one created.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireInstitution(request);
    const { id } = await params;

    if (ctx.role !== 'SUPER_ADMIN') {
      return apiError('No autorizado', 403, 'Solo SUPER_ADMIN puede modificar suscripciones', 'FORBIDDEN');
    }

    const body = await request.json();
    const parsed = AssignSubscriptionSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        'Datos inválidos',
        400,
        parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        'VALIDATION_ERROR'
      );
    }

    const institution = await prisma.club.findUnique({
      where: { id },
      select: { id: true, name: true },
    });

    if (!institution) {
      return apiError('Institución no encontrada', 404, 'ID de institución inválido', 'INSTITUTION_NOT_FOUND');
    }

    const plan = await prisma.saasPlan.findUnique({
      where: { id: parsed.data.saasPlanId },
    });

    if (!plan || !plan.isActive) {
      return apiError('Plan no encontrado', 404, 'El plan no existe o está inactivo', 'PLAN_NOT_FOUND');
    }

    const include = {
      institution: { select: { id: true, name: true } },
      saasPlan: { select: { id: true, name: true, priceArs: true, maxMembers: true } },
      pendingSaasPlan: { select: { id: true, name: true } },
    } as const;

    const existing = await prisma.saasSubscription.findUnique({
      where: { institutionId: id },
    });

    const subscription = existing
      ? await prisma.saasSubscription.update({
          where: { id: existing.id },
          data: { saasPlanId: plan.id, pendingSaasPlanId: null },
          include,
        })
      : await prisma.saasSubscription.create({
          data: { institutionId: id, saasPlanId: plan.id, status: 'ACTIVE' },
          include,
        });

    return apiSuccess(serializeSubscription(subscription));
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }
    return apiDbError(error, 'Error al modificar la suscripción SaaS');
  }
}
