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

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  // Check if user must change password
  if (session.user.mustChangePassword) {
    redirect('/admin/change-password');
  }

  // Fetch club data for club admins
  const club = await getClubData(session.user.clubId);
  const isSuperAdmin = session.user.role === 'SUPER_ADMIN';

  // For club admins, set club color as the accent
  const clubColor = !isSuperAdmin && club?.primaryColor ? club.primaryColor : null;

  return (
    <>
      {clubColor && <ClubThemeInjector primaryColor={clubColor} />}
      <div className="flex min-h-full bg-muted/30">
        <AdminSidebar club={club} />
        <main className="flex-1 pt-14 lg:pt-0 min-w-0">
          <div className="p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </>
  );
}
