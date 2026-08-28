import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { Building2, Users, CreditCard, BarChart3, Shield, Zap } from 'lucide-react';

const features = [
  {
    icon: Building2,
    title: 'Gestión de Clubes',
    description: 'Administrar múltiples clubes desde un solo panel centralizado.',
  },
  {
    icon: Users,
    title: 'Control de Socios',
    description: 'Alta, baja y consulta de socios con información completa.',
  },
  {
    icon: CreditCard,
    title: 'Cobros y Pagos',
    description: 'Generar cuotas, registrar pagos y mantener todo al día.',
  },
  {
    icon: BarChart3,
    title: 'Reportes',
    description: 'Estadísticas de pagos, deudas y comisiones en tiempo real.',
  },
  {
    icon: Shield,
    title: 'Seguro y Confiable',
    description: 'Sistema seguro con acceso restringido por roles.',
  },
  {
    icon: Zap,
    title: 'Rápido y Simple',
    description: 'Interfaz moderna y fácil de usar para administradores.',
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero */}
      <header className="relative flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
        <Logo size={140} showScroll={false} />
        <p className="text-accent font-mono text-xs tracking-[0.2em] uppercase mb-4 mt-6">
          Sistema de Administración
        </p>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-3">
          Libres Cobros
        </h1>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight mb-6 text-muted-foreground">
          Gestión integral de clubes
        </h2>
        <p className="max-w-lg text-muted-foreground leading-relaxed mb-8">
          Administra socios, cuotas, pagos y reportes de tus clubes de forma simple y organizada.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-8 py-3 rounded-lg bg-accent text-white font-medium hover:bg-accent/90 transition-colors"
          >
            Iniciar Sesión
          </Link>
          <Link
            href="/pagos/clubes"
            className="inline-flex items-center justify-center px-8 py-3 rounded-lg border border-border font-medium hover:bg-muted transition-colors"
          >
            Portal de Socios
          </Link>
        </div>
      </header>

      {/* Features */}
      <section className="py-20 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-accent font-mono text-xs tracking-[0.2em] uppercase mb-3">
              Funcionalidades
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold">
              Todo lo que necesitás
            </h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="p-6 rounded-xl border border-border bg-card hover:shadow-lg transition-shadow"
                >
                  <div className="flex size-12 items-center justify-center rounded-lg bg-accent/10 mb-4">
                    <Icon className="size-6 text-accent" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
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
