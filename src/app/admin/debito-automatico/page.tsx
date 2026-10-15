import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { adminFetch } from '@/lib/admin-fetch';
import { AutoDebitList } from '@/components/admin/AutoDebitList';
import type { AutoDebitListResponse } from '@/types/autodebit';

async function getInitialAutoDebits(): Promise<AutoDebitListResponse> {
  const response = await adminFetch('/api/admin/autodebit', 'Failed to load auto-debits');

  return response.json();
}

export default async function AutoDebitPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.role || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
    redirect('/login');
  }

  const initialData = await getInitialAutoDebits();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Débito Automático</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Socios suscritos a cobro automático mensual
        </p>
      </div>

      <AutoDebitList initialData={initialData} />
    </div>
  );
}
