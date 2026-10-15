import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { getEffectiveClub } from '@/lib/access';
import { getClubSiteConfigValue } from '@/lib/site-config';
import { createMpPreapproval, cancelMpPreapproval } from '@/lib/mercadopago';
import { createStripeSubscription, cancelStripeSubscription } from '@/lib/stripe';
import { z } from 'zod';
import type { AutoDebit } from '@prisma/client';

const MemberDniQuerySchema = z.object({
  dni: z.string().min(1, 'El DNI es obligatorio'),
  clubSlug: z.string().min(1, 'La institución es obligatoria'),
});

const CreateAutoDebitSchema = z.object({
  dni: z.string().min(1, 'El DNI es obligatorio'),
  clubSlug: z.string().min(1, 'La institución es obligatoria'),
  gateway: z.enum(['mercadopago', 'stripe']),
});

const CancelAutoDebitSchema = z.object({
  dni: z.string().min(1, 'El DNI es obligatorio'),
  clubSlug: z.string().min(1, 'La institución es obligatoria'),
});

function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_URL ?? 'http://localhost:3000';
}

function serializeAutoDebit(autoDebit: AutoDebit): {
  id: string;
  gateway: string;
  status: string;
  amount: number;
  nextBillingAt: string | null;
} {
  return {
    id: autoDebit.id,
    gateway: autoDebit.gateway,
    status: autoDebit.status,
    amount: autoDebit.amount,
    nextBillingAt: autoDebit.nextBillingAt?.toISOString() ?? null,
  };
}

