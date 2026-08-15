import Stripe from 'stripe';

function createStripeClient(secretKey: string): Stripe {
  return new Stripe(secretKey, {
    apiVersion: '2026-07-29.dahlia',
    typescript: true,
  });
}

export interface CreateStripeCheckoutSessionInput {
  paymentId: string;
  feeId: string;
  memberId: string;
  amount: number;
  /** Club slug carried in session metadata for webhook club resolution. */
  clubSlug: string;
  /** Per-club secret key resolved from the club's SiteConfig. */
  secretKey: string;
  successUrl: string;
  cancelUrl: string;
}

export async function createStripeCheckoutSession(
  input: CreateStripeCheckoutSessionInput
): Promise<{ sessionId: string; url: string | null }> {
  const stripe = createStripeClient(input.secretKey);

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'ars',
          product_data: {
            name: 'Cuota mensual',
            description: `Cuota del club - Ref: ${input.feeId}`,
          },
          unit_amount: Math.round(input.amount * 100),
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    client_reference_id: input.paymentId,
    metadata: {
      feeId: input.feeId,
      memberId: input.memberId,
      paymentId: input.paymentId,
      clubSlug: input.clubSlug,
    },
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
  });

  return { sessionId: session.id, url: session.url };
}

/**
 * Verifies a Stripe webhook signature against the club's webhook secret.
 * The secret must be passed explicitly (resolved per club BEFORE parsing the
 * payload, because constructEvent needs the secret to decrypt the signature).
 */
export async function verifyStripeWebhook(
  payload: string | Buffer,
  signature: string | null,
  webhookSecret: string
): Promise<Stripe.Event> {
  if (!signature) {
    throw new Error('Missing Stripe signature header');
  }

  if (!webhookSecret) {
    throw new Error('Stripe webhook secret is not configured');
  }

  // constructEvent only consumes the explicit `webhookSecret` argument; the
  // client instance is a container for the Webhooks namespace.
  const stripe = createStripeClient(webhookSecret);
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}
