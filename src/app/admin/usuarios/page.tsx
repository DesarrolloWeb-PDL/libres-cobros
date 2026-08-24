import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { adminFetch } from '@/lib/admin-fetch';
import { UserList } from '@/components/admin/UserList';
import type { UserListItem } from '@/types/user';

export const dynamic = 'force-dynamic';

async function getUsers(): Promise<UserListItem[]> {
  const response = await adminFetch('/api/admin/users', 'Failed to load users');
  const json = await response.json();
  return json.data;
}

export default async function UsuariosPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.role || session.user.role !== 'SUPER_ADMIN') {
    redirect('/admin');
  }

  const users = await getUsers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Usuarios</h1>
        <p className="text-muted-foreground">
          Gestión de administradores de la plataforma.
        </p>
      </div>

      <UserList initialData={users} />
    </div>
  );
}
