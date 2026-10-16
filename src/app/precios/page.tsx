import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight, Check } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Footer } from '@/components/Footer';

/* Pricing page — the anti-"precio a consultar" page.
   All numbers are PROPOSAL — needs founder confirmation before deploy:
   see replica/launch/pricing.md §3. Comparative claims wording is gated by
   replica/launch/pricing.md (LEGAL REVIEW REQUIRED). */

export const metadata: Metadata = {
  title: 'Precios - Libres Cobros',
  description:
    'Precio publicado: sin porcentaje sobre lo que recaudás y gratis hasta 50 socios. Conocé el costo completo de Libres Cobros.',
};

/* PRICING PROPOSAL: confirm before deploy */
const plans = [
  {
    name: 'Club de Barrio',
    audience: 'Hasta 50 socios',
    price: '$ 0',
    period: 'para siempre',
    highlight: false,
    cta: 'Registrar mi club',
    features: [
      'Hasta 50 socios, sin vencimiento',
      '0% sobre lo que recaudás',
      'Links de pago por WhatsApp',
      'Recordatorios por WhatsApp y email',
      'Comprobantes con código QR',
      'Importación y exportación desde Excel',
    ],
  },
  {
    name: 'Club en Crecimiento',
    audience: 'De 51 a 200 socios',
    price: '$ 35.000',
    period: 'por mes',
    highlight: true,
    cta: 'Registrar mi club',
    features: [
      'Todo lo del plan gratis',
      '0% sobre lo que recaudás',
      'Débito automático con Mercado Pago y Stripe',
      'Reportes de pagos, deudas y cierres',
      'Multi-institución',
      'Soporte por WhatsApp',
    ],
  },
  {
    name: 'Institución Grande',
    audience: 'De 201 a 800 socios',
    price: '$ 85.000',
    period: 'por mes',
    highlight: false,
    cta: 'Registrar mi club',
    features: [
      'Todo lo del plan de crecimiento',
      '0% sobre lo que recaudás',
      'Tramos de socios publicados, sin saltos sorpresa',
      'Panel multi-institución ilimitado',
      'Alta prioridad en soporte',
      'Para más de 800 socios: escribinos y armamos el tramo',
    ],
  },
];

const commitments = [
  {
    title: 'Cancelás cuando quieras',
    description: 'Desde el panel, en un clic. Sin llamados ni meses de preaviso.',
  },
  {
    title: 'Te avisamos antes de cada cobro',
    description: 'Email de renovación 7 días antes, con el monto exacto y el tramo en el que estás.',
  },
  {
    title: 'Sin saltos sorpresa',
    description: 'Los tramos están publicados: si tu club pasa de tramo, lo sabés de antemano, no en la factura.',
  },
  {
    title: 'Cero porcentaje sobre lo que recaudás',
    description: 'Ni de los pagos online, ni del efectivo que cargás a mano. El precio no depende de cuánto cobres.',
  },
];

const faqs = [
  {
    question: '¿Hay comisión sobre lo que recaudo?',
    answer:
      'No. Cero porcentaje. Pagás el abono mensual publicado y nada más. Las comisiones de Mercado Pago o Stripe por procesar pagos las cobra el medio de pago, no nosotros, y siempre las ves en tu panel.',
  },
  {
    question: '¿Qué pasa si un mes tengo más socios que mi tramo?',
    answer:
      'El cambio de tramo se aplica en la próxima renovación, y te lo avisamos por email antes. No hay facturación sorpresa por unos socios de más.',
  },
  {
    question: '¿Puedo pagar el año entero?',
    answer:
      'Sí. El plan anual tiene 2 meses bonificados: pagás 10 y el precio es el mismo publicado por mes.',
  },
  {
    question: '¿Qué pasa si mi club es chico?',
    answer:
      'Hasta 50 socios es gratis, para siempre. No es una prueba: si tu club crece recién ahí pasás a un plan publicado.',
  },
  {
    question: '¿Puedo cancelar cuando quiera?',
    answer:
      'Sí, desde el panel, en un clic. No hay permanencia mínima ni penalidad.',
  },
  {
    question: '¿Hay letra chica?',
    answer:
      'No. El precio es el abono publicado según tu tramo de socios.0% sobre lo que recaudás. Las comisiones de los medios de pago son de los medios de pago, y las ves siempre en tu panel.',
  },
];

