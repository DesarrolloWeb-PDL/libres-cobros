'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plus,
  MoreHorizontal,
} from 'lucide-react';
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
import type { ClubListItem } from '@/types/club';

interface ClubListProps {
  initialData: ClubListItem[];
}

const statusVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  ACTIVE: 'default',
  INACTIVE: 'secondary',
};

const commissionTypeLabels: Record<string, string> = {
  PERCENTAGE: '%',
  FIXED: '$',
};

export function ClubList({ initialData }: ClubListProps) {
  const router = useRouter();
  const [clubs, setClubs] = useState<ClubListItem[]>(initialData);

  async function toggleStatus(club: ClubListItem) {
    const newStatus = club.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const actionLabel = newStatus === 'ACTIVE' ? 'activado' : 'desactivado';

    try {
      const response = await fetch(`/api/admin/clubs/${club.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al actualizar el estado');
      }

      toast.add({
        title: 'Estado actualizado',
        description: `El club fue ${actionLabel} correctamente`,
        type: 'success',
      });

      setClubs((prev) =>
        prev.map((c) => (c.id === club.id ? { ...c, status: newStatus } : c))
      );
    } catch (error) {
      toast.add({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo actualizar el estado',
        type: 'error',
      });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {clubs.length} club{clubs.length !== 1 ? 'es' : ''}
        </p>
        <Button onClick={() => router.push('/admin/clubes/nuevo')}>
          <Plus className="mr-2 size-4" />
          Nuevo club
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Comisión</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-16">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clubs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  No hay clubes registrados
                </TableCell>
              </TableRow>
            ) : (
              clubs.map((club) => (
                <TableRow key={club.id}>
                  <TableCell className="font-medium">{club.name}</TableCell>
                  <TableCell className="text-muted-foreground">{club.slug}</TableCell>
                  <TableCell>
                    {commissionTypeLabels[club.commissionType] ?? ''}{' '}
                    {club.commissionType === 'PERCENTAGE'
                      ? `${club.commissionValue}%`
                      : club.commissionValue.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariants[club.status] ?? 'default'}>
                      {club.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="ghost" size="icon" aria-label="Acciones">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        }
                      />
                      <DropdownMenuContent>
                        <DropdownMenuItem
                          onClick={() => router.push(`/admin/clubes/${club.id}`)}
                        >
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleStatus(club)}>
                          {club.status === 'ACTIVE' ? 'Desactivar' : 'Activar'}
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
