import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { adminFetch } from '@/lib/admin-fetch';
import { ConfigurationForm } from '@/components/admin/ConfigurationForm';
import type { SiteConfigListResponse } from '@/types/config';

export const dynamic = 'force-dynamic';

async function getInitialData(): Promise<{
  siteConfigs: SiteConfigListResponse;
}> {
  const siteResponse = await adminFetch('/api/admin/site-config', 'Failed to load site configs');
  const siteConfigs = await siteResponse.json();

  return {
    siteConfigs,
  };
}

export default async function ConfigurationPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.role || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
    redirect('/login');
  }

  const { siteConfigs } = await getInitialData();
  const isSuperAdmin = session.user.role === 'SUPER_ADMIN';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Configuración</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          {isSuperAdmin
            ? 'Administrar tasa de comisión, datos bancarios y credenciales de mensajería.'
            : 'Administrar datos bancarios, medios de pago y mensajería de tu institución.'}
        </p>
      </div>

      <ConfigurationForm initialSiteConfigs={siteConfigs} />
    </div>
  );
}