export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero */}
      <header className="flex flex-col items-center justify-center px-6 pt-[calc(env(safe-area-inset-top)_+_3rem)] pb-12 text-center">
        <Link href="/">
          <Logo size={100} showScroll={false} />
        </Link>
        <p className="text-accent font-mono text-xs tracking-[0.2em] uppercase mb-4 mt-6">
          Precios
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4 max-w-2xl">
          Precios publicados. Sin sorpresas.
        </h1>
        <p className="max-w-xl text-muted-foreground leading-relaxed mb-6 text-lg">
          Un abono fijo por mes según el tramo de socios de tu club.{' '}
          <strong className="text-foreground">0% sobre lo que recaudás</strong> — ni del online, ni
          del efectivo que cargás a mano.
        </p>
        <Link
          href="/registro"
          className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-lg bg-accent text-white font-medium hover:bg-accent/90 transition-colors"
        >
          Registrar mi club
          <ArrowRight className="size-4" />
        </Link>
      </header>

      <main>
        {/* Plans */}
        {/* PRICING PROPOSAL: confirm before deploy — replica/launch/pricing.md */}
        <section className="py-12 px-6 border-t border-border">
          <div className="max-w-5xl mx-auto">
            <div className="grid gap-6 sm:grid-cols-3">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={`p-6 rounded-xl border bg-card flex flex-col ${
                    plan.highlight ? 'border-accent ring-1 ring-accent' : 'border-border'
                  }`}
                >
                  <h2 className="text-lg font-semibold">{plan.name}</h2>
                  <p className="text-sm text-muted-foreground mb-4">{plan.audience}</p>
                  <p className="text-3xl font-bold mb-1">{plan.price}</p>
                  <p className="text-sm text-muted-foreground mb-6">{plan.period}</p>
                  <ul className="space-y-2 mb-8">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <Check className="size-4 text-accent shrink-0 mt-0.5" />
                        <span className="text-muted-foreground leading-relaxed">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/registro"
                    className={`mt-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                      plan.highlight
                        ? 'bg-accent text-white hover:bg-accent/90'
                        : 'border border-border hover:bg-muted'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              ))}
            </div>
            <p className="mt-8 text-center text-sm text-muted-foreground">
              ¿Más de 800 socios?{' '}
              <Link href="/registro" className="font-medium text-primary hover:underline">
                Escribinos y armamos el tramo a tu medida
              </Link>
              , siempre con precio publicado.
            </p>
          </div>
        </section>

        {/* Fairness commitments */}
        <section className="py-16 px-6 border-t border-border bg-muted/30">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <p className="text-accent font-mono text-xs tracking-[0.2em] uppercase mb-3">
                Compromisos
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold">Cómo cobramos, en claro</h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              {commitments.map((item) => (
                <div key={item.title} className="p-6 rounded-xl border border-border bg-card">
                  <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 px-6 border-t border-border">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <p className="text-accent font-mono text-xs tracking-[0.2em] uppercase mb-3">FAQ</p>
              <h2 className="text-3xl sm:text-4xl font-bold">Preguntas sobre el precio</h2>
            </div>
            <div className="space-y-3">
              {faqs.map((faq) => (
                <details
                  key={faq.question}
                  className="group rounded-xl border border-border bg-card px-6 py-4"
                >
                  <summary className="cursor-pointer font-semibold list-none flex items-center justify-between gap-4">
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
              Si tu club tiene hasta 50 socios, hoy sale gratis.
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-8">
              Registralo, importá tu padrón y cobrá el primer mes sin pagar nada. El día que crezcas,
              el precio ya lo vas a conocer de antemano.
            </p>
            <Link
              href="/registro"
              className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-lg bg-accent text-white font-medium hover:bg-accent/90 transition-colors"
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
