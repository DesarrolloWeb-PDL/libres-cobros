import { prisma } from '@/lib/db';
import { PaymentConfirmation } from '@/components/member/PaymentConfirmation';

interface ConfirmationPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function PaymentConfirmationPage({ searchParams }: ConfirmationPageProps) {
  const params = await searchParams;
  const paymentId = typeof params.payment_id === 'string' ? params.payment_id : undefined;
  const provider = typeof params.provider === 'string' ? params.provider : '';
  const status = typeof params.status === 'string' ? params.status : '';

  if (!paymentId) {
    return (
      <PaymentConfirmation
        status="failure"
        provider={provider}
        payment={null}
      />
    );
  }

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      fee: { select: { month: true, year: true } },
    },
  });

  return (
    <PaymentConfirmation
      status={status}
      provider={provider}
      payment={
        payment
          ? {
              id: payment.id,
              amount: payment.amount,
              method: payment.method,
              createdAt: payment.createdAt.toISOString(),
              confirmedAt: payment.confirmedAt?.toISOString() ?? null,
              fee: payment.fee,
            }
          : null
      }
    />
  );
}
