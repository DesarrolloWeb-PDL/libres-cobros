'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
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

export default function NuevoUsuarioPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [clubId, setClubId] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'SUPER_ADMIN'>('ADMIN');
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loadingClubs, setLoadingClubs] = useState(true);

  useEffect(() => {
    fetch('/api/admin/clubs')
      .then((res) => res.json())
      .then((json) => setClubs(json.data ?? []))
      .catch(() => toast.add({ title: 'Error', description: 'No se pudieron cargar los clubs', type: 'error' }))
      .finally(() => setLoadingClubs(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, clubId, role }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al crear el usuario');
      }

      toast.add({
        title: 'Usuario creado',
        description: `El usuario "${name}" fue creado correctamente`,
        type: 'success',
      });

      router.push('/admin/usuarios');
    } catch (error) {
      toast.add({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo crear el usuario',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <Button render={<Link href="/admin/usuarios" />} variant="ghost" size="sm" className="mb-2 -ml-2 gap-2">
          <ArrowLeft className="size-4" />
          Volver
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Nuevo usuario</h1>
        <p className="text-muted-foreground">
          Completá los datos para crear un nuevo administrador.
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
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="admin@ejemplo.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            placeholder="Mínimo 6 caracteres"
          />
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
            {isSubmitting ? 'Creando...' : 'Crear usuario'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push('/admin/usuarios')}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
