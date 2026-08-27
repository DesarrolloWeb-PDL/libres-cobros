import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

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

// Convert hex to HSL for CSS variables
function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
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

  // Generate HSL values for club colors
  const clubStyles = !isSuperAdmin && club?.primaryColor ? `
    :root {
      --accent: ${hexToHsl(club.primaryColor)} !important;
      --accent-foreground: 255 255 255 !important;
      --primary: ${hexToHsl(club.primaryColor)} !important;
      --primary-foreground: 255 255 255 !important;
    }
    .bg-accent { background-color: ${club.primaryColor} !important; }
    .text-accent { color: ${club.primaryColor} !important; }
    .hover\\:bg-accent-hover:hover { background-color: ${club.primaryColor} !important; }
  ` : '';

  return (
    <>
      {clubStyles && (
        <style dangerouslySetInnerHTML={{ __html: clubStyles }} />
      )}
      <div className="flex min-h-full bg-muted/30">
        <AdminSidebar club={club} />
        <main className="flex-1 pt-14 lg:pt-0 min-w-0">
          <div className="p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </>
  );
}
