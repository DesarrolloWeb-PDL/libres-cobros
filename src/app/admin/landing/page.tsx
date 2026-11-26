import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { LandingEditor } from '@/components/admin/LandingEditor';

export const dynamic = 'force-dynamic';

export default async function LandingPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.role || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
    redirect('/login');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Landing</h1>
        <p className="text-muted-foreground">
          Contenido de la landing pública de tu institución: portada publicitaria,
          eventos, autoridades, contactos, historia y apariencia.
        </p>
      </div>
      <LandingEditor />
    </div>
  );
}
