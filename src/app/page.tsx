import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { Footer } from '@/components/Footer';
import {
  ArrowRight,
  BellRing,
  Building2,
  CreditCard,
  Percent,
  Receipt,
  Settings,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react';

/* Marketing copy (Spanish, voseo) per replica/launch/landing.md — Angle A.
   Comparative claims are generic on purpose; approved wording lives in
   replica/launch/pricing.md (LEGAL REVIEW REQUIRED section). */

const problemCards = [
  {
    title: 'Un porcentaje que no siempre está a la vista',
    description:
      'En el mercado hay plataformas que cobran un porcentaje de todo lo que registrás en el sistema — incluso el efectivo que el tesorero carga a mano — y el porcentaje no siempre se publica. El costo del sistema sube cuando más crece la recaudación del club.',
  },
  {
    title: 'Ni una prueba si el club es chico',
    description:
      'Otras no te dejan empezar de a poco: desde el primer socio ya hay un mínimo fijo mensual. Para un club de barrio con 30 o 40 socios, eso puede ser una parte grande de lo que el club recauda por mes.',
  },
  {
    title: 'Un link de pago no alcanza',
    description:
      'Mandar el aviso y esperar no es un sistema de cobro. La mayoría de los socios no paga solo con el empujón del WhatsApp: hay que perseguir, recordar, insistir — y la morosidad se come el presupuesto del club.',
  },
];

const steps = [
  {
    icon: UserPlus,
    title: 'Registrá tu club',
    description: 'Completá los datos de tu institución. Revisamos el registro y te habilitamos el panel.',
  },
  {
    icon: Settings,
    title: 'Cargá el padrón y generá las cuotas',
    description: 'Importá tus socios desde Excel, definí los planes y generá las cuotas del mes en minutos.',
  },
  {
    icon: Wallet,
    title: 'Activá el débito automático y cobrá solo',
    description:
      'El socio autoriza una vez y la cuota se cobra sola todos los meses. Para el resto, links por WhatsApp, Mercado Pago, tarjeta y efectivo cargado a mano — todo en un solo lugar.',
  },
];

const features = [
  {
    icon: CreditCard,
    title: 'Débito automático: la cuota se cobra sola',
    description:
      'El socio autoriza una vez con Mercado Pago o Stripe y la cuota se cobra sola cada mes. Sin perseguir a nadie, sin depender de que alguien abra el link. Lo activás o desactivás desde el panel.',
  },
  {
    icon: Percent,
    title: 'Precio publicado, 0% sobre lo que recaudás',
    description:
      'Pagás un abono fijo por mes. No tomamos ningún porcentaje de lo que cobrás: ni de los pagos online, ni del efectivo que cargás a mano.',
  },
  {
    icon: Users,
    title: 'Gratis hasta 50 socios, para siempre',
    description:
      'Si tu club tiene hasta 50 socios, no pagás nada. No es una prueba: es gratis mientras tu club es chico.',
  },
  {
    icon: BellRing,
    title: 'Recordatorios por WhatsApp y email',
    description:
      'Avisá a tus socios las cuotas pendientes por WhatsApp y email, con plantillas que se personalizan solas.',
  },
  {
    icon: Receipt,
    title: 'Pagos online y comprobantes verificables',
    description:
      'Links de pago, transferencia y tarjeta. Cada cobro genera un comprobante con código QR que el socio puede verificar.',
  },
  {
    icon: Building2,
    title: 'Multi-institución',
    description:
      'Administrá varias instituciones desde un mismo panel, con su propio padrón, sus cuotas y sus reportes.',
  },
];

/* PRICING PROPOSAL: confirm before deploy — see replica/launch/pricing.md §3.
   Stripe products are not created yet and platform self-serve billing is not
   wired; until both are true, keep these numbers confirmed by the founder. */
const plans = [
  {
    name: 'Club de Barrio',
    audience: 'Hasta 50 socios',
    price: '$ 0',
    period: 'para siempre',
    highlight: false,
  },
  {
    name: 'Club en Crecimiento',
    audience: 'De 51 a 200 socios',
    price: '$ 35.000',
    period: 'por mes',
    highlight: true,
  },
  {
    name: 'Institución Grande',
    audience: 'De 201 a 800 socios',
    price: '$ 85.000',
    period: 'por mes',
    highlight: false,
  },
];

const faqs = [
  {
    question: '¿Cómo funciona el débito automático?',
    answer:
      'El socio autoriza una vez — con Mercado Pago o tarjeta — y la cuota se cobra sola todos los meses, sin que tenga que hacer nada. Vos lo ves y lo controlás desde el panel, y se puede desactivar cuando quieras.',
  },
  {
    question: '¿Hay comisión sobre lo que recaudo?',
    answer:
      'No. Cero porcentaje. Pagás el abono mensual publicado y nada más. Las comisiones de Mercado Pago o Stripe por procesar pagos las cobra el medio de pago, no nosotros, y siempre las ves en tu panel.',
  },
  {
    question: '¿Puedo migrar mi padrón desde Excel?',
    answer:
      'Sí. En el panel tenés una importación de socios desde Excel: cargás el archivo, revisás los datos y listo. También podés exportar cuando quieras.',
  },
  {
    question: '¿Mis socios necesitan una app?',
    answer:
      'No. Reciben el link de pago por WhatsApp y pagan desde el celular, sin descargar nada. El club trabaja desde el panel, que también funciona instalado en el teléfono (PWA).',
  },
  {
    question: '¿Qué pasa si mi club es chico?',
    answer:
      'Hasta 50 socios es gratis, para siempre. No es una prueba: si tu club crece recién ahí pasás a un plan publicado.',
  },
  {
    question: '¿Cuánto cuesta de verdad?',
    answer:
      'Lo que ves en la página de precios es lo que se paga: un abono fijo por mes según el tramo de socios, 0% sobre lo recaudado, y podés cancelar cuando quieras.',
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero */}
      <header className="relative flex flex-col items-center justify-center min-h-[72vh] px-6 pt-[calc(env(safe-area-inset-top)_+_4rem)] text-center">
        {/* TODO(launch): replace logo-only hero visual with a real product screenshot (admin panel with cuotas) */}
        <Logo size={120} showScroll={false} />
        <p className="text-2xl sm:text-3xl font-bold tracking-tight mb-4 mt-4">
          Libres Cobros
        </p>
        <p className="text-accent font-mono text-xs tracking-[0.2em] uppercase mb-4">
          Para clubes e instituciones
        </p>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-4 max-w-3xl">
          Cobrá tus cuotas sin comisiones ni letra chica.
        </h1>
        <p className="max-w-xl text-muted-foreground leading-relaxed mb-8 text-lg">
          Débito automático incluido. Un precio publicado, sin porcentaje sobre lo que recaudás.
          Gratis hasta 50 socios.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/registro"
            className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-lg bg-accent text-white font-medium hover:bg-accent/90 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Registrar mi club
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-8 py-3 rounded-lg border border-border font-medium hover:bg-muted transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Ingresar
          </Link>
        </div>
      </header>

      <main>
        {/* Problem */}
        {/* LEGAL REVIEW: comparative market claims — approved wording lives in replica/launch/pricing.md (LEGAL REVIEW REQUIRED) */}
        <section id="problema" className="py-16 px-6 border-t border-border">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <p className="text-accent font-mono text-xs tracking-[0.2em] uppercase mb-3">
                El problema
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold">
                Cobrar la cuota no debería costar un porcentaje de lo que el club recauda.
              </h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {problemCards.map((card) => (
                <div key={card.title} className="p-6 rounded-xl border border-border bg-card">
                  <h3 className="text-lg font-semibold mb-2">{card.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{card.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="como-funciona" className="py-16 px-6 border-t border-border bg-muted/30">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <p className="text-accent font-mono text-xs tracking-[0.2em] uppercase mb-3">
                Cómo funciona
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold">Tres pasos y empezás a cobrar</h2>
            </div>
            <div className="grid gap-8 sm:grid-cols-3">
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
                    <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="funciones" className="py-16 px-6 border-t border-border">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <p className="text-accent font-mono text-xs tracking-[0.2em] uppercase mb-3">
                Funciones
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold">Lo esencial, sin letra chica</h2>
            </div>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div key={feature.title} className="p-6 rounded-xl border border-border bg-card">
                    <div className="flex size-12 items-center justify-center rounded-lg bg-accent/10 mb-4">
                      <Icon className="size-6 text-accent" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Pricing */}
        {/* PRICING PROPOSAL: confirm before deploy — replica/launch/pricing.md */}
        <section id="precios" className="py-16 px-6 border-t border-border bg-muted/30 scroll-mt-16">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <p className="text-accent font-mono text-xs tracking-[0.2em] uppercase mb-3">
                Precios
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold">El precio que ves es el precio que pagás</h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-3">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={`p-6 rounded-xl border bg-card flex flex-col ${
                    plan.highlight ? 'border-accent ring-1 ring-accent' : 'border-border'
                  }`}
                >
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{plan.audience}</p>
                  <p className="text-3xl font-bold mb-1">{plan.price}</p>
                  <p className="text-sm text-muted-foreground mb-6">{plan.period}</p>
                  <Link
                    href="/registro"
                    className={`mt-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                      plan.highlight
                        ? 'bg-accent text-white hover:bg-accent/90'
                        : 'border border-border hover:bg-muted'
                    }`}
                  >
                    Registrar mi club
                  </Link>
                </div>
              ))}
            </div>
            <p className="mt-8 text-center text-muted-foreground leading-relaxed">
              En todos los planes: <strong className="text-foreground">0% sobre lo que recaudás</strong> —
              ni de lo online, ni del efectivo que cargás a mano.{' '}
              <Link href="/precios" className="font-medium text-primary hover:underline">
                Ver precios completos y condiciones →
              </Link>
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="py-16 px-6 border-t border-border">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <p className="text-accent font-mono text-xs tracking-[0.2em] uppercase mb-3">FAQ</p>
              <h2 className="text-3xl sm:text-4xl font-bold">Preguntas que nos hacen siempre</h2>
            </div>
            <div className="space-y-3">
              {faqs.map((faq) => (
                <details key={faq.question} className="group rounded-xl border border-border bg-card px-6 py-4">
                  <summary className="cursor-pointer font-semibold list-none flex items-center justify-between gap-4 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
                    {faq.question}
                    <span aria-hidden className="text-accent shrink-0 group-open:hidden">
                      +
                    </span>
                    <span aria-hidden className="text-accent shrink-0 hidden group-open:inline">
                      −
                    </span>
                  </summary>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 px-6 border-t border-border bg-muted/30 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Empezá gratis. Que la cuota se cobre sola.
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-8">
              Si tu club tiene hasta 50 socios, no pagás nada. Activá el débito automático y dejá
              de perseguir cobros — el precio siguiente está publicado, sin sorpresas.
            </p>
            <Link
              href="/registro"
              className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-lg bg-accent text-white font-medium hover:bg-accent/90 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Registrar mi club
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
