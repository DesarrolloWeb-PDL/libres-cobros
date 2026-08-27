'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/toast';
import type { UserListItem } from '@/types/user';

interface UserListProps {
  initialData: UserListItem[];
}

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
};

const roleVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  SUPER_ADMIN: 'destructive',
  ADMIN: 'default',
};

export function UserList({ initialData }: UserListProps) {
  const router = useRouter();
  const [users, setUsers] = useState<UserListItem[]>(initialData);

  async function toggleRole(user: UserListItem) {
    const newRole = user.role === 'ADMIN' ? 'SUPER_ADMIN' : 'ADMIN';
    const actionLabel = newRole === 'ADMIN' ? 'degradado a Admin' : 'promovido a Super Admin';

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al actualizar el rol');
      }

      toast.add({
        title: 'Rol actualizado',
        description: `El usuario fue ${actionLabel}`,
        type: 'success',
      });

      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u))
      );
    } catch (error) {
      toast.add({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo actualizar el rol',
        type: 'error',
      });
    }
  }

  async function deleteUser(user: UserListItem) {
    if (!confirm(`¿Eliminar al usuario ${user.email}?`)) return;

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al eliminar el usuario');
      }

      toast.add({
        title: 'Usuario eliminado',
        description: `${user.email} fue eliminado correctamente`,
        type: 'success',
      });

      setUsers((prev) => prev.filter((u) => u.id !== user.id));
    } catch (error) {
      toast.add({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo eliminar el usuario',
        type: 'error',
      });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {users.length} usuario{users.length !== 1 ? 's' : ''}
        </p>
        <Button onClick={() => router.push('/admin/usuarios/nuevo')}>
          <Plus className="mr-2 size-4" />
          Nuevo usuario
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Club</TableHead>
              <TableHead className="w-16">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  No hay usuarios registrados
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={roleVariants[user.role] ?? 'default'}>
                      {roleLabels[user.role] ?? user.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.clubName ?? '—'}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={(props) => (
                          <Button {...props} variant="ghost" size="icon" aria-label="Acciones">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        )}
                      />
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => router.push(`/admin/usuarios/${user.id}`)}>
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleRole(user)}>
                          {user.role === 'ADMIN' ? 'Promover a Super Admin' : 'Degradar a Admin'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => deleteUser(user)} className="text-destructive">
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
