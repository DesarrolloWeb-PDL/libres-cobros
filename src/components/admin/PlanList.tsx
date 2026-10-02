'use client';

import { useState, useCallback } from 'react';
import { Plus, Pencil, Power, PowerOff, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PlanForm } from './PlanForm';
import { toast } from '@/components/ui/toast';
import type { PlanListItem, PlanListResponse } from '@/types/fee';

interface PlanListProps {
  initialData: PlanListResponse;
}

const currencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
});

export function PlanList({ initialData }: PlanListProps) {
  const [plans, setPlans] = useState<PlanListItem[]>(initialData.data);
  const [isLoading, setIsLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanListItem | undefined>();
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchPlans = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/plans', { cache: 'no-store' });
      if (!response.ok) throw new Error('Error al cargar planes');
      const data: PlanListResponse = await response.json();
      setPlans(data.data);
    } catch {
      toast.add({
        title: 'Error',
        description: 'No se pudieron cargar los planes',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  function openCreate() {
    setEditingPlan(undefined);
    setFormOpen(true);
  }

  function openEdit(plan: PlanListItem) {
    setEditingPlan(plan);
    setFormOpen(true);
  }

  async function togglePlan(plan: PlanListItem) {
    setTogglingId(plan.id);
    try {
      const response = await fetch('/api/admin/plans', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plans: [
            {
              id: plan.id,
              name: plan.name,
              amount: plan.amount,
              description: plan.description ?? undefined,
              isActive: !plan.isActive,
            },
          ],
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Error al cambiar el estado');
      }

      toast.add({
        title: 'Estado actualizado',
        description: `El plan "${plan.name}" fue ${plan.isActive ? 'desactivado' : 'activado'}`,
        type: 'success',
      });

      fetchPlans();
    } catch (error) {
      toast.add({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo actualizar el plan',
        type: 'error',
      });
    } finally {
      setTogglingId(null);
    }
  }

  async function deletePlan(plan: PlanListItem) {
    if (!confirm(`¿Eliminar el plan "${plan.name}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    setDeletingId(plan.id);
    try {
      const response = await fetch('/api/admin/plans', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deletedIds: [plan.id] }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Error al eliminar el plan');
      }

      toast.add({
        title: 'Plan eliminado',
        description: `El plan "${plan.name}" fue eliminado correctamente`,
        type: 'success',
      });

      fetchPlans();
    } catch (error) {
      toast.add({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo eliminar el plan',
        type: 'error',
      });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button onClick={openCreate}>
          <Plus className="mr-2 size-4" />
          Nuevo plan
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-40">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : plans.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  No se encontraron planes
                </TableCell>
              </TableRow>
            ) : (
              plans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell className="font-medium">{plan.name}</TableCell>
                  <TableCell>{currencyFormatter.format(plan.amount)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {plan.description || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={plan.isActive ? 'default' : 'secondary'}>
                      {plan.isActive ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(plan)}
                        aria-label="Editar"
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => togglePlan(plan)}
                        disabled={togglingId === plan.id}
                        aria-label={plan.isActive ? 'Desactivar' : 'Activar'}
                      >
                        {togglingId === plan.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : plan.isActive ? (
                          <PowerOff className="size-4" />
                        ) : (
                          <Power className="size-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deletePlan(plan)}
                        disabled={deletingId === plan.id}
                        aria-label="Eliminar"
                        className="text-destructive hover:text-destructive"
                      >
                        {deletingId === plan.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Trash2 className="size-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <PlanForm
        plan={editingPlan}
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={fetchPlans}
      />
    </div>
  );
}
