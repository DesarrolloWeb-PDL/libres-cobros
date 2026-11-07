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
import { ExportButton } from '@/components/admin/ExportButton';
import type { ByConceptReportItem, ByConceptReportResponse } from '@/types/report';

const currencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
});

interface Props {
  initialData: ByConceptReportResponse;
}

export function ByConceptReport({ initialData }: Props) {
  const [data, setData] = useState<ByConceptReportItem[]>(initialData.data);
  const [total, setTotal] = useState(initialData.total);
  const [totals, setTotals] = useState(initialData.totals);
  const [page, setPage] = useState(initialData.page);
  const [limit] = useState(initialData.limit);
  const [isLoading, setIsLoading] = useState(false);
  const now = new Date();
  const [filters, setFilters] = useState({ month: String(now.getMonth() + 1), year: String(now.getFullYear()), category: '', status: '' });

  const fetchReport = useCallback(async (params: { page: number; limit: number; month: string; year: string; category: string; status: string }) => {
    setIsLoading(true);
    try {
      const qp = new URLSearchParams();
      qp.set('page', String(params.page));
      qp.set('limit', String(params.limit));
      if (params.month) qp.set('month', params.month);
      if (params.year) qp.set('year', params.year);
      if (params.category) qp.set('category', params.category);
      if (params.status) qp.set('status', params.status);
      const res = await fetch(`/api/admin/reports/conceptos?${qp.toString()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Error');
      const json: ByConceptReportResponse = await res.json();
      setData(json.data);
      setTotal(json.total);
      setTotals(json.totals);
      setPage(json.page);
    } catch {
      toast.add({ title: 'Error', description: 'No se pudo cargar el reporte', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  function buildParams(overrides: Partial<{ page: number; month: string; year: string; category: string; status: string }> = {}) {
    return {
      page,
      limit,
      month: filters.month,
      year: filters.year,
      category: filters.category,
      status: filters.status,
      ...overrides,
    };
  }

  async function handleFilterChange(newFilters: { month: string; year: string; category: string; status: string }) {
    setFilters(newFilters);
    setPage(1);
    await fetchReport(buildParams({ month: newFilters.month, year: newFilters.year, category: newFilters.category, status: newFilters.status, page: 1 }));
  }

  async function handlePageChange(newPage: number) {
    setPage(newPage);
    await fetchReport(buildParams({ page: newPage }));
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total cuotas</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{totals.feeCount}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Monto total</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{currencyFormatter.format(totals.totalAmount)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Pendiente</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{currencyFormatter.format(totals.pendingAmount)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Vencido</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{currencyFormatter.format(totals.overdueAmount)}</div></CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-1 flex-col gap-4 sm:flex-row">
          <input className="h-10 rounded-md border border-input bg-background px-3 text-sm" placeholder="Mes" value={filters.month} onChange={(e) => handleFilterChange({ ...filters, month: e.target.value })} />
          <input className="h-10 rounded-md border border-input bg-background px-3 text-sm" placeholder="Año" value={filters.year} onChange={(e) => handleFilterChange({ ...filters, year: e.target.value })} />
        </div>
        <ExportButton filters={{ type: 'conceptos', month: filters.month, year: filters.year, category: filters.category }} filename={`conceptos-${filters.year}-${filters.month}.xlsx`} />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Concepto</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Cantidad</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Pendiente</TableHead>
              <TableHead>Vencido</TableHead>
              <TableHead>Pagado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Cargando...</TableCell></TableRow>
            ) : data.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">No se encontraron cuotas</TableCell></TableRow>
            ) : (
              data.map((item, idx) => (
                <TableRow key={`${item.planId ?? 'none'}-${item.category ?? 'none'}-${idx}`}>
                  <TableCell>{item.concept}</TableCell>
                  <TableCell>{item.category ?? '-'}</TableCell>
                  <TableCell>{item.feeCount}</TableCell>
                  <TableCell>{currencyFormatter.format(item.totalAmount)}</TableCell>
                  <TableCell>{currencyFormatter.format(item.pendingAmount)}</TableCell>
                  <TableCell>{currencyFormatter.format(item.overdueAmount)}</TableCell>
                  <TableCell>{currencyFormatter.format(item.paidAmount)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Mostrando {data.length} de {total} conceptos</p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handlePageChange(Math.max(1, page - 1))} disabled={page === 1 || isLoading}><ChevronLeft className="size-4" /></Button>
          <span className="text-sm">Página {page} de {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => handlePageChange(Math.min(totalPages, page + 1))} disabled={page >= totalPages || isLoading}><ChevronRight className="size-4" /></Button>
        </div>
      </div>
    </div>
  );
}

export { ByConceptReport as ConceptReport };