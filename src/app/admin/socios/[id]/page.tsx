import { getServerSession } from 'next-auth';
import { redirect, notFound } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { EditMemberClient } from './EditMemberClient';

interface EditMemberPageProps {
  params: Promise<{ id: string }>;
}

async function getMember(id: string) {
  const origin = process.env.NEXT_PUBLIC_URL ?? 'http://localhost:3000';
  const response = await fetch(`${origin}/api/admin/members/${id}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

export default async function EditMemberPage({ params }: EditMemberPageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.role || session.user.role !== 'ADMIN') {
    redirect('/admin/login');
  }

  const { id } = await params;
  const member = await getMember(id);

  if (!member) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Editar socio</h1>
        <p className="text-muted-foreground">
          Modificá los datos de {member.firstName} {member.lastName}.
        </p>
      </div>

      <EditMemberClient member={member} />
    </div>
  );
}
