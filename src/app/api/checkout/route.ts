import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { createStripeCheckoutSession } from '@/lib/stripe';
import { createMercadoPagoPreference } from '@/lib/mercadopago';
import { getClubSiteConfigValues } from '@/lib/site-config';
import { getEffectiveClub } from '@/lib/access';
import { CheckoutRequestSchema } from '@/types/checkout';

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

    const { feeId, method, memberDni, clubSlug } = parsed.data;

    // Resolve the club that owns the checkout; only ACTIVE clubs are payable.
    const club = await getEffectiveClub(clubSlug);

    if (!club) {
      return apiError('Club no encontrado', 404, 'Club slug inválido o inactivo', 'CLUB_NOT_FOUND');
    }

    // Member must belong to this club. A DNI registered in another club is
    // indistinguishable from an unknown DNI (404, never revealed).
    const member = await prisma.member.findUnique({
      where: { clubId_dni: { clubId: club.id, dni: memberDni } },
    });

    if (!member) {
      return apiError('Socio no encontrado', 404, 'DNI inválido para este club', 'MEMBER_NOT_FOUND');
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
        'La cuota pertenece a otro club',
        409,
        'Cross-club fee checkout rejected',
        'FEE_CLUB_MISMATCH'
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

    if (method === 'stripe') {
      const { stripe_secret_key: secretKey } = await getClubSiteConfigValues(club.id, [
        'stripe_secret_key',
      ]);

      if (!secretKey) {
        return apiError(
          'Stripe no configurado para este club',
          500,
          'stripe_secret_key no configurado',
          'STRIPE_NOT_CONFIGURED'
        );
      }

      const session = await createStripeCheckoutSession({
        paymentId: payment.id,
        feeId,
        memberId: member.id,
        amount: fee.amount,
        clubSlug: club.slug,
        secretKey,
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
      const { mercadopago_access_token: accessToken } = await getClubSiteConfigValues(club.id, [
        'mercadopago_access_token',
      ]);

      if (!accessToken) {
        return apiError(
          'MercadoPago no configurado para este club',
          500,
          'mercadopago_access_token no configurado',
          'MERCADOPAGO_NOT_CONFIGURED'
        );
      }

      const notificationUrl = `${baseUrl}/api/webhooks/mercadopago?club_slug=${club.slug}`;
      const preference = await createMercadoPagoPreference({
        paymentId: payment.id,
        feeId,
        amount: fee.amount,
        memberName: `${member.firstName} ${member.lastName}`,
        clubSlug: club.slug,
        accessToken,
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
    return apiDbError(error, 'Error al procesar el checkout');
  }
}
