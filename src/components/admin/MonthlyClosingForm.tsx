'use client';

import { useState, useCallback } from 'react';
import { Lock, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/toast';
import type {
  CommissionListItem,
  CommissionListResponse,
  MonthlyClosingListItem,
  MonthlyClosingListResponse,
  MonthlyClosingResult,
} from '@/types/commission';

interface MonthlyClosingFormProps {
  initialClosings: MonthlyClosingListResponse;
  initialPreview: CommissionListResponse;
}

const monthLabels: Record<number, string> = {
  1: 'Enero',
  2: 'Febrero',
  3: 'Marzo',
  4: 'Abril',
  5: 'Mayo',
  6: 'Junio',
  7: 'Julio',
  8: 'Agosto',
  9: 'Septiembre',
  10: 'Octubre',
  11: 'Noviembre',
  12: 'Diciembre',
};

const currencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
});

export function MonthlyClosingForm({ initialClosings, initialPreview }: MonthlyClosingFormProps) {
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [preview, setPreview] = useState<CommissionListResponse>(initialPreview);
  const [closings, setClosings] = useState<MonthlyClosingListItem[]>(initialClosings.data);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const selectedClosing = closings.find(
    (c) => c.month === Number(month) && c.year === Number(year)
  );

  const loadPreview = useCallback(async () => {
    setIsLoadingPreview(true);
    try {
      const queryParams = new URLSearchParams();
      queryParams.set('month', month);
      queryParams.set('year', year);
      queryParams.set('unassigned', 'true');
      queryParams.set('limit', '1000');

      const response = await fetch(`/api/admin/reports/commissions?${queryParams.toString()}`, {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('Error al calcular resumen');
      }

      const data: CommissionListResponse = await response.json();
      setPreview(data);
    } catch {
      toast.add({
        title: 'Error',
        description: 'No se pudo calcular el resumen del período',
        type: 'error',
      });
    } finally {
      setIsLoadingPreview(false);
    }
  }, [month, year]);

  async function refreshClosings() {
    try {
      const response = await fetch('/api/admin/closings', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Error al actualizar cierres');
      }
      const data: MonthlyClosingListResponse = await response.json();
      setClosings(data.data);
    } catch {
      // Silent fail; preview already loaded
    }
  }

  async function handleClose() {
    if (selectedClosing?.status === 'CLOSED') {
      toast.add({
        title: 'Período cerrado',
        description: 'El período seleccionado ya fue cerrado',
        type: 'warning',
      });
      return;
    }

    setIsClosing(true);
    try {
      let closingId = selectedClosing?.id;

      if (!closingId) {
        const createResponse = await fetch('/api/admin/closings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ month: Number(month), year: Number(year) }),
        });

        if (!createResponse.ok) {
          const error = await createResponse.json();
          throw new Error(error.error || 'Error al crear el cierre');
        }

        const created = (await createResponse.json()) as MonthlyClosingListItem;
        closingId = created.id;
      }

      const closeResponse = await fetch(`/api/admin/closings/${closingId}/close`, {
        method: 'POST',
      });

      if (!closeResponse.ok) {
        const error = await closeResponse.json();
        throw new Error(error.error || 'Error al cerrar el período');
      }

      const result = (await closeResponse.json()) as MonthlyClosingResult;

      toast.add({
        title: 'Período cerrado',
        description: `Se cerraron ${result.commissionCount} comisiones`,
        type: 'success',
      });

      await refreshClosings();
      await loadPreview();
    } catch (err) {
      toast.add({
        title: 'Error',
        description: err instanceof Error ? err.message : 'No se pudo cerrar el período',
        type: 'error',
      });
    } finally {
      setIsClosing(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Seleccionar período</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Select value={month} onValueChange={(value) => setMonth(value ?? '')}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Mes" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(monthLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              placeholder="Año"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-full sm:w-28"
              type="number"
              min={2000}
              max={2100}
            />

            <Button
              variant="outline"
              onClick={loadPreview}
              disabled={isLoadingPreview}
              className="gap-2"
            >
              <Calculator className="size-4" />
              {isLoadingPreview ? 'Calculando...' : 'Calcular resumen'}
            </Button>
          </div>

          {selectedClosing && (
            <div className="mt-4 flex items-center gap-2">
              <Badge
                variant={selectedClosing.status === 'CLOSED' ? 'default' : 'secondary'}
              >
                {selectedClosing.status === 'CLOSED' ? 'Cerrado' : 'Abierto'}
              </Badge>
              {selectedClosing.status === 'CLOSED' && (
                <span className="text-sm text-muted-foreground">
                  Cerrado el{' '}
                  {selectedClosing.closedAt
                    ? new Date(selectedClosing.closedAt).toLocaleDateString('es-AR')
                    : '-'}
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {preview && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Comisiones pendientes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {currencyFormatter.format(preview.totals.amount)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pagos asociados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {currencyFormatter.format(preview.totals.paymentAmount)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Cantidad a cerrar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{preview.totals.count}</div>
              </CardContent>
            </Card>
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Socio</TableHead>
                  <TableHead>Cuota</TableHead>
                  <TableHead>Monto pago</TableHead>
                  <TableHead>Comisión</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.data.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No hay comisiones pendientes para cerrar
                    </TableCell>
                  </TableRow>
                ) : (
                  preview.data.map((commission: CommissionListItem) => (
                    <TableRow key={commission.id}>
                      <TableCell>
                        {new Date(commission.createdAt).toLocaleDateString('es-AR')}
                      </TableCell>
                      <TableCell>
                        {commission.member.firstName} {commission.member.lastName}
                        <div className="text-xs text-muted-foreground">
                          DNI {commission.member.dni}
                        </div>
                      </TableCell>
                      <TableCell>
                        {monthLabels[commission.fee.month]} {commission.fee.year}
                      </TableCell>
                      <TableCell>
                        {currencyFormatter.format(commission.payment.amount)}
                      </TableCell>
                      <TableCell>
                        {currencyFormatter.format(commission.amount)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleClose}
              disabled={
                isClosing ||
                isLoadingPreview ||
                selectedClosing?.status === 'CLOSED' ||
                preview.data.length === 0
              }
              className="gap-2"
            >
              <Lock className="size-4" />
              {isClosing ? 'Cerrando...' : 'Cerrar período'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
