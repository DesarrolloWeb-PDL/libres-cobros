import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { CreditCard, Ticket, BellRing, BarChart3 } from 'lucide-react';

const benefits = [
  {
    icon: CreditCard,
    title: 'Pagos online',
    description: 'Stripe, Mercado Pago y transferencia.',
  },
  {
    icon: Ticket,
    title: 'Comprobantes',
    description: 'Tickets y comprobantes al instante.',
  },
  {
    icon: BellRing,
    title: 'Recordatorios',
    description: 'Avisos de cuotas a tus socios.',
  },
  {
    icon: BarChart3,
    title: 'Reportes',
    description: 'Pagos, deudas y comisiones claros.',
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero */}
      <header className="relative flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
        <Logo size={240} showScroll={false} />
        <p className="text-accent font-mono text-xs tracking-[0.2em] uppercase mb-4 mt-6">
          Sistema de Administración
        </p>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-3">
          Libres Cobros
        </h1>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight mb-6 text-muted-foreground">
          Gestión integral de cobros
        </h2>
        <p className="max-w-lg text-muted-foreground leading-relaxed mb-8">
          Administra socios, cuotas, pagos y reportes de tu institución de forma simple y organizada.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-8 py-3 rounded-lg bg-accent text-white font-medium hover:bg-accent/90 transition-colors"
          >
            Iniciar Sesión
          </Link>
          <Link
            href="/registro"
            className="inline-flex items-center justify-center px-8 py-3 rounded-lg border border-border font-medium hover:bg-muted transition-colors"
          >
            Registrar club
          </Link>
        </div>
      </header>

      {/* Benefits strip */}
      <section className="py-16 px-6 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <div key={benefit.title} className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                    <Icon className="size-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-0.5">{benefit.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30 py-6 text-center text-xs text-muted-foreground mt-auto">
        <div className="container mx-auto px-4">
          <span>Libres Cobros — Sistema de administración de clubes</span>
        </div>
      </footer>
    </div>
  );
}
