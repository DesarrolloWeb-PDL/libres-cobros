import { redirect } from 'next/navigation';
import Link from 'next/link';
import { UserRound } from 'lucide-react';
import { prisma } from '@/lib/db';
import { ClubDirectory } from '@/components/member/ClubDirectory';

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
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <UserRound className="size-5" />
            </div>
            <span className="font-semibold">Portal de Socios</span>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-8">
        <div className="container mx-auto max-w-3xl">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Elegí tu club</h1>
            <p className="mt-2 text-muted-foreground">
              Seleccioná el club al que pertenecés para ver tus cuotas.
            </p>
          </div>

          <ClubDirectory clubs={clubs} />
        </div>
      </main>

      <footer className="border-t bg-muted/30 py-4 text-center text-xs text-muted-foreground">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <span>Club Libres — Sistema de cobros. Ante cualquier duda, contactate con administración.</span>
          <Link
            href="/login"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Admin
          </Link>
        </div>
      </footer>
    </div>
  );
}
