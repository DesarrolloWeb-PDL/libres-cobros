import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { prisma } from '@/lib/db';
import { MemberNav } from '@/components/member/MemberNav';
import { InstitutionThemeInjector } from '@/components/admin/InstitutionThemeInjector';
import { CommunicationsInbox, type InboxMessage } from '@/components/member/CommunicationsInbox';

interface MemberInboxPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export const dynamic = 'force-dynamic';

export default async function MemberInboxPage({ params, searchParams }: MemberInboxPageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const dni = typeof sp.dni === 'string' ? sp.dni : undefined;

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

  const campaigns = await prisma.massMessageCampaign.findMany({
    where: { clubId: club.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  let member: { id: string; firstName: string; lastName: string; dni: string } | null = null;
  const smsMessages: { id: string; message: string; sentAt: Date; status: string; type: string }[] = [];

  if (dni) {
    const foundMember = await prisma.member.findUnique({
      where: { clubId_dni: { clubId: club.id, dni } },
      select: { id: true, firstName: true, lastName: true, dni: true },
    });
    if (foundMember) {
      member = foundMember;
      const logs = await prisma.smsLog.findMany({
        where: { memberId: foundMember.id },
        orderBy: { sentAt: 'desc' },
        take: 50,
      });
      smsMessages.push(...logs);
    }
  }

  const messages: InboxMessage[] = [
    ...campaigns.map((campaign) => ({
      id: `campaign-${campaign.id}`,
      kind: 'campaign' as const,
      date: (campaign.sentAt ?? campaign.scheduledAt ?? campaign.createdAt).toISOString(),
      sender: club.name,
      subject: campaign.category ?? undefined,
      message: campaign.message,
      status: campaign.status,
    })),
    ...smsMessages.map((log) => ({
      id: `sms-${log.id}`,
      kind: 'sms' as const,
      date: log.sentAt.toISOString(),
      sender: club.name,
      message: log.message,
      status: log.status,
    })),
  ];

  return (
    <div
      className="flex min-h-full flex-col"
      style={{
        '--club-primary': club.primaryColor,
        '--club-secondary': club.secondaryColor,
        '--club-accent': club.accentColor,
      } as React.CSSProperties}
    >
      <InstitutionThemeInjector primaryColor={club.primaryColor} />
      <MemberNav
        institutionName={club.name}
        institutionSlug={club.slug}
        institutionLogo={club.logoUrl}
        primaryColor={club.primaryColor}
      />

      <main className="flex-1 px-4 py-10">
        <div className="container mx-auto max-w-2xl">
          <div className="mb-6 flex items-center gap-3">
            <Link href={`/pagos/${slug}${dni ? `?dni=${encodeURIComponent(dni)}` : ''}`}>
              <Button variant="ghost" size="icon" aria-label="Volver al portal">
                <ArrowLeft className="size-5" />
              </Button>
            </Link>
            <div>
              <p className="font-mono text-xs tracking-[0.2em] uppercase text-accent">Mensajes</p>
              <h1 className="text-2xl font-bold">Bandeja de entrada</h1>
            </div>
          </div>

          <CommunicationsInbox
            messages={messages}
            memberName={member ? `${member.firstName} ${member.lastName}` : undefined}
          />
        </div>
      </main>

      <footer className="border-t bg-muted/20 py-5 text-center text-xs text-muted-foreground mt-auto">
        <div className="container mx-auto px-4">
          <p className="font-medium">{club.name} — Sistema de cobros</p>
          <p className="mt-1">Ante cualquier duda, contactate con administración.</p>
        </div>
      </footer>
    </div>
  );
}
