import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { Logo } from '@/components/Logo';
import { InstitutionSelector } from '@/components/member/InstitutionSelector';

export const dynamic = 'force-dynamic';

export default async function PagosPage() {
  const clubs = await prisma.club.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, name: true, slug: true },
    orderBy: { name: 'asc' },
  });

  if (clubs.length === 1) {
    redirect(`/pagos/${clubs[0].slug}`);
  }

  if (clubs.length === 0) {
    return (
      <div className="flex min-h-full flex-col">
        <header className="relative flex flex-col items-center justify-center min-h-[60vh] px-6 pt-16 text-center">
          <Logo size={120} showScroll={false} />
          <p className="text-accent font-mono text-xs tracking-[0.2em] uppercase mb-4 mt-6">
            Portal de Socios
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
            Todavía no hay instituciones disponibles
          </h1>
          <p className="max-w-md text-muted-foreground leading-relaxed">
            En este momento no hay instituciones habilitadas en el portal. Si sos administrador de un
            club, contactá con el equipo de Libres Cobros.
          </p>
        </header>
        <footer className="border-t bg-muted/30 py-6 text-center text-xs text-muted-foreground mt-auto">
          <div className="container mx-auto px-4 flex items-center justify-center gap-4">
            <span>Institución Libres — Sistema de cobros.</span>
            <Link href="/login" className="text-muted-foreground hover:text-accent transition-colors">
              Admin
            </Link>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="relative flex flex-col items-center justify-center min-h-[60vh] px-6 pt-16 text-center">
        <Logo size={120} showScroll={false} />
        <p className="text-accent font-mono text-xs tracking-[0.2em] uppercase mb-4 mt-6">
          Portal de Socios
        </p>
        <h1 className="text-4xl sm:text-4xl font-bold tracking-tight mb-3 text-accent">
          Institución Libres
        </h1>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight mb-2">
          Sistema de Cobros
        </h2>
        <p className="max-w-md text-muted-foreground leading-relaxed mb-8">
          Seleccioná la institución a la que pertenecés para ver tus cuotas y realizar pagos.
        </p>
        <InstitutionSelector clubs={clubs} />
      </header>

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
