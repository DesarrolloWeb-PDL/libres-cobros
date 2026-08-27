import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { ClubDirectory } from '@/components/member/ClubDirectory';
import { Logo } from '@/components/Logo';

export const dynamic = 'force-dynamic';

export default async function ClubesPage() {
  const clubs = await prisma.club.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, name: true, slug: true },
    orderBy: { name: 'asc' },
  });

  if (clubs.length === 1) {
    redirect(`/pagos/${clubs[0].slug}`);
  }

  return (
    <div className="flex min-h-full flex-col">
      {/* Hero Section - estilo freelancer */}
      <header className="relative flex flex-col items-center justify-center min-h-[50vh] px-6 pt-16 sm:pt-0 text-center">
        <Logo size={120} showScroll={false} />
        <p className="text-accent font-mono text-xs tracking-[0.2em] uppercase mb-4 mt-6">
          Portal de Socios
        </p>
        <h1 className="text-4xl sm:text-4xl font-bold tracking-tight mb-3 text-accent">
          Club Libres
        </h1>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight mb-2">
          Sistema de Cobros
        </h2>
        <p className="max-w-md text-muted-foreground leading-relaxed mb-8">
          Seleccioná el club al que pertenecés para ver tus cuotas y realizar pagos.
        </p>
      </header>

      {/* Clubes */}
      <section className="relative py-12 px-6 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 text-center">
            <p className="text-accent font-mono text-xs tracking-[0.2em] uppercase mb-3">
              Elegí tu club
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold mb-10">
              Tus Clubes
            </h2>
          </div>

          <ClubDirectory clubs={clubs} />
        </div>
      </section>

      {/* Footer - estilo freelancer */}
      <footer className="border-t bg-muted/30 py-6 text-center text-xs text-muted-foreground mt-auto">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <span>Club Libres — Sistema de cobros. Ante cualquier duda, contactate con administración.</span>
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
