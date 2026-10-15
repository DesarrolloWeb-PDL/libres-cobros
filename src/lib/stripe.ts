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
  /** Institution slug carried in session metadata for webhook institution resolution. */
  clubSlug: string;
  /** Per-institution secret key resolved from the institution's SiteConfig. */
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
            description: `Cuota de la institución - Ref: ${input.feeId}`,
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
 * Verifies a Stripe webhook signature against the institution's webhook secret.
 * The secret must be passed explicitly (resolved per institution BEFORE parsing the
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

const MONTHLY_FEE_PRODUCT_NAME = 'Cuota mensual de la institución';

/**
 * The dahlia API's subscription price_data requires an existing Product ID
 * (no inline product_data), so the monthly fee product is resolved once per
 * Stripe account and reused across subscriptions.
 */
async function ensureMonthlyFeeProduct(stripe: Stripe): Promise<string> {
  const existing = await stripe.products.search({
    query: `name:'${MONTHLY_FEE_PRODUCT_NAME}' AND active:true`,
    limit: 1,
  });

  const found = existing.data[0];
  if (found) {
    return found.id;
  }

  const product = await stripe.products.create({
    name: MONTHLY_FEE_PRODUCT_NAME,
    metadata: { purpose: 'monthly_fee_autodebit' },
  });

  return product.id;
}

export interface CreateStripeSubscriptionInput {
  /** Per-institution secret key resolved from the institution's SiteConfig. */
  secretKey: string;
  memberEmail: string;
  /** Monthly ARS amount. */
  amount: number;
  /** Institution slug carried in metadata for webhook institution resolution. */
  clubSlug: string;
  memberId: string;
  /** Where the member returns after managing the subscription in the portal. */
  returnUrl: string;
}

export async function createStripeSubscription(
  input: CreateStripeSubscriptionInput
): Promise<{
  subscriptionId: string;
  customerId: string;
  customerPortalUrl: string | null;
}> {
  const stripe = createStripeClient(input.secretKey);

  const customers = await stripe.customers.list({ email: input.memberEmail, limit: 1 });
  let customer = customers.data[0];

  if (!customer) {
    customer = await stripe.customers.create({
      email: input.memberEmail,
      metadata: { clubSlug: input.clubSlug, memberId: input.memberId },
    });
  }

  const productId = await ensureMonthlyFeeProduct(stripe);

  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [
      {
        price_data: {
          currency: 'ars',
          product: productId,
          unit_amount: Math.round(input.amount * 100),
          recurring: { interval: 'month' },
        },
      },
    ],
    metadata: { clubSlug: input.clubSlug, memberId: input.memberId },
  });

  let customerPortalUrl: string | null = null;
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: input.returnUrl,
    });
    customerPortalUrl = session.url;
  } catch {
    // The billing portal may be disabled for this Stripe account; the
    // subscription is already active so we degrade to a null management URL.
  }

  return {
    subscriptionId: subscription.id,
    customerId: customer.id,
    customerPortalUrl,
  };
}

export async function cancelStripeSubscription(
  subscriptionId: string,
  secretKey: string
): Promise<void> {
  const stripe = createStripeClient(secretKey);
  await stripe.subscriptions.cancel(subscriptionId);
}

/**
 * Extracts the subscription ID from an Invoice across API payload shapes:
 * the dahlia+ payloads nest it under `parent.subscription_details`, while
 * older webhook payloads carry a top-level `subscription` field.
 */
export function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const nested = invoice.parent?.subscription_details?.subscription;
  if (nested) {
    return typeof nested === 'string' ? nested : nested.id;
  }

  const legacy = (invoice as { subscription?: string | { id: string } | null }).subscription;
  if (legacy) {
    return typeof legacy === 'string' ? legacy : legacy.id;
  }

  return null;
}

/**
 * Extracts the PaymentIntent ID from an Invoice across API payload shapes:
 * dahlia+ payloads surface it through `payments[]`, older payloads carry a
 * top-level `payment_intent` field.
 */
export function getInvoicePaymentIntentId(invoice: Stripe.Invoice): string | null {
  for (const payment of invoice.payments?.data ?? []) {
    const paymentIntent = payment.payment?.payment_intent;
    if (paymentIntent) {
      return typeof paymentIntent === 'string' ? paymentIntent : paymentIntent.id;
    }
  }

  const legacy = (invoice as { payment_intent?: string | { id: string } | null })
    .payment_intent;
  if (legacy) {
    return typeof legacy === 'string' ? legacy : legacy.id;
  }

  return null;
}
