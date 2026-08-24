import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { prisma } from '@/lib/db';
import { PaymentConfirmation } from '@/components/member/PaymentConfirmation';
import { Button } from '@/components/ui/button';

interface ConfirmationPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export const dynamic = 'force-dynamic';

export default async function ClubPaymentConfirmationPage({ params, searchParams }: ConfirmationPageProps) {
  const { slug } = await params;
  const sp = await searchParams;

  const club = await prisma.club.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, status: true },
  });

  if (!club || club.status !== 'ACTIVE') {
    notFound();
  }

  const paymentId = typeof sp.payment_id === 'string' ? sp.payment_id : undefined;
  const provider = typeof sp.provider === 'string' ? sp.provider : '';
  const status = typeof sp.status === 'string' ? sp.status : '';

  if (!paymentId) {
    return (
      <div className="flex min-h-full flex-col">
        <main className="flex-1 px-4 py-8">
          <PaymentConfirmation
            status="failure"
            provider={provider}
            payment={null}
          />
          <div className="mt-4 text-center">
            <Link href={`/pagos/${slug}`}>
              <Button variant="outline">
                <ArrowLeft className="mr-2 size-4" />
                Volver al portal
              </Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      fee: { select: { month: true, year: true, clubId: true } },
    },
  });

  if (!payment || payment.fee.clubId !== club.id) {
    notFound();
  }

  return (
    <div className="flex min-h-full flex-col">
      <main className="flex-1 px-4 py-8">
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
                  fee: { month: payment.fee.month, year: payment.fee.year },
                }
              : null
          }
        />
        <div className="mt-4 text-center">
          <Link href={`/pagos/${slug}`}>
            <Button variant="outline">
              <ArrowLeft className="mr-2 size-4" />
              Volver al portal
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
