import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { adminFetch } from '@/lib/admin-fetch';
import { ConfigurationForm } from '@/components/admin/ConfigurationForm';
import type { SiteConfigListResponse } from '@/types/config';
import type { ClubListItem } from '@/types/club';

export const dynamic = 'force-dynamic';

async function getInitialData(): Promise<{
  siteConfigs: SiteConfigListResponse;
}> {
  const siteResponse = await adminFetch('/api/admin/site-config', 'Failed to load site configs');
  const siteConfigs = await siteResponse.json();

  return {
    siteConfigs,
  };
}

export default async function ConfigurationPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.role || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
    redirect('/login');
  }

  const isSuperAdmin = session.user.role === 'SUPER_ADMIN';

  let club: ClubListItem | undefined;
  if (!isSuperAdmin) {
    try {
      const clubResponse = await adminFetch('/api/admin/clubs/current');
      if (clubResponse.ok) {
        const clubData = await clubResponse.json();
        club = clubData.data ?? clubData;
      }
    } catch {
      // Club fetch failed — the webhook URL block is skipped without a slug.
    }
  }

  const { siteConfigs } = await getInitialData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Configuración</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          {isSuperAdmin
            ? 'Administrar datos bancarios, medios de pago y credenciales de mensajería.'
            : 'Administrar datos bancarios, medios de pago y mensajería de tu institución.'}
        </p>
      </div>

      <ConfigurationForm initialSiteConfigs={siteConfigs} clubSlug={club?.slug} />
    </div>
  );
}
