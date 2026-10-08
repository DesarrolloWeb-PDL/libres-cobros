import Link from 'next/link';
import {
  UserPlus,
  ShieldCheck,
  Settings,
  Wallet,
  CreditCard,
  Ticket,
  BellRing,
  BarChart3,
  Building2,
  Percent,
  ArrowRight,
} from 'lucide-react';
import { RegistrationForm } from '@/components/auth/RegistrationForm';
import { Logo } from '@/components/Logo';

export const metadata = {
  title: 'Crear cuenta - Libres Cobros',
  description: 'Registrá tu club y empezá a gestionar tus cobros.',
};

const steps = [
  {
    icon: UserPlus,
    title: 'Registrá el club',
    description: 'Completá los datos de tu institución y del administrador.',
  },
  {
    icon: ShieldCheck,
    title: 'Aprobamos tu registro',
    description: 'El equipo de Libres Cobros revisa y aprueba tu registro.',
  },
  {
    icon: Settings,
    title: 'Configurá tu institución',
    description: 'Cargá socios, planes, datos bancarios y métodos de pago.',
  },
  {
    icon: Wallet,
    title: 'Generá cuotas y cobrá',
    description: 'Creá las cuotas mensuales y cobrá online desde el portal.',
  },
];

const benefits = [
  {
    icon: CreditCard,
    title: 'Pagos online',
    description: 'Cobrá por Stripe, Mercado Pago o transferencia bancaria.',
  },
  {
    icon: Ticket,
    title: 'Tickets y comprobantes',
    description: 'Cada pago genera un comprobante verificable.',
  },
  {
    icon: BellRing,
    title: 'Recordatorios',
    description: 'Avisá a tus socios las cuotas pendientes.',
  },
  {
    icon: BarChart3,
    title: 'Reportes',
    description: 'Seguimiento de pagos, deudas y comisiones.',
  },
  {
    icon: Building2,
    title: 'Multi-institución',
    description: 'Gestioná varias instituciones desde un solo panel.',
  },
];

export default function RegisterPage() {
  return (
    <div className="flex min-h-full flex-col">
      {/* Hero */}
      <header className="relative flex flex-col items-center justify-center px-6 pt-16 pb-14 text-center">
        <Link href="/">
          <Logo size={140} showScroll={false} />
        </Link>
        <p className="text-accent font-mono text-xs tracking-[0.2em] uppercase mb-4 mt-6">
          Libres Cobros
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
          Registrá tu club
        </h1>
        <p className="max-w-xl text-muted-foreground leading-relaxed mb-6">
          Empezá a gestionar socios, cuotas y cobros en minutos. Sin instalaciones, sin costos
          fijos: cobrá online y controlá todo desde un solo lugar.
        </p>
        <a
          href="#registro"
          className="inline-flex items-center gap-2 px-8 py-3 rounded-lg bg-accent text-white font-medium hover:bg-accent/90 transition-colors"
        >
          Empezar ahora
          <ArrowRight className="size-4" />
        </a>
      </header>

      {/* Cómo funciona */}
      <section className="py-16 px-6 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-accent font-mono text-xs tracking-[0.2em] uppercase mb-3">
              Cómo funciona
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold">Empezar es simple</h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="relative">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                      <Icon className="size-6 text-accent" />
                    </div>
                    <span className="font-mono text-sm text-muted-foreground">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Beneficios */}
      <section className="py-16 px-6 border-t border-border bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-accent font-mono text-xs tracking-[0.2em] uppercase mb-3">
              Beneficios
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold">Todo para cobrar en orden</h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {benefits.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <div
                  key={benefit.title}
                  className="p-6 rounded-xl border border-border bg-card"
                >
                  <div className="flex size-12 items-center justify-center rounded-lg bg-accent/10 mb-4">
                    <Icon className="size-6 text-accent" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {benefit.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Planes / costos */}
      <section className="py-16 px-6 border-t border-border">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-accent font-mono text-xs tracking-[0.2em] uppercase mb-3">
            Planes y costos
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            Sin costos fijos, sin sorpresas
          </h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed text-left sm:text-center">
            <p>
              Cada institución configura y administra sus propias cuotas de socios dentro del
              panel: vos decidís los importes y las categorías.
            </p>
            <p>
              Libres Cobros cobra una <strong className="text-foreground">comisión por cada pago
              procesado</strong>. Cada institución define el tipo de comisión (porcentual o fija)
              desde su panel de administración.
            </p>
            <p className="flex items-center justify-center gap-2 sm:justify-center">
              <Percent className="size-4 text-accent shrink-0" />
              Sin cuotas mensuales de plataforma y sin costos ocultos: solo pagás cuando cobrás.
            </p>
          </div>
        </div>
      </section>

      {/* Registro */}
      <section id="registro" className="py-16 px-6 border-t border-border bg-muted/30 scroll-mt-16">
        <div className="max-w-md mx-auto space-y-6">
          <div className="text-center">
            <p className="text-accent font-mono text-xs tracking-[0.2em] uppercase mb-3">
              Registro
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">Creá tu cuenta</h2>
            <p className="text-sm text-muted-foreground">
              Tu registro queda pendiente de aprobación por el equipo de Libres Cobros.
            </p>
          </div>

          <RegistrationForm />

          <p className="text-center text-sm text-muted-foreground">
            ¿Ya tenés una cuenta?{' '}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Iniciar sesión
            </Link>
          </p>
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
