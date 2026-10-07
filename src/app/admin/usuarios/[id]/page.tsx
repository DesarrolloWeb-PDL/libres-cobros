'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Key, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StyledSelect } from '@/components/ui/styled-select';
import { toast } from '@/components/ui/toast';

interface Club {
  id: string;
  name: string;
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
  const [isResettingPassword, setIsResettingPassword] = useState(false);

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
        body: JSON.stringify({ name, role, clubId: role === 'ADMIN' && clubId ? clubId : null }),
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

  async function handleResetPassword() {
    if (!confirm('¿Blanquear la clave de este usuario? Se generará una contraseña temporal que deberá cambiar en el próximo login.')) return;

    setIsResettingPassword(true);

    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al blanquear la clave');
      }

      toast.add({
        title: 'Clave blanqueada',
        description: `Nueva contraseña temporal: ${data.tempPassword}. Compartila con el usuario; deberá cambiarla en el próximo login.`,
        type: 'success',
      });
    } catch (error) {
      toast.add({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo blanquear la clave',
        type: 'error',
      });
    } finally {
      setIsResettingPassword(false);
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
        <Link href="/admin/usuarios" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-2 -ml-2">
          <ArrowLeft className="size-4" />
          Volver
        </Link>
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
          <StyledSelect
            value={role}
            onChange={(v) => setRole(v as 'ADMIN' | 'SUPER_ADMIN')}
            options={[
              { value: 'ADMIN', label: 'Admin' },
              { value: 'SUPER_ADMIN', label: 'Super Admin' },
            ]}
          />
        </div>

        {role === 'ADMIN' && (
          <div className="space-y-2">
            <Label>Club</Label>
            <StyledSelect
              value={clubId}
              onChange={(v) => setClubId(v)}
              options={clubs.map((club) => ({ value: club.id, label: club.name }))}
              placeholder={loadingClubs ? 'Cargando clubs...' : 'Seleccioná un club'}
              disabled={loadingClubs}
            />
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

      {/* Password Reset Section */}
      <div className="border-t pt-6">
        <h3 className="text-base font-semibold mb-2">Seguridad</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Blanquear la clave de este usuario. Se generará una contraseña temporal que deberá cambiar en el próximo login.
        </p>
        <Button
          variant="outline"
          onClick={handleResetPassword}
          disabled={isResettingPassword}
          className="gap-2"
        >
          {isResettingPassword ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Key className="size-4" />
          )}
          {isResettingPassword ? 'Procesando...' : 'Blanquear clave'}
        </Button>
      </div>
    </div>
  );
}
