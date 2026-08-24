import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { adminFetch } from '@/lib/admin-fetch';
import { ClubList } from '@/components/admin/ClubList';
import type { ClubListItem, ClubListResponse } from '@/types/club';

export const dynamic = 'force-dynamic';

async function getClubs(): Promise<ClubListItem[]> {
  const response = await adminFetch('/api/admin/clubs', 'Failed to load clubs');
  const json: ClubListResponse = await response.json();
  return json.data;
}

export default async function ClubsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.role || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
    redirect('/login');
  }

  if (session.user.role !== 'SUPER_ADMIN') {
    redirect('/admin');
  }

  const clubs = await getClubs();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Clubes</h1>
        <p className="text-muted-foreground">
          Gestión de clubes: alta, edición y cambio de estado.
        </p>
      </div>

      <ClubList initialData={clubs} />
    </div>
  );
}
