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
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/toast';
import { ReportFilter, type ReportFilterValues } from '@/components/admin/ReportFilter';
import { ExportButton } from '@/components/admin/ExportButton';
import type { DebtReportItem, DebtReportResponse } from '@/types/report';

const statusBadgeClasses: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
  OVERDUE: 'bg-red-100 text-red-800 hover:bg-red-100',
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

interface DebtReportProps {
  initialData: DebtReportResponse;
}

interface FetchParams {
  page: number;
  limit: number;
  month: string;
  year: string;
  category: string;
}

export function DebtReport({ initialData }: DebtReportProps) {
  const [debts, setDebts] = useState<DebtReportItem[]>(initialData.data);
  const [total, setTotal] = useState(initialData.total);
  const [totals, setTotals] = useState(initialData.totals);
  const [page, setPage] = useState(initialData.page);
  const [limit] = useState(initialData.limit);
  const now = new Date();
  const [filters, setFilters] = useState<ReportFilterValues>({
    month: String(now.getMonth() + 1),
    year: String(now.getFullYear()),
    category: '',
    method: '',
    status: '',
    from: '',
    to: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const fetchDebts = useCallback(async (params: FetchParams) => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      queryParams.set('page', String(params.page));
      queryParams.set('limit', String(params.limit));
      if (params.month) queryParams.set('month', params.month);
      if (params.year) queryParams.set('year', params.year);
      if (params.category) queryParams.set('category', params.category);

      const response = await fetch(`/api/admin/reports/debts?${queryParams.toString()}`, {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('Error al cargar el reporte de deudas');
      }

      const data: DebtReportResponse = await response.json();
      setDebts(data.data);
      setTotal(data.total);
      setTotals(data.totals);
      setPage(data.page);
    } catch {
      toast.add({
        title: 'Error',
        description: 'No se pudieron cargar las deudas',
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
      month: filters.month,
      year: filters.year,
      category: filters.category,
      ...overrides,
    };
  }

  async function handleFilterChange(newFilters: ReportFilterValues) {
    setFilters(newFilters);
    setPage(1);
    await fetchDebts(buildParams({
      month: newFilters.month,
      year: newFilters.year,
      category: newFilters.category,
      page: 1,
    }));
  }

  async function handlePageChange(newPage: number) {
    setPage(newPage);
    await fetchDebts(buildParams({ page: newPage }));
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Deuda total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currencyFormatter.format(totals.totalDebt)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cuotas pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.pendingFees}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cuotas vencidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.overdueFees}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <ReportFilter
          values={filters}
          onChange={handleFilterChange}
          showPeriod
          showCategory
        />

        <ExportButton
          filters={{
            type: 'debts',
            month: filters.month,
            year: filters.year,
            category: filters.category,
          }}
          filename={`deudas-${filters.year}-${filters.month}.xlsx`}
        />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Socio</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Cuotas pendientes</TableHead>
              <TableHead>Cuotas vencidas</TableHead>
              <TableHead>Deuda total</TableHead>
              <TableHead>Detalle</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : debts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No se encontraron deudas
                </TableCell>
              </TableRow>
            ) : (
              debts.map((debt) => (
                <TableRow key={debt.memberId}>
                  <TableCell>
                    {debt.firstName} {debt.lastName}
                    <div className="text-xs text-muted-foreground">DNI {debt.dni}</div>
                  </TableCell>
                  <TableCell>{debt.category}</TableCell>
                  <TableCell>{debt.pendingFees}</TableCell>
                  <TableCell>{debt.overdueFees}</TableCell>
                  <TableCell>{currencyFormatter.format(debt.totalDebt)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {debt.fees.slice(0, 3).map((fee) => (
                        <Badge
                          key={fee.id}
                          variant="outline"
                          className={statusBadgeClasses[fee.status]}
                        >
                          {monthLabels[fee.month]} {fee.year}
                        </Badge>
                      ))}
                      {debt.fees.length > 3 && (
                        <Badge variant="outline">+{debt.fees.length - 3}</Badge>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Mostrando {debts.length} de {total} socios
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
