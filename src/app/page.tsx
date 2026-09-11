import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { prisma } from '@/lib/db';
import { Building2, Users, CreditCard, BarChart3, Shield, Zap } from 'lucide-react';

const features = [
  {
    icon: Building2,
    title: 'Gestión de Instituciones',
    description: 'Administrar múltiples instituciones desde un solo panel centralizado.',
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

async function getSuperAdminTheme() {
  const config = await prisma.siteConfig.findFirst({
    where: { clubId: null, key: 'theme' },
    select: {
      primaryColor: true,
      secondaryColor: true,
      accentColor: true,
    },
  });
  
  return config;
}

export default async function LandingPage() {
  const theme = await getSuperAdminTheme();
  
  const primaryColor = theme?.primaryColor || '#7c3aed';
  const secondaryColor = theme?.secondaryColor || '#a78bfa';
  const accentColor = theme?.accentColor || '#5b21b6';

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{
        '--landing-primary': primaryColor,
        '--landing-secondary': secondaryColor,
        '--landing-accent': accentColor,
      } as React.CSSProperties}
    >
      {/* Hero */}
      <header className="relative flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
        <Logo size={140} showScroll={false} color={primaryColor} />
        <p className="font-mono text-xs tracking-[0.2em] uppercase mb-4 mt-6" style={{ color: primaryColor }}>
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
            className="inline-flex items-center justify-center px-8 py-3 rounded-lg text-white font-medium transition-colors"
            style={{ backgroundColor: primaryColor }}
          >
            Iniciar Sesión
          </Link>
          <Link
            href="/pagos/instituciones"
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
            <p className="font-mono text-xs tracking-[0.2em] uppercase mb-3" style={{ color: primaryColor }}>
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
                  <div className="flex size-12 items-center justify-center rounded-lg mb-4" style={{ backgroundColor: `${primaryColor}15` }}>
                    <Icon className="size-6" style={{ color: primaryColor }} />
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
