import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Receipt, User, Wallet, History, CreditCard } from 'lucide-react';
import { prisma } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { MemberNav } from '@/components/member/MemberNav';
import { InstitutionThemeInjector } from '@/components/admin/InstitutionThemeInjector';

interface MemberAccountPageProps {
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
});

const feeStatusLabels: Record<string, string> = {
  PENDING: 'Pendiente',
  OVERDUE: 'Vencida',
  PAID: 'Pagada',
};

export default async function MemberAccountPage({ params, searchParams }: MemberAccountPageProps) {
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

  let member: { id: string; firstName: string; lastName: string; dni: string } | null = null;
  let fees: Array<{
    id: string;
    month: number;
    year: number;
    amount: number;
    status: string;
    dueDate: Date;
  }> = [];
  let payments: Array<{
    id: string;
    amount: number;
    method: string;
    status: string;
    confirmedAt: Date | null;
    createdAt: Date;
    fee: { month: number; year: number } | null;
  }> = [];

  if (dni) {
    const foundMember = await prisma.member.findUnique({
      where: { clubId_dni: { clubId: club.id, dni } },
      select: { id: true, firstName: true, lastName: true, dni: true },
    });

    if (foundMember) {
      member = foundMember;
      const rawFees = await prisma.fee.findMany({
        where: { memberId: foundMember.id },
        select: { id: true, month: true, year: true, amount: true, status: true, dueDate: true },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
      });
      fees = rawFees;

      const rawPayments = await prisma.payment.findMany({
        where: { memberId: foundMember.id, feeId: { not: null } },
        include: { fee: { select: { month: true, year: true } } },
        orderBy: [{ createdAt: 'desc' }],
      });
      payments = rawPayments.map((p) => ({
        id: p.id,
        amount: p.amount,
        method: p.method,
        status: p.status,
        confirmedAt: p.confirmedAt,
        createdAt: p.createdAt,
        fee: p.fee,
      }));
    }
  }

  const totalDebt = fees
    .filter((f) => f.status === 'PENDING' || f.status === 'OVERDUE')
    .reduce((sum, f) => sum + f.amount, 0);

  const paymentsMade = payments
    .filter((p) => p.status === 'PAID')
    .reduce((sum, p) => sum + p.amount, 0);

  const balance = totalDebt - paymentsMade;

  return (
    <div
      className="flex min-h-full flex-col"
      style={{
        '--club-primary': club.primaryColor,
        '--club-secondary': club.secondaryColor,
        '--club-accent': club.accentColor,
      } as React.CSSProperties}
    >
      <InstitutionThemeInjector primaryColor={club.primaryColor} />
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
              <p className="font-mono text-xs tracking-[0.2em] uppercase text-accent">Mi cuenta</p>
              <h1 className="text-2xl font-bold">Saldo y movimientos</h1>
            </div>
          </div>

          {!dni && (
            <div className="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
              <Wallet className="mx-auto mb-4 size-10 text-muted-foreground/50" />
              <h2 className="mb-2 text-lg font-semibold">Consultá tu cuenta</h2>
              <p className="mb-6 text-sm text-muted-foreground">
                Volvé al portal de pagos, ingresá tu DNI y accedé al resumen de tu cuenta.
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

              {/* Summary cards */}
              <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <p className="text-xs text-muted-foreground">Deuda total</p>
                  <p className="mt-1 text-lg font-bold text-destructive">
                    {currencyFormatter.format(totalDebt)}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <p className="text-xs text-muted-foreground">Pagos realizados</p>
                  <p className="mt-1 text-lg font-bold text-emerald-600">
                    {currencyFormatter.format(paymentsMade)}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <p className="text-xs text-muted-foreground">Saldo</p>
                  <p className="mt-1 text-lg font-bold text-accent">
                    {currencyFormatter.format(balance)}
                  </p>
                </div>
              </div>

              {/* Recent fees */}
              <section className="mb-6">
                <div className="mb-3 flex items-center gap-2">
                  <Receipt className="size-4 text-accent" />
                  <h2 className="font-semibold text-sm">Cuotas recientes</h2>
                </div>
                {fees.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center">
                    <p className="text-sm text-muted-foreground">No tenés cuotas registradas.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {fees.slice(0, 10).map((fee) => (
                      <div
                        key={fee.id}
                        className="flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-sm"
                      >
                        <div>
                          <p className="font-medium">
                            {monthLabels[fee.month]} {fee.year}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Vence {dateFormatter.format(new Date(fee.dueDate))}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{currencyFormatter.format(fee.amount)}</p>
                          <p className="text-xs text-muted-foreground">
                            {feeStatusLabels[fee.status] ?? fee.status}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Recent payments */}
              <section className="mb-6">
                <div className="mb-3 flex items-center gap-2">
                  <CreditCard className="size-4 text-accent" />
                  <h2 className="font-semibold text-sm">Pagos recientes</h2>
                </div>
                {payments.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center">
                    <p className="text-sm text-muted-foreground">No tenés pagos registrados.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {payments.slice(0, 10).map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-sm"
                      >
                        <div>
                          <p className="font-medium">
                            {payment.fee
                              ? `${monthLabels[payment.fee.month]} ${payment.fee.year}`
                              : 'Pago'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {methodLabels[payment.method] ?? payment.method} ·{' '}
                            {payment.confirmedAt
                              ? dateFormatter.format(new Date(payment.confirmedAt))
                              : dateFormatter.format(new Date(payment.createdAt))}
                          </p>
                        </div>
                        <p className="font-semibold text-accent">
                          {currencyFormatter.format(payment.amount)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <div className="flex flex-wrap gap-2 justify-center">
                <Link href={`/pagos/${slug}/pagos?dni=${encodeURIComponent(member.dni)}`}>
                  <Button variant="outline" size="sm" className="gap-2">
                    <History className="size-4" />
                    Ver historial de pagos
                  </Button>
                </Link>
                <Link href={`/pagos/${slug}`}>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <ArrowLeft className="size-4" />
                    Volver al portal
                  </Button>
                </Link>
              </div>
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