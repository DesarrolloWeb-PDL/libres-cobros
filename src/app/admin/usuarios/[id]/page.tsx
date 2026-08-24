'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/toast';

interface Club {
  id: string;
  name: string;
}

interface UserData {
  id: string;
  email: string;
  name: string;
  role: string;
  clubId: string | null;
  clubName: string | null;
}

export default function EditarUsuarioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [clubId, setClubId] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'SUPER_ADMIN'>('ADMIN');
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loadingClubs, setLoadingClubs] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [userRes, clubsRes] = await Promise.all([
          fetch(`/api/admin/users/${id}`),
          fetch('/api/admin/clubs'),
        ]);

        if (!userRes.ok) {
          throw new Error('Usuario no encontrado');
        }

        const userData = await userRes.json();
        const user = userData.data;

        setEmail(user.email);
        setName(user.name);
        setRole(user.role);
        setClubId(user.clubId ?? '');

        const clubsData = await clubsRes.json();
        setClubs(clubsData.data ?? []);
      } catch {
        toast.add({ title: 'Error', description: 'No se pudo cargar el usuario', type: 'error' });
        router.push('/admin/usuarios');
      } finally {
        setIsLoading(false);
        setLoadingClubs(false);
      }
    }

    loadData();
  }, [id, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, role, clubId: role === 'ADMIN' ? clubId : null }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al actualizar el usuario');
      }

      toast.add({
        title: 'Usuario actualizado',
        description: `El usuario "${name}" fue actualizado correctamente`,
        type: 'success',
      });

      router.push('/admin/usuarios');
    } catch (error) {
      toast.add({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo actualizar el usuario',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <Button render={<Link href="/admin/usuarios" />} variant="ghost" size="sm" className="mb-2 -ml-2 gap-2">
          <ArrowLeft className="size-4" />
          Volver
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Editar usuario</h1>
        <p className="text-muted-foreground">
          Modificá los datos del administrador.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nombre</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Nombre completo"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            disabled
            className="bg-muted"
          />
          <p className="text-xs text-muted-foreground">El email no se puede modificar</p>
        </div>

        <div className="space-y-2">
          <Label>Rol</Label>
          <Select value={role} onValueChange={(v) => setRole(v as 'ADMIN' | 'SUPER_ADMIN')}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ADMIN">Admin</SelectItem>
              <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {role === 'ADMIN' && (
          <div className="space-y-2">
            <Label>Club</Label>
            <Select value={clubId} onValueChange={(v) => setClubId(v ?? '')} disabled={loadingClubs}>
              <SelectTrigger>
                <SelectValue placeholder={loadingClubs ? 'Cargando clubs...' : 'Seleccioná un club'} />
              </SelectTrigger>
              <SelectContent>
                {clubs.map((club) => (
                  <SelectItem key={club.id} value={club.id}>
                    {club.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={isSubmitting || (role === 'ADMIN' && !clubId)}>
            {isSubmitting ? 'Guardando...' : 'Guardar cambios'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push('/admin/usuarios')}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
