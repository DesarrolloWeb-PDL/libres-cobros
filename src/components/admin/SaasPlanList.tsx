'use client';

import { useState, useCallback } from 'react';
import { Plus, Pencil, Power, PowerOff, Loader2 } from 'lucide-react';
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
import { SaasPlanForm } from './SaasPlanForm';
import { toast } from '@/components/ui/toast';
import type { SaasPlanListItem, SaasPlanListResponse } from '@/types/saas';

interface SaasPlanListProps {
  initialData: SaasPlanListResponse;
}

const currencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
});

export function SaasPlanList({ initialData }: SaasPlanListProps) {
  const [plans, setPlans] = useState<SaasPlanListItem[]>(initialData.data);
  const [isLoading, setIsLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SaasPlanListItem | undefined>();
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchPlans = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/saas/plans', { cache: 'no-store' });
      if (!response.ok) throw new Error('Error al cargar planes');
      const data: SaasPlanListResponse = await response.json();
      setPlans(data.data);
    } catch {
      toast.add({
        title: 'Error',
        description: 'No se pudieron cargar los planes SaaS',
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

  function openEdit(plan: SaasPlanListItem) {
    setEditingPlan(plan);
    setFormOpen(true);
  }

  async function togglePlan(plan: SaasPlanListItem) {
    setTogglingId(plan.id);
    try {
      const response = await fetch(`/api/admin/saas/plans/${plan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !plan.isActive }),
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button onClick={openCreate}>
          <Plus className="mr-2 size-4" />
          Nuevo plan SaaS
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Rango de socios</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Destacado</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-32">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : plans.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No se encontraron planes SaaS
                </TableCell>
              </TableRow>
            ) : (
              plans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell className="font-medium">{plan.name}</TableCell>
                  <TableCell>
                    {plan.minMembers} - {plan.maxMembers}
                  </TableCell>
                  <TableCell>{currencyFormatter.format(plan.priceArs)}</TableCell>
                  <TableCell>
                    <Badge variant={plan.highlight ? 'default' : 'secondary'}>
                      {plan.highlight ? 'Sí' : 'No'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={plan.isActive ? 'default' : 'secondary'}>
                      {plan.isActive ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="default"
                        size="icon"
                        onClick={() => openEdit(plan)}
                        aria-label="Editar"
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="default"
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
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <SaasPlanForm
        plan={editingPlan}
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={fetchPlans}
      />
    </div>
  );
}
