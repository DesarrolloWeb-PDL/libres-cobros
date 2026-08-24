import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { adminFetch } from '@/lib/admin-fetch';
import { FeeList } from '@/components/admin/FeeList';
import { Button } from '@/components/ui/button';
import type { FeeListResponse } from '@/types/fee';

async function getInitialFees(): Promise<FeeListResponse> {
  const response = await adminFetch(
    '/api/admin/fees?page=1&limit=20',
    'Failed to load fees'
  );

  return response.json();
}

export default async function FeesPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.role || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
    redirect('/login');
  }

  const initialData = await getInitialFees();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cuotas</h1>
          <p className="text-muted-foreground">
            Listado de cuotas mensuales, estados y vencimientos.
          </p>
        </div>

        <Button render={<Link href="/admin/cuotas/generar" />}>
          <Plus className="mr-2 size-4" />
          Generar cuotas
        </Button>
      </div>

      <FeeList initialData={initialData} />
    </div>
  );
}
