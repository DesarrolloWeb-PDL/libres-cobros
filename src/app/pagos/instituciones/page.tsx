import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { InstitutionDirectory } from '@/components/member/InstitutionDirectory';
import { Logo } from '@/components/Logo';

export const dynamic = 'force-dynamic';

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

export default async function InstitucionesPage() {
  const [clubs, theme] = await Promise.all([
    prisma.club.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, slug: true },
      orderBy: { name: 'asc' },
    }),
    getSuperAdminTheme(),
  ]);

  if (clubs.length === 1) {
    redirect(`/pagos/${clubs[0].slug}`);
  }

  const primaryColor = theme?.primaryColor || '#7c3aed';

  return (
    <div
      className="flex min-h-full flex-col"
      style={{
        '--institution-primary': primaryColor,
        '--institution-secondary': theme?.secondaryColor,
        '--institution-accent': theme?.accentColor,
      } as React.CSSProperties}
    >
      {/* Hero Section */}
      <header className="relative flex flex-col items-center justify-center min-h-[50vh] px-6 pt-16 sm:pt-0 text-center">
        <Logo size={120} showScroll={false} color={primaryColor} />
        <p
          className="font-mono text-xs tracking-[0.2em] uppercase mb-4 mt-6"
          style={{ color: primaryColor }}
        >
          Portal de Socios
        </p>
        <h1
          className="text-4xl sm:text-4xl font-bold tracking-tight mb-3"
          style={{ color: primaryColor }}
        >
          Institución Libres
        </h1>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight mb-2">
          Sistema de Cobros
        </h2>
        <p className="max-w-md text-muted-foreground leading-relaxed mb-8">
          Seleccioná la institución a la que pertenecés para ver tus cuotas y realizar pagos.
        </p>
      </header>

      {/* Instituciones */}
      <section className="relative py-12 px-6 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 text-center">
            <p
              className="font-mono text-xs tracking-[0.2em] uppercase mb-3"
              style={{ color: primaryColor }}
            >
              Elegí tu institución
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold mb-10">
              Tus Instituciones
            </h2>
          </div>

          <InstitutionDirectory clubs={clubs} />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30 py-6 text-center text-xs text-muted-foreground mt-auto">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <span>Institución Libres — Sistema de cobros. Ante cualquier duda, contactate con administración.</span>
          <Link
            href="/login"
            className="text-muted-foreground hover:text-accent transition-colors"
          >
            Admin
          </Link>
        </div>
      </footer>
    </div>
  );
}
