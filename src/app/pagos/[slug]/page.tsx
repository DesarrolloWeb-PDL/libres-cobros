import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { InstitutionPaymentPortal } from '@/components/member/InstitutionPaymentPortal';
import { MemberNav } from '@/components/member/MemberNav';

interface SlugPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export const dynamic = 'force-dynamic';

export default async function InstitutionPaymentPage({ params, searchParams }: SlugPageProps) {
  const { slug } = await params;
  const { dni } = await searchParams;

  const institution = await prisma.club.findUnique({
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

  if (!institution || institution.status !== 'ACTIVE') {
    notFound();
  }

  const prefilledDni = typeof dni === 'string' ? dni : undefined;

  return (
    <div
      className="flex min-h-full flex-col"
      data-institution-theme=""
      style={{
        '--institution-primary': institution.primaryColor,
        '--institution-secondary': institution.secondaryColor,
        '--institution-accent': institution.accentColor,
      } as React.CSSProperties}
    >
      <MemberNav
        institutionName={institution.name}
        institutionSlug={institution.slug}
        institutionLogo={institution.logoUrl}
        primaryColor={institution.primaryColor}
      />

      <main className="flex-1 px-4 py-10">
        <div className="container mx-auto max-w-2xl">
          <InstitutionPaymentPortal
            clubName={institution.name}
            slug={institution.slug}
            prefilledDni={prefilledDni}
            primaryColor={institution.primaryColor}
            secondaryColor={institution.secondaryColor}
            accentColor={institution.accentColor}
          />
        </div>
      </main>

      <footer className="border-t bg-muted/20 py-5 text-center text-xs text-muted-foreground mt-auto">
        <div className="container mx-auto px-4">
          <p className="font-medium">{institution.name} — Sistema de cobros</p>
          <p className="mt-1">Ante cualquier duda, contactate con administración.</p>
          <Link
            href="/login"
            className="mt-2 inline-block text-muted-foreground/60 hover:text-accent transition-colors"
          >
            Admin
          </Link>
        </div>
      </footer>
    </div>
  );
}
