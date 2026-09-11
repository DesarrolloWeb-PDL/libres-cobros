'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

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

interface InstitutionListProps {
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

export function InstitutionList({ initialData }: InstitutionListProps) {
  const router = useRouter();
  const [institutions, setInstitutions] = useState<ClubListItem[]>(initialData);

  async function toggleStatus(institution: ClubListItem) {
    const newStatus = institution.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const actionLabel = newStatus === 'ACTIVE' ? 'activado' : 'desactivado';

    try {
      const response = await fetch(`/api/admin/clubs/${institution.id}`, {
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
        description: `La institución fue ${actionLabel} correctamente`,
        type: 'success',
      });

      setInstitutions((prev) =>
        prev.map((c) => (c.id === institution.id ? { ...c, status: newStatus } : c))
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
          {institutions.length} institución{institutions.length !== 1 ? 'es' : ''}
        </p>
        <Button onClick={() => router.push('/admin/instituciones/nuevo')}>
          <Plus className="mr-2 size-4" />
          Nueva institución
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Identificador URL</TableHead>
              <TableHead>Comisión</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-16">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {institutions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  No hay instituciones registradas
                </TableCell>
              </TableRow>
            ) : (
              institutions.map((institution) => (
                <TableRow key={institution.id}>
                  <TableCell className="font-medium">{institution.name}</TableCell>
                  <TableCell className="text-muted-foreground">{institution.slug}</TableCell>
                  <TableCell>
                    {commissionTypeLabels[institution.commissionType] ?? ''}{' '}
                    {institution.commissionType === 'PERCENTAGE'
                      ? `${institution.commissionValue}%`
                      : institution.commissionValue.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariants[institution.status] ?? 'default'}>
                      {institution.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                    </Badge>
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
                        <DropdownMenuItem
                          onClick={() => router.push(`/admin/instituciones/${institution.id}`)}
                        >
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleStatus(institution)}>
                          {institution.status === 'ACTIVE' ? 'Desactivar' : 'Activar'}
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
