'use client';

import { useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { ReportFilter, type ReportFilterValues } from '@/components/admin/ReportFilter';
import { ExportButton } from '@/components/admin/ExportButton';
import type { PaymentReportItem, PaymentReportResponse } from '@/types/report';

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

interface PaymentReportProps {
  initialData: PaymentReportResponse;
}

interface FetchParams {
  page: number;
  limit: number;
  from: string;
  to: string;
  method: string;
}

export function PaymentReport({ initialData }: PaymentReportProps) {
  const [payments, setPayments] = useState<PaymentReportItem[]>(initialData.data);
  const [total, setTotal] = useState(initialData.total);
  const [totals, setTotals] = useState(initialData.totals);
  const [page, setPage] = useState(initialData.page);
  const [limit] = useState(initialData.limit);
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const [filters, setFilters] = useState<ReportFilterValues>({
    month: String(now.getMonth() + 1),
    year: String(now.getFullYear()),
    category: '',
    method: '',
    status: '',
    from: firstDay.toISOString().slice(0, 10),
    to: lastDay.toISOString().slice(0, 10),
  });
  const [isLoading, setIsLoading] = useState(false);

  const fetchPayments = useCallback(async (params: FetchParams) => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      queryParams.set('page', String(params.page));
      queryParams.set('limit', String(params.limit));
      if (params.from) queryParams.set('from', params.from);
      if (params.to) queryParams.set('to', params.to);
      if (params.method) queryParams.set('method', params.method);

      const response = await fetch(`/api/admin/reports/payments?${queryParams.toString()}`, {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('Error al cargar el historial de pagos');
      }

      const data: PaymentReportResponse = await response.json();
      setPayments(data.data);
      setTotal(data.total);
      setTotals(data.totals);
      setPage(data.page);
    } catch {
      toast.add({
        title: 'Error',
        description: 'No se pudieron cargar los pagos',
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
      from: filters.from,
      to: filters.to,
      method: filters.method,
      ...overrides,
    };
  }

  async function handleFilterChange(newFilters: ReportFilterValues) {
    setFilters(newFilters);
    setPage(1);
    await fetchPayments(buildParams({
      from: newFilters.from,
      to: newFilters.to,
      method: newFilters.method,
      page: 1,
    }));
  }

  async function handlePageChange(newPage: number) {
    setPage(newPage);
    await fetchPayments(buildParams({ page: newPage }));
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total pagado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currencyFormatter.format(totals.amount)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cantidad de pagos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.count}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <ReportFilter
          values={filters}
          onChange={handleFilterChange}
          showPeriod={false}
          showMethod
          showDateRange
        />

        <ExportButton
          filters={{
            type: 'payments',
            from: filters.from,
            to: filters.to,
            method: filters.method,
          }}
          filename={`pagos-${filters.from}-a-${filters.to}.xlsx`}
        />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Socio</TableHead>
              <TableHead>Período</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Método</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  No se encontraron pagos
                </TableCell>
              </TableRow>
            ) : (
              payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>
                    {new Date(payment.confirmedAt).toLocaleDateString('es-AR')}
                  </TableCell>
                  <TableCell>
                    {payment.member.firstName} {payment.member.lastName}
                    <div className="text-xs text-muted-foreground">
                      DNI {payment.member.dni}
                    </div>
                  </TableCell>
                  <TableCell>
                    {monthLabels[payment.fee.month]} {payment.fee.year}
                  </TableCell>
                  <TableCell>{currencyFormatter.format(payment.amount)}</TableCell>
                  <TableCell>{methodLabels[payment.method] ?? payment.method}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Mostrando {payments.length} de {total} pagos
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
