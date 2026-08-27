import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  // Check if user must change password
  if (session.user.mustChangePassword) {
    redirect('/admin/change-password');
  }

  return (
    <div className="flex min-h-full bg-muted/30">
      <AdminSidebar />
      <main className="flex-1 pt-14 lg:pt-0">
        <div className="container mx-auto p-4 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
