import { redirect, notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { adminFetch } from '@/lib/admin-fetch';
import { ClubForm } from '@/components/admin/ClubForm';
import type { ClubListItem } from '@/types/club';

export const dynamic = 'force-dynamic';

interface EditClubPageProps {
  params: Promise<{ id: string }>;
}

async function getClub(id: string): Promise<ClubListItem | null> {
  const response = await adminFetch(`/api/admin/clubs/${id}`);

  if (!response.ok) {
    return null;
  }

  const json = await response.json();
  return json.data ?? json;
}

export default async function EditClubPage({ params }: EditClubPageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.role || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
    redirect('/admin/login');
  }

  if (session.user.role !== 'SUPER_ADMIN') {
    redirect('/admin');
  }

  const { id } = await params;
  const club = await getClub(id);

  if (!club) {
    notFound();
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Editar club</h1>
        <p className="text-muted-foreground">
          Modificá los datos de {club.name}.
        </p>
      </div>

      <ClubForm club={club} />
    </div>
  );
}
