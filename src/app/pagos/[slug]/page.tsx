import { notFound } from 'next/navigation';
import { UserRound } from 'lucide-react';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { ClubPaymentPortal } from '@/components/member/ClubPaymentPortal';

interface SlugPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export const dynamic = 'force-dynamic';

export default async function ClubPaymentPage({ params, searchParams }: SlugPageProps) {
  const { slug } = await params;
  const { dni } = await searchParams;

  const club = await prisma.club.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, status: true },
  });

  if (!club || club.status !== 'ACTIVE') {
    notFound();
  }

  const prefilledDni = typeof dni === 'string' ? dni : undefined;

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
          <Link
            href="/pagos/clubes"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Cambiar club
          </Link>
        </div>
      </header>

      <main className="flex-1 px-4 py-8">
        <div className="container mx-auto max-w-3xl">
          <ClubPaymentPortal
            clubName={club.name}
            slug={club.slug}
            prefilledDni={prefilledDni}
          />
        </div>
      </main>

      <footer className="border-t bg-muted/30 py-4 text-center text-xs text-muted-foreground">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <span>{club.name} — Sistema de cobros. Ante cualquier duda, contactate con administración.</span>
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
