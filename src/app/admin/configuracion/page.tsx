import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { adminFetch } from '@/lib/admin-fetch';
import { ConfigurationForm } from '@/components/admin/ConfigurationForm';
import { ClubCustomization } from '@/components/admin/ClubCustomization';
import type { SiteConfigListResponse } from '@/types/config';
import type { ClubListItem } from '@/types/club';

export const dynamic = 'force-dynamic';

async function getInitialData(): Promise<{
  siteConfigs: SiteConfigListResponse;
  club?: ClubListItem;
}> {
  const siteResponse = await adminFetch('/api/admin/site-config', 'Failed to load site configs');
  const siteConfigs = await siteResponse.json();

  // For club admins, also fetch their club data
  let club: ClubListItem | undefined;
  try {
    const clubResponse = await adminFetch('/api/admin/clubs/current');
    if (clubResponse.ok) {
      const clubData = await clubResponse.json();
      club = clubData.data ?? clubData;
    }
  } catch {
    // Super admin doesn't have a club
  }

  return {
    siteConfigs,
    club,
  };
}

export default async function ConfigurationPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.role || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
    redirect('/login');
  }

  const { siteConfigs, club } = await getInitialData();
  const isSuperAdmin = session.user.role === 'SUPER_ADMIN';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Configuración</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          {isSuperAdmin
            ? 'Administrar tasa de comisión, datos bancarios y credenciales de mensajería.'
            : 'Administrar datos bancarios, mensajería y apariencia de tu club.'}
        </p>
      </div>

      <ConfigurationForm
        initialSiteConfigs={siteConfigs}
      />

      {/* Club customization - only for club admins */}
      {!isSuperAdmin && club && (
        <ClubCustomization club={club} />
      )}
    </div>
  );
}