/** First day of next month, used as the initial Stripe billing marker. */
function firstDayOfNextMonth(): Date {
  const next = new Date();
  return new Date(next.getFullYear(), next.getMonth() + 1, 1);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const parsed = MemberDniQuerySchema.safeParse({
      dni: searchParams.get('dni') ?? undefined,
      clubSlug: searchParams.get('clubSlug') ?? undefined,
    });

    if (!parsed.success) {
      return apiError(
        'Datos inválidos',
        400,
        parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        'VALIDATION_ERROR'
      );
    }

    const { dni, clubSlug } = parsed.data;

    const club = await getEffectiveClub(clubSlug);
    if (!club) {
      return apiError('Institución no encontrada', 404, 'Institution slug inválido o inactivo', 'INSTITUTION_NOT_FOUND');
    }

    const member = await prisma.member.findUnique({
      where: { clubId_dni: { clubId: club.id, dni } },
    });

    if (!member) {
      return apiError('Socio no encontrado', 404, 'DNI inválido', 'MEMBER_NOT_FOUND');
    }

    const autoDebit = await prisma.autoDebit.findUnique({
      where: { clubId_memberId: { clubId: club.id, memberId: member.id } },
    });

    return apiSuccess({
      autoDebit: autoDebit ? serializeAutoDebit(autoDebit) : null,
    });
  } catch (error) {
    return apiDbError(error, 'Error al obtener el débito automático del socio');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CreateAutoDebitSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        'Datos inválidos',
        400,
        parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        'VALIDATION_ERROR'
      );
    }

    const { dni, clubSlug, gateway } = parsed.data;

    const club = await getEffectiveClub(clubSlug);
    if (!club) {
      return apiError('Institución no encontrada', 404, 'Institution slug inválido o inactivo', 'INSTITUTION_NOT_FOUND');
    }

    const member = await prisma.member.findUnique({
      where: { clubId_dni: { clubId: club.id, dni } },
    });

    if (!member) {
      return apiError('Socio no encontrado', 404, 'DNI inválido', 'MEMBER_NOT_FOUND');
    }

    const existing = await prisma.autoDebit.findUnique({
      where: { clubId_memberId: { clubId: club.id, memberId: member.id } },
    });

    // CANCELLED rows may exist (one-per-member unique constraint) so re-subscribing
    // upserts them; FAILED rows are also re-creatable so the member can retry.
    const canResubscribe = existing && (existing.status === 'CANCELLED' || existing.status === 'FAILED');

    if (existing && !canResubscribe) {
      return apiError(
        'El socio ya tiene un débito automático activo',
        409,
        'Only one auto-debit per member per institution; cancel it before subscribing again',
        'AUTODEBIT_ALREADY_EXISTS'
      );
    }

    // Amount is locked at subscription creation from the member's plan,
    // falling back to the institution's cheapest active plan.
    const plan = member.planId
      ? await prisma.plan.findFirst({
          where: { id: member.planId, clubId: club.id },
        })
      : await prisma.plan.findFirst({
          where: { clubId: club.id, isActive: true },
          orderBy: { amount: 'asc' },
        });

    if (!plan) {
      return apiError(
        'La institución no tiene planes configurados',
        409,
        'No active plan available to lock the auto-debit amount',
        'NO_ACTIVE_PLAN'
      );
    }

    const amount = plan.amount;
    const baseUrl = getSiteUrl();
    const returnUrl = `${baseUrl}/pagos/${club.slug}`;

    if (gateway === 'mercadopago') {
      if (!member.email) {
        return apiError(
          'El socio debe tener un email para debitar por MercadoPago',
          400,
          'Member email is required for MercadoPago preapproval',
          'MEMBER_EMAIL_REQUIRED'
        );
      }

      const accessToken = await getClubSiteConfigValue(club.id, 'mercadopago_access_token');
      if (!accessToken) {
        return apiError(
          'MercadoPago no configurado para esta institución',
          500,
          'mercadopago_access_token no configurado',
          'MERCADOPAGO_NOT_CONFIGURED'
        );
      }

      const preapproval = await createMpPreapproval({
        accessToken,
        payerEmail: member.email,
        amount,
        clubName: club.name,
        clubSlug: club.slug,
        memberId: member.id,
        returnUrl,
        notificationUrl: `${baseUrl}/api/webhooks/mercadopago?club_slug=${club.slug}`,
      });

      const autoDebit = await upsertAutoDebit({
        clubId: club.id,
        memberId: member.id,
        gateway: 'mercadopago',
        gatewaySubscriptionId: preapproval.preapprovalId,
        status: 'PENDING_AUTH',
        amount,
        payerEmail: member.email,
        nextBillingAt: null,
      });

      return apiSuccess({
        autoDebit: serializeAutoDebit(autoDebit),
        authorizationUrl: preapproval.initPoint,
      });
    }

    // gateway === 'stripe'
    if (!member.email) {
      return apiError(
        'El socio debe tener un email para debitar por Stripe',
        400,
        'Member email is required for Stripe subscription',
        'MEMBER_EMAIL_REQUIRED'
      );
    }

    const secretKey = await getClubSiteConfigValue(club.id, 'stripe_secret_key');
    if (!secretKey) {
      return apiError(
        'Stripe no configurado para esta institución',
        500,
        'stripe_secret_key no configurado',
        'STRIPE_NOT_CONFIGURED'
      );
    }

    const subscription = await createStripeSubscription({
      secretKey,
      memberEmail: member.email,
      amount,
      clubSlug: club.slug,
      memberId: member.id,
      returnUrl,
    });

    // Stripe subscriptions start charging immediately, so the auto-debit is
    // already ACTIVE without an authorization round-trip.
    const autoDebit = await upsertAutoDebit({
      clubId: club.id,
      memberId: member.id,
      gateway: 'stripe',
      gatewaySubscriptionId: subscription.subscriptionId,
      status: 'ACTIVE',
      amount,
      payerEmail: member.email,
      nextBillingAt: firstDayOfNextMonth(),
    });

    return apiSuccess({
      autoDebit: serializeAutoDebit(autoDebit),
      managementUrl: subscription.customerPortalUrl,
    });
  } catch (error) {
    return apiDbError(error, 'Error al crear el débito automático');
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CancelAutoDebitSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        'Datos inválidos',
        400,
        parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        'VALIDATION_ERROR'
      );
    }

    const { dni, clubSlug } = parsed.data;

    const club = await getEffectiveClub(clubSlug);
    if (!club) {
      return apiError('Institución no encontrada', 404, 'Institution slug inválido o inactivo', 'INSTITUTION_NOT_FOUND');
    }

    const member = await prisma.member.findUnique({
      where: { clubId_dni: { clubId: club.id, dni } },
    });

    if (!member) {
      return apiError('Socio no encontrado', 404, 'DNI inválido', 'MEMBER_NOT_FOUND');
    }

    const autoDebit = await prisma.autoDebit.findUnique({
      where: { clubId_memberId: { clubId: club.id, memberId: member.id } },
    });

    if (!autoDebit || autoDebit.status === 'CANCELLED') {
      return apiError(
        'Débito automático no encontrado',
        404,
        'No active auto-debit for this member',
        'AUTODEBIT_NOT_FOUND'
      );
    }

    if (autoDebit.gateway === 'mercadopago') {
      const accessToken = await getClubSiteConfigValue(club.id, 'mercadopago_access_token');
      if (!accessToken) {
        return apiError(
          'MercadoPago no configurado para esta institución',
          500,
          'mercadopago_access_token no configurado',
          'MERCADOPAGO_NOT_CONFIGURED'
        );
      }

      await cancelMpPreapproval(autoDebit.gatewaySubscriptionId, accessToken);
    } else {
      const secretKey = await getClubSiteConfigValue(club.id, 'stripe_secret_key');
      if (!secretKey) {
        return apiError(
          'Stripe no configurado para esta institución',
          500,
          'stripe_secret_key no configurado',
          'STRIPE_NOT_CONFIGURED'
        );
      }

      await cancelStripeSubscription(autoDebit.gatewaySubscriptionId, secretKey);
    }

    const updated = await prisma.autoDebit.update({
      where: { id: autoDebit.id },
      data: { status: 'CANCELLED' },
    });

    return apiSuccess({
      autoDebit: serializeAutoDebit(updated),
    });
  } catch (error) {
    return apiDbError(error, 'Error al cancelar el débito automático');
  }
}

/**
 * A CANCELLED row may exist (one-per-member unique constraint), so re-subscribing
 * updates it in place with the new gateway subscription instead of inserting.
 */
async function upsertAutoDebit(data: {
  clubId: string;
  memberId: string;
  gateway: string;
  gatewaySubscriptionId: string;
  status: string;
  amount: number;
  payerEmail: string;
  nextBillingAt: Date | null;
}): Promise<AutoDebit> {
  return prisma.autoDebit.upsert({
    where: {
      clubId_memberId: { clubId: data.clubId, memberId: data.memberId },
    },
    create: {
      clubId: data.clubId,
      memberId: data.memberId,
      gateway: data.gateway,
      gatewaySubscriptionId: data.gatewaySubscriptionId,
      status: data.status,
      amount: data.amount,
      payerEmail: data.payerEmail,
      nextBillingAt: data.nextBillingAt,
    },
    update: {
      gateway: data.gateway,
      gatewaySubscriptionId: data.gatewaySubscriptionId,
      status: data.status,
      amount: data.amount,
      payerEmail: data.payerEmail,
      nextBillingAt: data.nextBillingAt,
    },
  });
}
