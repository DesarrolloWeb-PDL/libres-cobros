import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { ClubThemeInjector } from '@/components/admin/ClubThemeInjector';

async function getClubData(clubId: string | null) {
  if (!clubId) return null;
  
  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: {
      id: true,
      name: true,
      logoUrl: true,
      primaryColor: true,
      secondaryColor: true,
      accentColor: true,
    },
  });
  
  return club;
}

async function getSuperAdminTheme() {
  const config = await prisma.siteConfig.findFirst({
    where: { clubId: null, key: 'theme' },
    select: {
      primaryColor: true,
      secondaryColor: true,
      accentColor: true,
    },
  });
  
  return config;
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  // Check if user must change password
  if (session.user.mustChangePassword) {
    redirect('/admin/change-password');
  }

  const isSuperAdmin = session.user.role === 'SUPER_ADMIN';

  // For club admins, fetch their club data
  const club = await getClubData(session.user.clubId);
  
  // For super admins, fetch theme from site config
  const superAdminTheme = isSuperAdmin ? await getSuperAdminTheme() : null;

  // Determine which color to use
  const clubColor = !isSuperAdmin && club?.primaryColor ? club.primaryColor : null;
  const superAdminColor = isSuperAdmin && superAdminTheme?.primaryColor ? superAdminTheme.primaryColor : null;
  const themeColor = clubColor || superAdminColor;

  return (
    <>
      {themeColor && <ClubThemeInjector primaryColor={themeColor} />}
      <div className="flex min-h-full bg-muted/30">
        <AdminSidebar club={club} />
        <main className="flex-1 pt-14 lg:pt-0 min-w-0">
          <div className="p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </>
  );
}
