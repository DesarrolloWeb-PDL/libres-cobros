import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Download, Receipt, User } from 'lucide-react';
import { prisma } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { MemberNav } from '@/components/member/MemberNav';

interface MemberPaymentsPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export const dynamic = 'force-dynamic';

const monthLabels: Record<number, string> = {
  1: 'Enero',
  2: 'Febrero',
  3: 'Marzo',
  4: 'Abril',
  5: 'Mayo',
  6: 'Junio',
  7: 'Julio',
  8: 'Agosto',
  9: 'Septiembre',
  10: 'Octubre',
  11: 'Noviembre',
  12: 'Diciembre',
};

const methodLabels: Record<string, string> = {
  stripe: 'Stripe',
  mercadopago: 'Mercado Pago',
  bank_transfer: 'Transferencia bancaria',
};

const currencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
});

const dateFormatter = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export default async function MemberPaymentsPage({
  params,
  searchParams,
}: MemberPaymentsPageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const dni = typeof sp.dni === 'string' ? sp.dni : undefined;

  const club = await prisma.club.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      logoUrl: true,
      primaryColor: true,
      secondaryColor: true,
      accentColor: true,
    },
  });

  if (!club || club.status !== 'ACTIVE') {
    notFound();
  }

  let member: { firstName: string; lastName: string; dni: string } | null = null;
  let payments: Array<{
    id: string;
    amount: number;
    method: string;
    status: string;
    confirmedAt: Date | null;
    createdAt: Date;
    fee: { month: number; year: number };
  }> = [];

  if (dni) {
    const foundMember = await prisma.member.findUnique({
      where: { clubId_dni: { clubId: club.id, dni } },
      select: { id: true, firstName: true, lastName: true, dni: true },
    });

    if (foundMember) {
      member = foundMember;
      payments = await prisma.payment.findMany({
        where: { memberId: foundMember.id },
        include: {
          fee: { select: { month: true, year: true } },
        },
        orderBy: [{ createdAt: 'desc' }],
      });
    }
  }

  return (
    <div
      className="flex min-h-full flex-col"
      style={{
        '--club-primary': club.primaryColor,
        '--club-secondary': club.secondaryColor,
        '--club-accent': club.accentColor,
      } as React.CSSProperties}
    >
      <MemberNav
        institutionName={club.name}
        institutionSlug={club.slug}
        institutionLogo={club.logoUrl}
        primaryColor={club.primaryColor}
      />

      <main className="flex-1 px-4 py-10">
        <div className="container mx-auto max-w-2xl">
          <div className="mb-6 flex items-center gap-3">
            <Link href={`/pagos/${slug}`}>
              <Button variant="ghost" size="icon" aria-label="Volver al portal">
                <ArrowLeft className="size-5" />
              </Button>
            </Link>
            <div>
              <p className="font-mono text-xs tracking-[0.2em] uppercase text-accent">Pagos</p>
              <h1 className="text-2xl font-bold">Historial de pagos</h1>
            </div>
          </div>

          {!dni && (
            <div className="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
              <Receipt className="mx-auto mb-4 size-10 text-muted-foreground/50" />
              <h2 className="mb-2 text-lg font-semibold">Consultá tus pagos</h2>
              <p className="mb-6 text-sm text-muted-foreground">
                Volvé al portal de pagos, ingresá tu DNI y accedé a tu historial de pagos.
              </p>
              <Link href={`/pagos/${slug}`}>
                <Button>
                  <ArrowLeft className="mr-2 size-4" />
                  Volver al portal
                </Button>
              </Link>
            </div>
          )}

          {dni && !member && (
            <div className="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
              <User className="mx-auto mb-4 size-10 text-muted-foreground/50" />
              <h2 className="mb-2 text-lg font-semibold">Socio no encontrado</h2>
              <p className="mb-6 text-sm text-muted-foreground">
                No encontramos un socio con el DNI <strong>{dni}</strong> en {club.name}.
              </p>
              <Link href={`/pagos/${slug}`}>
                <Button variant="outline">
                  <ArrowLeft className="mr-2 size-4" />
                  Volver al portal
                </Button>
              </Link>
            </div>
          )}

          {member && (
            <>
              <div className="mb-6 flex items-center gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <User className="size-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">
                    {member.firstName} {member.lastName}
                  </h2>
                  <p className="text-sm text-muted-foreground">DNI {member.dni}</p>
                </div>
              </div>

              {payments.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-muted/20 p-10 text-center">
                  <Receipt className="mx-auto mb-3 size-10 text-muted-foreground/50" />
                  <p className="font-semibold mb-1">No encontramos pagos</p>
                  <p className="text-sm text-muted-foreground">
                    Tu cuenta no tiene pagos registrados por el momento.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Receipt className="size-4 text-accent" />
                          <span className="font-semibold">
                            {monthLabels[payment.fee.month]} {payment.fee.year}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {methodLabels[payment.method] ?? payment.method} ·{' '}
                          {payment.confirmedAt
                            ? dateFormatter.format(payment.confirmedAt)
                            : dateFormatter.format(payment.createdAt)}
                        </p>
                        <p className="text-lg font-bold text-accent">
                          {currencyFormatter.format(payment.amount)}
                        </p>
                      </div>
                      <Link href={`/pagos/${slug}/ticket/${payment.id}`} className="shrink-0">
                        <Button variant="outline" className="w-full sm:w-auto">
                          <Download className="mr-2 size-4" />
                          Descargar comprobante
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <footer className="border-t bg-muted/20 py-5 text-center text-xs text-muted-foreground mt-auto">
        <div className="container mx-auto px-4">
          <p className="font-medium">{club.name} — Sistema de cobros</p>
          <p className="mt-1">Ante cualquier duda, contactate con administración.</p>
        </div>
      </footer>
    </div>
  );
}
