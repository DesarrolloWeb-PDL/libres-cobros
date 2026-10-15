import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { verifyMercadoPagoWebhook, getMercadoPagoPayment } from '@/lib/mercadopago';
import { confirmPayment } from '@/lib/payments';
import { settleAutoDebitCharge, advanceAutoDebitBilling } from '@/lib/autodebit';
import { getClubSiteConfigValue } from '@/lib/site-config';

export async function POST(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get('club_slug');

    // IPN notifications carry `?club_slug=` (set on the preference
    // notification_url at checkout). Without it the institution cannot be identified
    // and the signature cannot be verified against the right secret.
    if (!slug) {
      return apiError(
        'Institución no identificada',
        401,
        'Falta el parámetro club_slug',
        'UNKNOWN_CLUB'
      );
    }

    const club = await prisma.club.findUnique({ where: { slug } });

    if (!club) {
      return apiError('Institución desconocida', 401, 'club_slug desconocido', 'UNKNOWN_INSTITUTION');
    }

    const [clientSecret, accessToken] = await Promise.all([
      getClubSiteConfigValue(club.id, 'mercadopago_client_secret'),
      getClubSiteConfigValue(club.id, 'mercadopago_access_token'),
    ]);

    if (!clientSecret || !accessToken) {
      return apiError(
        'MercadoPago no configurado para esta institución',
        401,
        'mercadopago_client_secret o mercadopago_access_token no configurado',
        'MERCADOPAGO_NOT_CONFIGURED'
      );
    }

    const xSignature = request.headers.get('x-signature');
    const xRequestId = request.headers.get('x-request-id');
    const { searchParams } = request.nextUrl;
    const dataId = searchParams.get('data.id') ?? searchParams.get('id');

    verifyMercadoPagoWebhook(
      {
        xSignature,
        xRequestId,
        dataId,
      },
      clientSecret
    );

    if (!dataId) {
      return apiError('ID de pago no recibido', 400, 'data.id is required', 'MISSING_PAYMENT_ID');
    }

    const mpPayment = await getMercadoPagoPayment(dataId, accessToken);

    // Preapproval (auto-debit) charge: identified by the payment's preapproval_id
    // rather than by fee metadata. Handled before the one-off payment matching
    // because preapproval charges carry no preference reference.
    if (mpPayment.preapprovalId) {
      const autoDebit = await prisma.autoDebit.findUnique({
        where: {
          gateway_gatewaySubscriptionId: {
            gateway: 'mercadopago',
            gatewaySubscriptionId: mpPayment.preapprovalId,
          },
        },
      });

      if (!autoDebit) {
        return apiSuccess({ received: true, action: 'autodebit_not_found' });
      }

      if (mpPayment.status === 'approved') {
        // The first approved charge also confirms the preapproval authorization,
        // so promote PENDING_AUTH subscriptions to ACTIVE.
        if (autoDebit.status === 'PENDING_AUTH') {
          await prisma.autoDebit.update({
            where: { id: autoDebit.id },
            data: { status: 'ACTIVE' },
          });
        }

        const result = await settleAutoDebitCharge({
          clubId: club.id,
          autoDebitId: autoDebit.id,
          memberId: autoDebit.memberId,
          amount: mpPayment.transactionAmount ?? autoDebit.amount,
          method: 'mercadopago',
          confirmOptions: { mercadopagoPaymentId: mpPayment.id },
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

      if (mpPayment.status === 'rejected' || mpPayment.status === 'cancelled') {
        await prisma.autoDebit.update({
          where: { id: autoDebit.id },
          data: { status: 'FAILED' },
        });
        return apiSuccess({ received: true, action: 'autodebit_failed' });
      }

      return apiSuccess({ received: true, status: mpPayment.status, action: 'ignored' });
    }

    const findPayment = () =>
      prisma.payment.findFirst({
        where: {
          clubId: club.id,
          OR: [
            // The payment resource's external_reference carries the feeId
            // (see createMercadoPagoPreference), so match on it first; the
            // preference ID branch remains for preferences that echo it.
            ...(mpPayment.externalReference
              ? [
                  { feeId: mpPayment.externalReference },
                  { mercadopagoPreferenceId: mpPayment.externalReference },
                ]
              : []),
            ...(mpPayment.metadata?.paymentId
              ? [{ id: String(mpPayment.metadata.paymentId) }]
              : []),
          ],
        },
      });

    // Handle rejected/cancelled payments
    if (mpPayment.status === 'rejected' || mpPayment.status === 'cancelled') {
      const payment = await findPayment();

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

      return apiSuccess({
        received: true,
        status: mpPayment.status,
        action: 'marked_failed',
      });
    }

    if (mpPayment.status !== 'approved') {
      return apiSuccess({
        received: true,
        status: mpPayment.status,
        action: 'ignored',
      });
    }

    const payment = await findPayment();

    if (!payment) {
      return apiError('Pago no encontrado', 404, 'MercadoPago payment no vinculado', 'PAYMENT_NOT_FOUND');
    }

    const result = await confirmPayment(payment.id, {
      mercadopagoPaymentId: mpPayment.id,
    });

    return apiSuccess({ received: true, status: result.status });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('signature') || error.message.includes('Signature'))
    ) {
      return apiError('Firma inválida', 401, error.message, 'INVALID_SIGNATURE');
    }
    return apiDbError(error, 'Error al procesar webhook de MercadoPago');
  }
}
