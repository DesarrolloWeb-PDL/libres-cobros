import Stripe from 'stripe';

function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }

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
  successUrl: string;
  cancelUrl: string;
}

export async function createStripeCheckoutSession(
  input: CreateStripeCheckoutSessionInput
): Promise<{ sessionId: string; url: string | null }> {
  const stripe = getStripeClient();

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
    },
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
  });

  return { sessionId: session.id, url: session.url };
}

export async function verifyStripeWebhook(
  payload: string | Buffer,
  signature: string | null
): Promise<Stripe.Event> {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  }

  if (!signature) {
    throw new Error('Missing Stripe signature header');
  }

  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}
