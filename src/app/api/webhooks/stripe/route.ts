import { NextRequest } from 'next/server';
import type Stripe from 'stripe';
import type { Club } from '@prisma/client';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import {
  verifyStripeWebhook,
  getInvoiceSubscriptionId,
  getInvoicePaymentIntentId,
} from '@/lib/stripe';
import { confirmPayment } from '@/lib/payments';
import { settleAutoDebitCharge, advanceAutoDebitBilling } from '@/lib/autodebit';
import { getClubSiteConfigValue } from '@/lib/site-config';

const STRIPE_WEBHOOK_SECRET_KEY = 'stripe_webhook_secret';

function getEventClubSlug(event: Stripe.Event): string | null {
  const object = event.data.object as { metadata?: { clubSlug?: string } };
  return object?.metadata?.clubSlug ?? null;
}

interface ResolvedEvent {
  event: Stripe.Event;
  club: Club;
}

/**
 * Resolves the institution that owns this webhook event and verifies its signature.
 *
 * Primary: `?club_slug=` query param (set in each institution's Stripe dashboard).
 * `constructEvent` needs the webhook secret BEFORE the payload can be parsed
 * (chicken-and-egg with metadata), so the query param gives a direct
 * institution -> secret lookup. Fallback (no query param): iterate ACTIVE institutions'
 * webhook secrets until one verifies, cross-checking `metadata.clubSlug`.
 *
 * Returns null for any path that must answer 401 without touching state.
 */
async function resolveEvent(
  payload: string,
  signature: string | null,
  slug: string | null
): Promise<ResolvedEvent | null> {
  if (slug) {
    const club = await prisma.club.findUnique({ where: { slug } });

    if (!club) {
      return null;
    }

    const webhookSecret = await getClubSiteConfigValue(club.id, STRIPE_WEBHOOK_SECRET_KEY);

    if (!webhookSecret) {
      return null;
    }

    let event: Stripe.Event;
    try {
      event = await verifyStripeWebhook(payload, signature, webhookSecret);
    } catch {
      return null;
    }

    // Cross-check metadata.clubSlug when present.
    const eventSlug = getEventClubSlug(event);
    if (eventSlug && eventSlug !== club.slug) {
      return null;
    }

    return { event, club };
  }

  const clubs = await prisma.club.findMany({
    where: { status: 'ACTIVE' },
  });

  for (const club of clubs) {
    const webhookSecret = await getClubSiteConfigValue(club.id, STRIPE_WEBHOOK_SECRET_KEY);

    if (!webhookSecret) {
      continue;
    }

    try {
      const event = await verifyStripeWebhook(payload, signature, webhookSecret);
      const eventSlug = getEventClubSlug(event);

      if (eventSlug && eventSlug !== club.slug) {
        continue;
      }

      return { event, club };
    } catch {
      continue;
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('stripe-signature');
    const payload = await request.text();
    const slug = request.nextUrl.searchParams.get('club_slug');

    const resolved = await resolveEvent(payload, signature, slug);

    if (!resolved) {
      return apiError(
        'Firma inválida',
        401,
        'No se pudo verificar el evento contra ningún secreto de institución',
        'INVALID_SIGNATURE'
      );
    }

    const { event, club } = resolved;

    // Handle payment failure/expiry events
    if (event.type === 'checkout.session.expired' || event.type === 'payment_intent.payment_failed') {
      const session = event.data.object;
      const stripeSessionId = session.id;

      const payment = await prisma.payment.findFirst({
        where: { stripeSessionId, clubId: club.id },
      });

      if (payment && payment.status !== 'FAILED') {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'FAILED' },
        });

        await prisma.fee.update({
          where: { id: payment.feeId },
          data: { status: 'PENDING' },
        });
      }

      return apiSuccess({ received: true, type: event.type, action: 'marked_failed' });
    }

    // Auto-debit: subscription invoice paid — settle the month's fee via the
    // shared gateway-agnostic confirmation path.
    if (event.type === 'invoice.paid') {
      const invoice = event.data.object;
      const subscriptionId = getInvoiceSubscriptionId(invoice);

      if (subscriptionId) {
        const autoDebit = await prisma.autoDebit.findUnique({
          where: {
            gateway_gatewaySubscriptionId: {
              gateway: 'stripe',
              gatewaySubscriptionId: subscriptionId,
            },
          },
        });

        if (autoDebit) {
          const stripePaymentId = getInvoicePaymentIntentId(invoice);

          const result = await settleAutoDebitCharge({
            clubId: club.id,
            autoDebitId: autoDebit.id,
            memberId: autoDebit.memberId,
            amount: autoDebit.amount,
            method: 'stripe',
            confirmOptions: { stripePaymentId: stripePaymentId ?? undefined },
          });

          if (result.status === 'plan_not_found') {
            return apiError(
              'La institución no tiene planes configurados',
              409,
              'Cannot create the fee without a plan',
              'NO_ACTIVE_PLAN'
            );
          }

          if (result.status === 'confirmed') {
            await advanceAutoDebitBilling(autoDebit.id);
          }

          return apiSuccess({ received: true, action: 'autodebit_confirmed', status: result.status });
        }
      }

      return apiSuccess({ received: true, type: event.type });
    }

    // Auto-debit: subscription payment failed
    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object;
      const subscriptionId = getInvoiceSubscriptionId(invoice);

      if (subscriptionId) {
        await prisma.autoDebit.updateMany({
          where: {
            gateway: 'stripe',
            gatewaySubscriptionId: subscriptionId,
            status: 'ACTIVE',
          },
          data: { status: 'FAILED' },
        });
      }

      return apiSuccess({ received: true, type: event.type });
    }

    // Auto-debit: subscription cancelled/deleted
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;

      await prisma.autoDebit.updateMany({
        where: {
          gateway: 'stripe',
          gatewaySubscriptionId: subscription.id,
        },
        data: { status: 'CANCELLED' },
      });

      return apiSuccess({ received: true, type: event.type });
    }

    if (event.type !== 'checkout.session.completed') {
      return apiSuccess({ received: true, type: event.type });
    }

    const session = event.data.object;
    const stripeSessionId = session.id;
    const stripePaymentId =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id ?? null;

    const payment = await prisma.payment.findFirst({
      where: { stripeSessionId, clubId: club.id },
    });

    if (!payment) {
      return apiError('Pago no encontrado', 404, 'Stripe session ID desconocido', 'PAYMENT_NOT_FOUND');
    }

    const result = await confirmPayment(payment.id, {
      stripePaymentId: stripePaymentId ?? undefined,
    });

    return apiSuccess({ received: true, status: result.status });
  } catch (error) {
    return apiDbError(error, 'Error al procesar webhook de Stripe');
  }
}
