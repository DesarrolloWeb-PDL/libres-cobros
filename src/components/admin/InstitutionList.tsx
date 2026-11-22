'use client';

import { useEffect, useState } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StyledSelect } from '@/components/ui/styled-select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/toast';
import type { ClubListItem } from '@/types/club';

interface InstitutionListProps {
  initialData: ClubListItem[];
}

interface SaasPlanOption {
  id: string;
  name: string;
  minMembers: number;
  maxMembers: number;
  priceArs: number;
}

const statusVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  ACTIVE: 'default',
  INACTIVE: 'secondary',
  PENDING: 'outline',
};

const statusLabels: Record<string, string> = {
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
  PENDING: 'Pendiente',
};

export function InstitutionList({ initialData }: InstitutionListProps) {
  const router = useRouter();
  const [institutions, setInstitutions] = useState<ClubListItem[]>(initialData);

  const [plans, setPlans] = useState<SaasPlanOption[]>([]);
  const [planByInstitution, setPlanByInstitution] = useState<Record<string, { id: string; name: string }>>({});
  const [dialogInstitution, setDialogInstitution] = useState<ClubListItem | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch('/api/admin/saas/plans?active=true').then((r) => (r.ok ? r.json() : { data: [] })),
      fetch('/api/admin/saas/subscriptions').then((r) => (r.ok ? r.json() : { data: [] })),
    ])
      .then(([plansRes, subsRes]) => {
        if (cancelled) return;
        if (Array.isArray(plansRes.data)) setPlans(plansRes.data);
        if (Array.isArray(subsRes.data)) {
          const map: Record<string, { id: string; name: string }> = {};
          for (const sub of subsRes.data) {
            if (sub.status === 'ACTIVE' && sub.institution?.id && sub.saasPlan?.id) {
              map[sub.institution.id] = { id: sub.saasPlan.id, name: sub.saasPlan.name };
            }
          }
          setPlanByInstitution(map);
        }
      })
      .catch(() => {
        /* sin datos de planes: la columna queda como "Sin plan" */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function openPlanDialog(institution: ClubListItem) {
    setSelectedPlanId(planByInstitution[institution.id]?.id ?? '');
    setDialogInstitution(institution);
  }

  async function assignPlan() {
    if (!dialogInstitution || !selectedPlanId) return;
    setAssigning(true);
    try {
      const response = await fetch(
        `/api/admin/saas/institutions/${dialogInstitution.id}/subscription`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ saasPlanId: selectedPlanId }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al asignar el plan');
      }

      const updated = await response.json();
      setPlanByInstitution((prev) => ({
        ...prev,
        [dialogInstitution.id]: { id: updated.saasPlan.id, name: updated.saasPlan.name },
      }));
      toast.add({
        title: 'Plan asignado',
        description: `${dialogInstitution.name} → ${updated.saasPlan.name}`,
        type: 'success',
      });
      setDialogInstitution(null);
    } catch (error) {
      toast.add({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo asignar el plan',
        type: 'error',
      });
    } finally {
      setAssigning(false);
    }
  }

  async function updateStatus(institution: ClubListItem, newStatus: 'ACTIVE' | 'INACTIVE') {
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
        description:
          newStatus === 'ACTIVE' && institution.status === 'PENDING'
            ? 'La institución fue aprobada correctamente'
            : `La institución fue ${actionLabel} correctamente`,
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
              <TableHead>Estado</TableHead>
              <TableHead>Plan</TableHead>
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
                  <TableCell className="font-medium">
                    {institution.name}
                    {institution.phone && (
                      <div className="text-xs text-muted-foreground font-normal">
                        {institution.phone}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{institution.slug}</TableCell>
                  <TableCell>
                    <Badge
                      variant={statusVariants[institution.status] ?? 'default'}
                      className={
                        institution.status === 'PENDING'
                          ? 'border-amber-500/50 text-amber-600 dark:text-amber-400'
                          : undefined
                      }
                    >
                      {statusLabels[institution.status] ?? institution.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {planByInstitution[institution.id] ? (
                      <Badge variant="secondary">
                        {planByInstitution[institution.id].name}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Sin plan
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={(props) => (
                          <Button {...props} variant="default" size="icon" aria-label="Acciones">
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
                        <DropdownMenuItem onClick={() => openPlanDialog(institution)}>
                          Asignar plan
                        </DropdownMenuItem>
                        {institution.status === 'PENDING' ? (
                          <DropdownMenuItem onClick={() => updateStatus(institution, 'ACTIVE')}>
                            Aprobar
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() =>
                              updateStatus(
                                institution,
                                institution.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
                              )
                            }
                          >
                            {institution.status === 'ACTIVE' ? 'Desactivar' : 'Activar'}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={!!dialogInstitution}
        onOpenChange={(open) => {
          if (!open) setDialogInstitution(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar plan</DialogTitle>
            <DialogDescription>
              {dialogInstitution?.name} —{' '}
              {dialogInstitution && planByInstitution[dialogInstitution.id]
                ? `plan actual: ${planByInstitution[dialogInstitution.id].name}`
                : 'sin plan contratado (nivel gratuito)'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label>Plan SaaS</Label>
            <StyledSelect
              value={selectedPlanId}
              onChange={setSelectedPlanId}
              options={plans.map((p) => ({
                value: p.id,
                label: `${p.name} — ${p.minMembers}-${p.maxMembers} socios — $${p.priceArs.toLocaleString('es-AR')}/mes`,
              }))}
              placeholder="Seleccioná un plan"
            />
            <p className="text-xs text-muted-foreground">
              El cambio se aplica de inmediato para esta institución.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogInstitution(null)}>
              Cancelar
            </Button>
            <Button onClick={assignPlan} disabled={!selectedPlanId || assigning}>
              {assigning ? 'Asignando…' : 'Asignar plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
