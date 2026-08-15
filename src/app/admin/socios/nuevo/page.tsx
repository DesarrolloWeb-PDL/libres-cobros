'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MemberForm, type MemberFormData } from '@/components/admin/MemberForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { toast } from '@/components/ui/toast';

export default function NewMemberPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(data: MemberFormData) {
    setIsLoading(true);

    try {
      const response = await fetch('/api/admin/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al crear el socio');
      }

      toast.add({
        title: 'Socio creado',
        description: `${data.firstName} ${data.lastName} fue dado de alta correctamente`,
        type: 'success',
      });

      router.push('/admin/socios');
    } catch (error) {
      toast.add({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo crear el socio',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.push('/admin/socios')}>
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nuevo socio</h1>
          <p className="text-muted-foreground">Completá los datos para dar de alta un nuevo socio.</p>
        </div>
      </div>

      <MemberForm
        title="Datos del socio"
        onSubmit={handleSubmit}
        isLoading={isLoading}
        submitLabel="Crear socio"
      />
    </div>
  );
}
