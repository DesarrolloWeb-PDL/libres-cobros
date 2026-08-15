import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { createStripeCheckoutSession } from '@/lib/stripe';
import { createMercadoPagoPreference } from '@/lib/mercadopago';
import { CheckoutRequestSchema } from '@/types/checkout';

function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_URL ?? 'http://localhost:3000';
}

function generateBankTransferRef(): string {
  return `TR-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

async function getBankTransferInfo() {
  const keys = [
    'bank_alias',
    'bank_cbu',
    'bank_cuit',
    'bank_name',
    'bank_account_holder',
  ];

  const configs = await prisma.siteConfig.findMany({
    where: { key: { in: keys } },
  });

  const values = Object.fromEntries(configs.map((c) => [c.key, c.value]));

  return {
    alias: values.bank_alias ?? '',
    cbu: values.bank_cbu ?? '',
    cuit: values.bank_cuit ?? '',
    bankName: values.bank_name ?? '',
    accountHolder: values.bank_account_holder ?? '',
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

    const { feeId, method, memberDni } = parsed.data;

    const member = await prisma.member.findUnique({
      where: { dni: memberDni },
    });

    if (!member) {
      return apiError('Socio no encontrado', 404, 'DNI inválido', 'MEMBER_NOT_FOUND');
    }

    const fee = await prisma.fee.findUnique({
      where: { id: feeId },
      include: { member: true },
    });

    if (!fee) {
      return apiError('Cuota no encontrada', 404, 'Fee ID inválido', 'FEE_NOT_FOUND');
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
        feeId,
        memberId: member.id,
        amount: fee.amount,
        method,
        status: 'PENDING',
        ...(method === 'bank_transfer' && { bankTransferRef: generateBankTransferRef() }),
      },
    });

    const baseUrl = getSiteUrl();
    const successUrl = `${baseUrl}/pagos/confirmacion?payment_id=${payment.id}&provider=${method}&status=success`;
    const cancelUrl = `${baseUrl}/pagos/confirmacion?payment_id=${payment.id}&provider=${method}&status=cancelled`;
    const failureUrl = `${baseUrl}/pagos/confirmacion?payment_id=${payment.id}&provider=${method}&status=failure`;
    const pendingUrl = `${baseUrl}/pagos/confirmacion?payment_id=${payment.id}&provider=${method}&status=pending`;

    if (method === 'stripe') {
      const session = await createStripeCheckoutSession({
        paymentId: payment.id,
        feeId,
        memberId: member.id,
        amount: fee.amount,
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
      const notificationUrl = `${baseUrl}/api/webhooks/mercadopago`;
      const preference = await createMercadoPagoPreference({
        paymentId: payment.id,
        feeId,
        amount: fee.amount,
        memberName: `${member.firstName} ${member.lastName}`,
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

    const bankTransfer = await getBankTransferInfo();

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
