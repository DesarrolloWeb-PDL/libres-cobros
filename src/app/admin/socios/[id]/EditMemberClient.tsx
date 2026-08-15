'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { MemberForm, type MemberFormData } from '@/components/admin/MemberForm';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';

interface Member {
  id: string;
  dni: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  category: string;
  notes: string | null;
}

interface EditMemberClientProps {
  member: Member;
}

export function EditMemberClient({ member }: EditMemberClientProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const initialData: MemberFormData = {
    dni: member.dni,
    firstName: member.firstName,
    lastName: member.lastName,
    email: member.email ?? '',
    phone: member.phone ?? '',
    category: member.category,
    notes: member.notes ?? '',
  };

  async function handleSubmit(data: MemberFormData) {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/admin/members/${member.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al actualizar el socio');
      }

      toast.add({
        title: 'Socio actualizado',
        description: `${data.firstName} ${data.lastName} fue actualizado correctamente`,
        type: 'success',
      });

      router.push('/admin/socios');
    } catch (error) {
      toast.add({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo actualizar el socio',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.push('/admin/socios')}>
          <ArrowLeft className="size-4" />
        </Button>
      </div>

      <MemberForm
        title="Datos del socio"
        initialData={initialData}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        submitLabel="Guardar cambios"
      />
    </>
  );
}
