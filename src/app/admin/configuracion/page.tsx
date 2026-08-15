import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { ConfigurationForm } from '@/components/admin/ConfigurationForm';
import type { FeeConfigListResponse } from '@/types/fee';
import type { SiteConfigListResponse } from '@/types/config';

export const dynamic = 'force-dynamic';

async function getInitialData(): Promise<{
  feeConfigs: FeeConfigListResponse;
  siteConfigs: SiteConfigListResponse;
}> {
  const origin = process.env.NEXT_PUBLIC_URL ?? 'http://localhost:3000';

  const [feeResponse, siteResponse] = await Promise.all([
    fetch(`${origin}/api/admin/fee-configs`, { cache: 'no-store' }),
    fetch(`${origin}/api/admin/site-config`, { cache: 'no-store' }),
  ]);

  if (!feeResponse.ok) {
    throw new Error('Failed to load fee configs');
  }

  if (!siteResponse.ok) {
    throw new Error('Failed to load site configs');
  }

  return {
    feeConfigs: await feeResponse.json(),
    siteConfigs: await siteResponse.json(),
  };
}

export default async function ConfigurationPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.role || session.user.role !== 'ADMIN') {
    redirect('/admin/login');
  }

  const { feeConfigs, siteConfigs } = await getInitialData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground">
          Administrar montos de cuotas, tasa de comisión, datos bancarios y credenciales de WhatsApp.
        </p>
      </div>

      <ConfigurationForm
        initialFeeConfigs={feeConfigs}
        initialSiteConfigs={siteConfigs}
      />
    </div>
  );
}
