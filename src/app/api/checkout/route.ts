import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { createStripeCheckoutSession } from '@/lib/stripe';
import { createMercadoPagoPreference } from '@/lib/mercadopago';
import { getClubSiteConfigValues } from '@/lib/site-config';
import { getEffectiveClub } from '@/lib/access';
import { CheckoutRequestSchema } from '@/types/checkout';

interface PaymentMethodAvailability {
  stripe: boolean;
  mercadopago: boolean;
  bank_transfer: boolean;
}

function isPaymentMethodEnabled(value: string | undefined): boolean {
  return value !== 'false';
}

/**
 * Public member-portal endpoint: reports which payment methods an institution
 * has actually configured, so the UI only offers methods that can succeed.
 * Identified by clubSlug (or clubId) like the other member-facing routes.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const clubSlug = searchParams.get('clubSlug') ?? searchParams.get('slug');
    const clubId = searchParams.get('clubId');

    if (!clubSlug && !clubId) {
      return apiError(
        'Datos inválidos',
        400,
        'Se requiere clubSlug o clubId',
        'VALIDATION_ERROR'
      );
    }

    // Only ACTIVE institutions are payable; mirror the checkout POST rule.
    const club = clubId
      ? await prisma.club.findFirst({ where: { id: clubId, status: 'ACTIVE' } })
      : await getEffectiveClub(clubSlug!);

    if (!club) {
      return apiError(
        'Institución no encontrada',
        404,
        'Identificador de institución inválido o inactivo',
        'INSTITUTION_NOT_FOUND'
      );
    }

    const configs = await getClubSiteConfigValues(club.id, [
      'stripe_secret_key',
      'stripe_enabled',
      'mercadopago_access_token',
      'mercadopago_enabled',
      'bank_alias',
      'bank_cbu',
      'bank_transfer_enabled',
    ]);

    const availability: PaymentMethodAvailability = {
      stripe: Boolean(configs.stripe_secret_key) && isPaymentMethodEnabled(configs.stripe_enabled),
      mercadopago: Boolean(configs.mercadopago_access_token) && isPaymentMethodEnabled(configs.mercadopago_enabled),
      bank_transfer: Boolean(configs.bank_alias || configs.bank_cbu) && isPaymentMethodEnabled(configs.bank_transfer_enabled),
    };

    return apiSuccess({ data: availability });
  } catch (error) {
    return apiDbError(error, 'Error al consultar los medios de pago');
  }
}

function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_URL ?? 'http://localhost:3000';
}

function generateBankTransferRef(): string {
  return `TR-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

async function getBankTransferInfo(clubId: string) {
  const keys = [
    'bank_alias',
    'bank_cbu',
    'bank_cuit',
    'bank_name',
    'bank_holder',
  ];

  const values = await getClubSiteConfigValues(clubId, keys);

  return {
    alias: values.bank_alias ?? '',
    cbu: values.bank_cbu ?? '',
    cuit: values.bank_cuit ?? '',
    bankName: values.bank_name ?? '',
    accountHolder: values.bank_holder ?? '',
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CheckoutRequestSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        'Datos inválidos',
        400,
        parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        'VALIDATION_ERROR'
      );
    }

    const { feeId, method, memberDni, institutionSlug } = parsed.data;

    // Resolve the institution that owns the checkout; only ACTIVE institutions are payable.
    const club = await getEffectiveClub(institutionSlug);

    if (!club) {
      return apiError('Institución no encontrada', 404, 'Institution slug inválido o inactivo', 'INSTITUTION_NOT_FOUND');
    }

    // Member must belong to this institution. A DNI registered in another institution is
    // indistinguishable from an unknown DNI (404, never revealed).
    const member = await prisma.member.findUnique({
      where: { clubId_dni: { clubId: club.id, dni: memberDni } },
    });

    if (!member) {
      return apiError('Socio no encontrado', 404,         'DNI inválido para esta institución', 'MEMBER_NOT_FOUND');
    }

    const fee = await prisma.fee.findUnique({
      where: { id: feeId },
      include: { member: true },
    });

    if (!fee) {
      return apiError('Cuota no encontrada', 404, 'Fee ID inválido', 'FEE_NOT_FOUND');
    }

    if (fee.clubId !== club.id) {
      return apiError(
        'La cuota pertenece a otra institución',
        409,
        'Cross-institution fee checkout rejected',
        'FEE_INSTITUTION_MISMATCH'
      );
    }

    if (fee.memberId !== member.id) {
      return apiError(
        'La cuota no corresponde al socio',
        409,
        'Member mismatch',
        'FEE_MEMBER_MISMATCH'
      );
    }

    if (fee.status === 'PAID') {
      return apiError('La cuota ya está pagada', 409, 'Fee already paid', 'FEE_ALREADY_PAID');
    }

    // Validate gateway credentials and enabled flags BEFORE creating the Payment row:
    // a misconfigured or disabled method must not leave orphan PENDING payments.
    let stripeSecretKey: string | null = null;
    let mercadoPagoAccessToken: string | null = null;

    if (method === 'stripe') {
      const { stripe_secret_key: secretKey, stripe_enabled: enabled } = await getClubSiteConfigValues(club.id, [
        'stripe_secret_key',
        'stripe_enabled',
      ]);

      if (!isPaymentMethodEnabled(enabled)) {
        return apiError(
          'Stripe no está habilitado para esta institución',
          403,
          'stripe_enabled está desactivado',
          'PAYMENT_METHOD_DISABLED'
        );
      }

      if (!secretKey) {
        return apiError(
          'Stripe no configurado para esta institución',
          500,
          'stripe_secret_key no configurado',
          'STRIPE_NOT_CONFIGURED'
        );
      }

      stripeSecretKey = secretKey;
    }

    if (method === 'mercadopago') {
      const { mercadopago_access_token: accessToken, mercadopago_enabled: enabled } = await getClubSiteConfigValues(club.id, [
        'mercadopago_access_token',
        'mercadopago_enabled',
      ]);

      if (!isPaymentMethodEnabled(enabled)) {
        return apiError(
          'Mercado Pago no está habilitado para esta institución',
          403,
          'mercadopago_enabled está desactivado',
          'PAYMENT_METHOD_DISABLED'
        );
      }

      if (!accessToken) {
        return apiError(
          'MercadoPago no configurado para esta institución',
          500,
          'mercadopago_access_token no configurado',
          'MERCADOPAGO_NOT_CONFIGURED'
        );
      }

      mercadoPagoAccessToken = accessToken;
    }

    if (method === 'bank_transfer') {
      const { bank_alias: alias, bank_cbu: cbu, bank_transfer_enabled: enabled } = await getClubSiteConfigValues(club.id, [
        'bank_alias',
        'bank_cbu',
        'bank_transfer_enabled',
      ]);

      if (!isPaymentMethodEnabled(enabled)) {
        return apiError(
          'La transferencia bancaria no está habilitada para esta institución',
          403,
          'bank_transfer_enabled está desactivado',
          'PAYMENT_METHOD_DISABLED'
        );
      }

      if (!alias && !cbu) {
        return apiError(
          'Transferencia bancaria no configurada para esta institución',
          500,
          'bank_alias y bank_cbu no configurados',
          'BANK_TRANSFER_NOT_CONFIGURED'
        );
      }
    }

    const payment = await prisma.payment.create({
      data: {
        clubId: club.id,
        feeId,
        memberId: member.id,
        amount: fee.amount,
        method,
        status: 'PENDING',
        ...(method === 'bank_transfer' && { bankTransferRef: generateBankTransferRef() }),
      },
    });

    const baseUrl = getSiteUrl();
    const confirmUrl = `${baseUrl}/pagos/${club.slug}/confirmacion`;
    const successUrl = `${confirmUrl}?payment_id=${payment.id}&provider=${method}&status=success`;
    const cancelUrl = `${confirmUrl}?payment_id=${payment.id}&provider=${method}&status=cancelled`;
    const failureUrl = `${confirmUrl}?payment_id=${payment.id}&provider=${method}&status=failure`;
    const pendingUrl = `${confirmUrl}?payment_id=${payment.id}&provider=${method}&status=pending`;

    // The gateways reference payment.id (metadata / external_reference), so the
    // row must exist before the call. If the call fails, delete it so no orphan
    // PENDING payment is left behind.
    try {
      if (method === 'stripe') {
        const session = await createStripeCheckoutSession({
          paymentId: payment.id,
          feeId,
          memberId: member.id,
          amount: fee.amount,
          clubSlug: club.slug,
          secretKey: stripeSecretKey!,
          successUrl,
          cancelUrl,
        });

        await prisma.payment.update({
          where: { id: payment.id },
          data: { stripeSessionId: session.sessionId },
        });

        return apiSuccess({
          paymentId: payment.id,
          checkoutUrl: session.url,
          method,
        });
      }

      if (method === 'mercadopago') {
        const notificationUrl = `${baseUrl}/api/webhooks/mercadopago?club_slug=${club.slug}`;
        const preference = await createMercadoPagoPreference({
          paymentId: payment.id,
          feeId,
          amount: fee.amount,
          memberName: `${member.firstName} ${member.lastName}`,
          clubSlug: club.slug,
          accessToken: mercadoPagoAccessToken!,
          successUrl,
          failureUrl,
          pendingUrl,
          notificationUrl,
        });

        await prisma.payment.update({
          where: { id: payment.id },
          data: { mercadopagoPreferenceId: preference.preferenceId },
        });

        return apiSuccess({
          paymentId: payment.id,
          checkoutUrl: preference.initPoint,
          method,
        });
      }

      const bankTransfer = await getBankTransferInfo(club.id);

      return apiSuccess({
        paymentId: payment.id,
        method,
        bankTransfer: {
          ...bankTransfer,
          reference: payment.bankTransferRef ?? '',
        },
      });
    } catch (error) {
      await prisma.payment
        .delete({ where: { id: payment.id } })
        .catch(() => undefined); // best-effort cleanup; surface the original error
      throw error;
    }
  } catch (error) {
    return apiDbError(error, 'Error al procesar el checkout');
  }
}
