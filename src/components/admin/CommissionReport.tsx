'use client';

import { useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
import { toast } from '@/components/ui/toast';
import { ExportButton } from '@/components/admin/ExportButton';
import type { CommissionListItem, CommissionListResponse } from '@/types/commission';

interface CommissionReportProps {
  initialData: CommissionListResponse;
}

const methodLabels: Record<string, string> = {
  stripe: 'Stripe',
  mercadopago: 'MercadoPago',
  bank_transfer: 'Transferencia',
};

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

interface FetchParams {
  page: number;
  limit: number;
  month: string;
  year: string;
}

export function CommissionReport({ initialData }: CommissionReportProps) {
  const [commissions, setCommissions] = useState<CommissionListItem[]>(initialData.data);
  const [total, setTotal] = useState(initialData.total);
  const [totals, setTotals] = useState(initialData.totals);
  const [page, setPage] = useState(initialData.page);
  const [limit] = useState(initialData.limit);
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [isLoading, setIsLoading] = useState(false);

  const fetchCommissions = useCallback(async (params: FetchParams) => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      queryParams.set('page', String(params.page));
      queryParams.set('limit', String(params.limit));
      if (params.month) queryParams.set('month', params.month);
      if (params.year) queryParams.set('year', params.year);

      const response = await fetch(`/api/admin/reports/commissions?${queryParams.toString()}`, {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('Error al cargar comisiones');
      }

      const data: CommissionListResponse = await response.json();
      setCommissions(data.data);
      setTotal(data.total);
      setTotals(data.totals);
      setPage(data.page);
    } catch {
      toast.add({
        title: 'Error',
        description: 'No se pudieron cargar las comisiones',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  function buildParams(overrides: Partial<FetchParams> = {}): FetchParams {
    return {
      page,
      limit,
      month,
      year,
      ...overrides,
    };
  }

  async function handleMonthChange(value: string | null) {
    const newValue = value ?? '';
    setMonth(newValue);
    setPage(1);
    await fetchCommissions(buildParams({ month: newValue, page: 1 }));
  }

  async function handleYearChange(value: string) {
    setYear(value);
    setPage(1);
    await fetchCommissions(buildParams({ year: value, page: 1 }));
  }

  async function handlePageChange(newPage: number) {
    setPage(newPage);
    await fetchCommissions(buildParams({ page: newPage }));
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total comisiones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currencyFormatter.format(totals.amount)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total pagos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currencyFormatter.format(totals.paymentAmount)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cantidad
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.count}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-1 flex-col gap-4 sm:flex-row">
          <Select value={month} onValueChange={handleMonthChange}>
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
            onChange={(e) => handleYearChange(e.target.value)}
            className="w-full sm:w-28"
            type="number"
            min={2000}
            max={2100}
          />
        </div>

        <ExportButton
          filters={{
            type: 'commissions',
            month,
            year,
          }}
          filename={`comisiones-${year}-${month}.xlsx`}
        />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Socio</TableHead>
              <TableHead>Cuota</TableHead>
              <TableHead>Monto pago</TableHead>
              <TableHead>Tasa</TableHead>
              <TableHead>Comisión</TableHead>
              <TableHead>Método</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : commissions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  No se encontraron comisiones
                </TableCell>
              </TableRow>
            ) : (
              commissions.map((commission) => (
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
                  <TableCell>{commission.rate}%</TableCell>
                  <TableCell>{currencyFormatter.format(commission.amount)}</TableCell>
                  <TableCell>
                    {methodLabels[commission.payment.method] ?? commission.payment.method}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Mostrando {commissions.length} de {total} comisiones
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(Math.max(1, page - 1))}
            disabled={page === 1 || isLoading}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-sm">
            Página {page} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages || isLoading}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
