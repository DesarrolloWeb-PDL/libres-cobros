'use client';

import { useCallback, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StyledSelect } from '@/components/ui/styled-select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from '@/components/ui/toast';
import type { AutoDebitListItem, AutoDebitListResponse } from '@/types/autodebit';

interface AutoDebitListProps {
  initialData: AutoDebitListResponse;
}

const gatewayLabels: Record<string, string> = {
  mercadopago: 'Mercado Pago',
  stripe: 'Stripe',
};

const gatewayBadgeClasses: Record<string, string> = {
  mercadopago:
    'bg-sky-100 text-sky-700 border-sky-200 hover:bg-sky-100 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800',
  stripe:
    'bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800',
};

/** Maps an auto-debit status to its label and color-coded badge classes. */
export function autoDebitStatusBadge(status: string): { label: string; className: string } {
  const map: Record<string, { label: string; className: string }> = {
    ACTIVE: {
      label: 'Activo',
      className:
        'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
    },
    PENDING_AUTH: {
      label: 'Pendiente',
      className:
        'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
    },
    FAILED: {
      label: 'Falló',
      className:
        'bg-red-100 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-950 dark:text-red-300 dark:border-red-800',
    },
    PAUSED: {
      label: 'Pausado',
      className:
        'bg-zinc-100 text-zinc-700 border-zinc-200 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-700',
    },
    CANCELLED: {
      label: 'Cancelado',
      className:
        'bg-zinc-100 text-zinc-700 border-zinc-200 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-700',
    },
  };

  return map[status] ?? { label: status, className: '' };
}

const currencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
});

export function AutoDebitList({ initialData }: AutoDebitListProps) {
  const [autoDebits, setAutoDebits] = useState<AutoDebitListItem[]>(initialData.data);
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchAutoDebits = useCallback(async (statusFilter: string) => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (statusFilter) queryParams.set('status', statusFilter);

      const queryString = queryParams.toString();
      const response = await fetch(`/api/admin/autodebit${queryString ? `?${queryString}` : ''}`, {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('Error al cargar los débitos automáticos');
      }

      const data: AutoDebitListResponse = await response.json();
      setAutoDebits(data.data);
    } catch {
      toast.add({
        title: 'Error',
        description: 'No se pudieron cargar los débitos automáticos',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  function handleStatusChange(value: string) {
    setStatus(value);
    fetchAutoDebits(value);
  }

  async function handleCancel(autoDebit: AutoDebitListItem) {
    const memberName = `${autoDebit.member.firstName} ${autoDebit.member.lastName}`;

    if (!confirm(`¿Cancelar la suscripción de ${memberName}? Esta acción no se puede deshacer.`)) {
      return;
    }

    setCancellingId(autoDebit.id);
    try {
      const response = await fetch('/api/admin/autodebit', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: autoDebit.id }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al cancelar la suscripción');
      }

      toast.add({
        title: 'Suscripción cancelada',
        description: `El débito automático de ${memberName} fue cancelado`,
        type: 'success',
      });

      fetchAutoDebits(status);
    } catch (error) {
      toast.add({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo cancelar la suscripción',
        type: 'error',
      });
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <StyledSelect
          value={status}
          onChange={handleStatusChange}
          options={[
            { value: '', label: 'Todos' },
            { value: 'ACTIVE', label: 'Activo' },
            { value: 'PENDING_AUTH', label: 'Pendiente' },
            { value: 'FAILED', label: 'Falló' },
            { value: 'PAUSED', label: 'Pausado' },
            { value: 'CANCELLED', label: 'Cancelado' },
          ]}
          placeholder="Todos los estados"
          className="w-full sm:w-44"
        />
        <p className="text-sm text-muted-foreground">
          Mostrando {autoDebits.length} suscripción{autoDebits.length === 1 ? '' : 'es'}
        </p>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Socio</TableHead>
              <TableHead>Medio de pago</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Importe</TableHead>
              <TableHead>Próximo cobro</TableHead>
              <TableHead className="w-28">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : autoDebits.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No se encontraron débitos automáticos
                </TableCell>
              </TableRow>
            ) : (
              autoDebits.map((autoDebit) => {
                const statusBadge = autoDebitStatusBadge(autoDebit.status);
                const canCancel = autoDebit.status === 'ACTIVE' || autoDebit.status === 'PENDING_AUTH';

                return (
                  <TableRow key={autoDebit.id}>
                    <TableCell>
                      <div className="font-medium">
                        {autoDebit.member.firstName} {autoDebit.member.lastName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        DNI {autoDebit.member.dni}
                        {autoDebit.member.email && <> · {autoDebit.member.email}</>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={gatewayBadgeClasses[autoDebit.gateway]}>
                        {gatewayLabels[autoDebit.gateway] ?? autoDebit.gateway}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusBadge.className}>
                        {statusBadge.label}
                      </Badge>
                    </TableCell>
                    <TableCell>{currencyFormatter.format(autoDebit.amount)}</TableCell>
                    <TableCell>
                      {autoDebit.nextBillingAt
                        ? new Date(autoDebit.nextBillingAt).toLocaleDateString('es-AR')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {canCancel && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleCancel(autoDebit)}
                          disabled={cancellingId === autoDebit.id}
                        >
                          {cancellingId === autoDebit.id && (
                            <Loader2 className="mr-1 size-3.5 animate-spin" />
                          )}
                          Cancelar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
