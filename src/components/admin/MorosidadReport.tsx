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
import type { MorosidadReportItem, MorosidadReportResponse } from '@/types/report';

const currencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
});

interface Props {
  initialData: MorosidadReportResponse;
}

export function MorosidadReport({ initialData }: Props) {
  const [data, setData] = useState<MorosidadReportItem[]>(initialData.data);
  const [total, setTotal] = useState(initialData.total);
  const [totals, setTotals] = useState(initialData.totals);
  const [buckets, setBuckets] = useState(initialData.buckets);
  const [page, setPage] = useState(initialData.page);
  const [limit] = useState(initialData.limit);
  const [isLoading, setIsLoading] = useState(false);
  const now = new Date();
  const [filters, setFilters] = useState({ month: String(now.getMonth() + 1), year: String(now.getFullYear()), category: '' });

  const fetchReport = useCallback(async (params: { page: number; limit: number; month: string; year: string; category: string }) => {
    setIsLoading(true);
    try {
      const qp = new URLSearchParams();
      qp.set('page', String(params.page));
      qp.set('limit', String(params.limit));
      if (params.month) qp.set('month', params.month);
      if (params.year) qp.set('year', params.year);
      if (params.category) qp.set('category', params.category);
      const res = await fetch(`/api/admin/reports/morosidad?${qp.toString()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Error');
      const json: MorosidadReportResponse = await res.json();
      setData(json.data);
      setTotal(json.total);
      setTotals(json.totals);
      setBuckets(json.buckets);
      setPage(json.page);
    } catch {
      toast.add({ title: 'Error', description: 'No se pudo cargar el reporte', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  function buildParams(overrides: Partial<{ page: number; month: string; year: string; category: string }> = {}) {
    return {
      page,
      limit,
      month: filters.month,
      year: filters.year,
      category: filters.category,
      ...overrides,
    };
  }

  async function handleFilterChange(newFilters: { month: string; year: string; category: string }) {
    setFilters(newFilters);
    setPage(1);
    await fetchReport(buildParams({ month: newFilters.month, year: newFilters.year, category: newFilters.category, page: 1 }));
  }

  async function handlePageChange(newPage: number) {
    setPage(newPage);
    await fetchReport(buildParams({ page: newPage }));
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-4">
        {buckets.map((b) => (
          <Card key={b.key}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{b.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{b.count}</div>
              <div className="text-xs text-muted-foreground">{currencyFormatter.format(b.amount)}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Deuda vencida total</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{currencyFormatter.format(totals.totalDebt)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Cuotas vencidas</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{totals.overdueFees}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Socios morosos</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{totals.membersCount}</div></CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-1 flex-col gap-4 sm:flex-row">
          <input
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            placeholder="Mes"
            value={filters.month}
            onChange={(e) => handleFilterChange({ ...filters, month: e.target.value })}
          />
          <input
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            placeholder="Año"
            value={filters.year}
            onChange={(e) => handleFilterChange({ ...filters, year: e.target.value })}
          />
        </div>
        <ExportButton filters={{ type: 'morosidad', month: filters.month, year: filters.year, category: filters.category }} filename={`morosidad-${filters.year}-${filters.month}.xlsx`} />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Socio</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Antigüedad</TableHead>
              <TableHead>Días vencido</TableHead>
              <TableHead>Cuotas vencidas</TableHead>
              <TableHead>Deuda total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Cargando...</TableCell></TableRow>
            ) : data.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No se encontraron deudas vencidas</TableCell></TableRow>
            ) : (
              data.map((item) => (
                <TableRow key={item.memberId}>
                  <TableCell>{item.firstName} {item.lastName}<div className="text-xs text-muted-foreground">DNI {item.dni}</div></TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell>{item.bucket}</TableCell>
                  <TableCell>{item.daysPastDue}</TableCell>
                  <TableCell>{item.overdueFees}</TableCell>
                  <TableCell>{currencyFormatter.format(item.totalDebt)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Mostrando {data.length} de {total} socios</p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handlePageChange(Math.max(1, page - 1))} disabled={page === 1 || isLoading}><ChevronLeft className="size-4" /></Button>
          <span className="text-sm">Página {page} de {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => handlePageChange(Math.min(totalPages, page + 1))} disabled={page >= totalPages || isLoading}><ChevronRight className="size-4" /></Button>
        </div>
      </div>
    </div>
  );
}

// Alias export
export { MorosidadReport as AgingReport };