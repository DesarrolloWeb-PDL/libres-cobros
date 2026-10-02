import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import QRCode from 'qrcode';
import { prisma } from '@/lib/db';
import { TicketPDF } from '@/components/member/TicketPDF';
import { TicketActions } from '@/components/member/TicketActions';

interface TicketPageProps {
  params: Promise<{ slug: string; paymentId: string }>;
}

export const dynamic = 'force-dynamic';

function mapPaymentStatusToQuery(status: string): string {
  switch (status) {
    case 'PAID':
      return 'success';
    case 'FAILED':
      return 'failure';
    case 'PENDING':
      return 'pending';
    case 'REFUNDED':
      return 'cancelled';
    default:
      return 'pending';
  }
}

function resolveReferenceNumber(payment: {
  method: string;
  bankTransferRef: string | null;
  stripePaymentId: string | null;
  mercadopagoPaymentId: string | null;
}): string | null {
  if (payment.method === 'bank_transfer') {
    return payment.bankTransferRef;
  }
  if (payment.method === 'stripe') {
    return payment.stripePaymentId;
  }
  if (payment.method === 'mercadopago') {
    return payment.mercadopagoPaymentId;
  }
  return null;
}

export default async function TicketPage({ params }: TicketPageProps) {
  const { slug, paymentId } = await params;

  const club = await prisma.club.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      logoUrl: true,
      primaryColor: true,
    },
  });

  if (!club || club.status !== 'ACTIVE') {
    notFound();
  }

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      member: {
        select: { firstName: true, lastName: true, dni: true },
      },
      fee: {
        select: { month: true, year: true, plan: { select: { name: true } } },
      },
    },
  });

  if (!payment || payment.clubId !== club.id) {
    notFound();
  }

  const headersList = await headers();
  const host = headersList.get('host') ?? 'localhost';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;

  const statusQuery = mapPaymentStatusToQuery(payment.status);
  const confirmationUrl = `${baseUrl}/pagos/${slug}/confirmacion?payment_id=${payment.id}&provider=${encodeURIComponent(payment.method)}&status=${statusQuery}`;

  const qrDataUrl = await QRCode.toDataURL(confirmationUrl, {
    width: 240,
    margin: 2,
    errorCorrectionLevel: 'M',
  });

  return (
    <div className="min-h-screen bg-background py-8 print:bg-white print:py-0">
      <main className="container mx-auto px-4">
        <TicketPDF
          institution={{
            name: club.name,
            logoUrl: club.logoUrl,
            primaryColor: club.primaryColor,
          }}
          member={payment.member}
          payment={{
            id: payment.id,
            amount: payment.amount,
            method: payment.method,
            createdAt: payment.createdAt.toISOString(),
            confirmedAt: payment.confirmedAt?.toISOString() ?? null,
            referenceNumber: resolveReferenceNumber(payment),
          }}
          fee={{
            month: payment.fee.month,
            year: payment.fee.year,
            planName: payment.fee.plan.name,
          }}
          confirmationUrl={confirmationUrl}
          qrDataUrl={qrDataUrl}
        />
        <TicketActions />
      </main>
    </div>
  );
}
