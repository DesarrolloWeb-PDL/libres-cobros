import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { InstitutionThemeInjector } from '@/components/admin/InstitutionThemeInjector';
import { DarkModeInjector } from '@/components/admin/DarkModeInjector';
import { AdminPageBackground } from '@/components/admin/AdminPageBackground';

async function getInstitutionData(institutionId: string | null) {
  if (!institutionId) return null;
  
  const institution = await prisma.club.findUnique({
    where: { id: institutionId },
    select: {
      id: true,
      name: true,
      logoUrl: true,
      primaryColor: true,
      secondaryColor: true,
      accentColor: true,
      bgColor: true,
    },
  });
  
  return institution;
}

async function getSuperAdminTheme() {
  const config = await prisma.siteConfig.findFirst({
    where: { clubId: null, key: 'theme' },
    select: {
      primaryColor: true,
      secondaryColor: true,
      accentColor: true,
      bgColor: true,
    },
  });
  
  return config;
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  // Must live outside /admin/* — this layout wraps change-password and would loop.
  if (session.user.mustChangePassword) {
    redirect('/change-password');
  }

  const isSuperAdmin = session.user.role === 'SUPER_ADMIN';

  // For institution admins, fetch their institution data
  const institution = await getInstitutionData(session.user.institutionId);
  
  // For super admins, fetch theme from site config
  const superAdminTheme = isSuperAdmin ? await getSuperAdminTheme() : null;

  // Determine which color to use
  const institutionColor = !isSuperAdmin && institution?.primaryColor ? institution.primaryColor : null;
  const superAdminColor = isSuperAdmin && superAdminTheme?.primaryColor ? superAdminTheme.primaryColor : null;
  const themeColor = institutionColor || superAdminColor;

  // Determine background color (institution setting wins, then super admin theme, then default)
  const institutionBgColor = !isSuperAdmin && institution?.bgColor ? institution.bgColor : null;
  const superAdminBgColor = isSuperAdmin && superAdminTheme?.bgColor ? superAdminTheme.bgColor : null;
  const bgColor = institutionBgColor || superAdminBgColor || '#f8fafc';

  return (
    <>
      {themeColor && <InstitutionThemeInjector primaryColor={themeColor} />}
      <DarkModeInjector bgColor={bgColor} />
      <AdminPageBackground bgColor={bgColor} />
      {/* No inline backgroundColor — dark mode needs CSS .dark to own the page bg. */}
      <div className="flex min-h-screen bg-background">
        <AdminSidebar institution={institution} themeColor={themeColor} />
        <main className="flex-1 pt-14 lg:pt-0 min-w-0">
          <div className="p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </>
  );
}
