import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { LayoutDashboard, Phone, Wallet } from 'lucide-react';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface LandingParams {
  params: Promise<{ slug: string }>;
}

async function getClub(slug: string) {
  return prisma.club.findUnique({
    where: { slug },
    select: {
      name: true,
      slug: true,
      logoUrl: true,
      phone: true,
      status: true,
      primaryColor: true,
      secondaryColor: true,
      accentColor: true,
    },
  });
}

export async function generateMetadata({ params }: LandingParams): Promise<Metadata> {
  const { slug } = await params;
  const club = await getClub(slug);
  if (!club || club.status !== 'ACTIVE') {
    return { title: 'Institución no encontrada' };
  }
  return {
    title: `${club.name} — Portal de la institución`,
    description: `Información, contacto y accesos de ${club.name}: portal de socios y administración.`,
  };
}

export default async function InstitutionLandingPage({ params }: LandingParams) {
  const { slug } = await params;
  const club = await getClub(slug);

  if (!club || club.status !== 'ACTIVE') {
    notFound();
  }

  const primary = club.primaryColor || '#7c3aed';
  const secondary = club.secondaryColor || '#a78bfa';
  const phoneHref = club.phone ? `tel:${club.phone.replace(/[^\d+]/g, '')}` : null;

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{
        background: `radial-gradient(1000px 500px at 50% -10%, ${primary}26, transparent 60%), #fafafc`,
      }}
    >
      <div className="w-full max-w-lg text-center">
        {/* Brand */}
        {club.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={club.logoUrl}
            alt={club.name}
            className="mx-auto mb-5 size-20 rounded-2xl object-cover shadow-lg"
          />
        ) : (
          <div
            className="mx-auto mb-5 flex size-20 items-center justify-center rounded-2xl text-3xl font-bold text-white shadow-lg"
            style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}
          >
            {club.name.charAt(0).toUpperCase()}
          </div>
        )}

        <h1 className="text-3xl font-bold tracking-tight" style={{ color: primary }}>
          {club.name}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Bienvenido/a — elegí dónde querés entrar.
        </p>

        {/* Access points */}
        <div className="mt-8 space-y-3 text-left">
          <Link
            href={`/pagos/${club.slug}`}
            className="group flex items-center gap-4 rounded-2xl p-5 shadow-md transition-transform hover:-translate-y-0.5"
            style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})`, color: '#fff' }}
          >
            <Wallet className="size-6 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Portal de socios</p>
              <p className="text-sm opacity-80">Consultá tus cuotas y pagalas</p>
            </div>
            <span className="text-xl opacity-80 transition-transform group-hover:translate-x-1">→</span>
          </Link>

          <Link
            href="/login"
            className="group flex items-center gap-4 rounded-2xl border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            style={{ borderColor: `${primary}33` }}
          >
            <LayoutDashboard className="size-6 shrink-0" style={{ color: primary }} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Administración</p>
              <p className="text-sm text-muted-foreground">Panel del club en Libres Cobros</p>
            </div>
            <span className="text-xl text-muted-foreground transition-transform group-hover:translate-x-1">
              →
            </span>
          </Link>

          {phoneHref && (
            <a
              href={phoneHref}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card/60 p-4 text-sm transition-colors hover:bg-card"
            >
              <Phone className="size-4 shrink-0" style={{ color: primary }} />
              <span className="font-medium">{club.phone}</span>
              <span className="ml-auto text-muted-foreground">Contacto</span>
            </a>
          )}
        </div>

        <footer className="mt-10 text-xs text-muted-foreground">
          Sistema de cobros por{' '}
          <Link href="/" className="font-medium underline-offset-2 hover:underline" style={{ color: primary }}>
            Libres Cobros
          </Link>
        </footer>
      </div>
    </main>
  );
}
