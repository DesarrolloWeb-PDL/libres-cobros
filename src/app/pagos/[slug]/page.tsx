import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { ClubPaymentPortal } from '@/components/member/ClubPaymentPortal';
import { MemberNav } from '@/components/member/MemberNav';

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
    select: { 
      id: true, 
      name: true, 
      slug: true, 
      status: true,
      logoUrl: true,
      primaryColor: true,
      secondaryColor: true,
      accentColor: true,
    },
  });

  if (!club || club.status !== 'ACTIVE') {
    notFound();
  }

  const prefilledDni = typeof dni === 'string' ? dni : undefined;

  return (
    <div 
      className="flex min-h-full flex-col"
      style={{
        '--club-primary': club.primaryColor,
        '--club-secondary': club.secondaryColor,
        '--club-accent': club.accentColor,
      } as React.CSSProperties}
    >
      <MemberNav 
        clubName={club.name}
        clubSlug={club.slug}
        clubLogo={club.logoUrl}
        primaryColor={club.primaryColor}
      />

      <main className="flex-1 px-4 py-8">
        <div className="container mx-auto max-w-3xl">
          <ClubPaymentPortal
            clubName={club.name}
            slug={club.slug}
            prefilledDni={prefilledDni}
            primaryColor={club.primaryColor}
            secondaryColor={club.secondaryColor}
            accentColor={club.accentColor}
          />
        </div>
      </main>

      <footer className="border-t bg-muted/30 py-6 text-center text-xs text-muted-foreground mt-auto">
        <div className="container mx-auto px-4">
          <p>{club.name} — Sistema de cobros</p>
          <p className="mt-1">Ante cualquier duda, contactate con administración.</p>
          <Link
            href="/login"
            className="mt-2 inline-block text-muted-foreground hover:text-accent transition-colors"
          >
            Admin
          </Link>
        </div>
      </footer>
    </div>
  );
}
