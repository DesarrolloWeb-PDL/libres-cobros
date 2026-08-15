import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { FeeList } from '@/components/admin/FeeList';
import { Button } from '@/components/ui/button';
import type { FeeListResponse } from '@/types/fee';

async function getInitialFees(): Promise<FeeListResponse> {
  const origin = process.env.NEXT_PUBLIC_URL ?? 'http://localhost:3000';
  const response = await fetch(`${origin}/api/admin/fees?page=1&limit=20`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to load fees');
  }

  return response.json();
}

export default async function FeesPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.role || session.user.role !== 'ADMIN') {
    redirect('/admin/login');
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
