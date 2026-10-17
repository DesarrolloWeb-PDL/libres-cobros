import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { adminFetch } from '@/lib/admin-fetch';
import { AdminThemeCard } from '@/components/admin/AdminThemeCard';
import { ClubCustomization } from '@/components/admin/ClubCustomization';
import type { ClubListItem } from '@/types/club';

export const dynamic = 'force-dynamic';

export default async function AppearancePage() {
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
      // Club fetch failed
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Apariencia</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          {isSuperAdmin
            ? 'Personaliza los colores del panel de administración.'
            : 'Subí el logo y personalizá los colores de tu institución.'}
        </p>
      </div>

      {isSuperAdmin ? (
        <AdminThemeCard />
      ) : club ? (
        <ClubCustomization club={club} />
      ) : (
        <p className="text-sm text-muted-foreground">
          No se pudo cargar la información de tu institución.
        </p>
      )}
    </div>
  );
}
