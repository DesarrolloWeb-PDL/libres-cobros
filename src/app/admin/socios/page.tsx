import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { adminFetch } from '@/lib/admin-fetch';
import { MemberList } from '@/components/admin/MemberList';
import type { MemberListResponse } from '@/types/member';

async function getInitialMembers(): Promise<MemberListResponse> {
  const response = await adminFetch(
    '/api/admin/members?page=1&limit=20',
    'Failed to load members'
  );

  return response.json();
}

export default async function MembersPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.role || session.user.role !== 'ADMIN') {
    redirect('/admin/login');
  }

  const initialData = await getInitialMembers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Socios</h1>
        <p className="text-muted-foreground">
          Gestión de socios del club: alta, edición, importación y exportación.
        </p>
      </div>

      <MemberList initialData={initialData} />
    </div>
  );
}
