'use client';

import { useState, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Eye,
  MoreHorizontal,
} from 'lucide-react';
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/toast';
import type { FeeListItem, FeeListResponse } from '@/types/fee';

interface FeeListProps {
  initialData: FeeListResponse;
}

const statusLabels: Record<string, string> = {
  PENDING: 'Pendiente',
  PAID: 'Pagada',
  OVERDUE: 'Vencida',
};

const statusBadgeClasses: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
  PAID: 'bg-green-100 text-green-800 hover:bg-green-100',
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

interface FetchParams {
  page: number;
  limit: number;
  search: string;
  status: string;
  month: string;
  year: string;
}

export function FeeList({ initialData }: FeeListProps) {
  const [fees, setFees] = useState<FeeListItem[]>(initialData.data);
  const [total, setTotal] = useState(initialData.total);
  const [page, setPage] = useState(initialData.page);
  const [limit] = useState(initialData.limit);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [detailFee, setDetailFee] = useState<FeeListItem | null>(null);

  const fetchFees = useCallback(async (params: FetchParams) => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      queryParams.set('page', String(params.page));
      queryParams.set('limit', String(params.limit));
      if (params.search) queryParams.set('search', params.search);
      if (params.status) queryParams.set('status', params.status);
      if (params.month) queryParams.set('month', params.month);
      if (params.year) queryParams.set('year', params.year);

      const response = await fetch(`/api/admin/fees?${queryParams.toString()}`, {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('Error al cargar cuotas');
      }

      const data: FeeListResponse = await response.json();
      setFees(data.data);
      setTotal(data.total);
      setPage(data.page);
    } catch {
      toast.add({
        title: 'Error',
        description: 'No se pudieron cargar las cuotas',
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
      search,
      status,
      month,
      year,
      ...overrides,
    };
  }

  async function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
    await fetchFees(buildParams({ search: value, page: 1 }));
  }

  async function handleStatusChange(value: string | null) {
    const newValue = value ?? '';
    setStatus(newValue);
    setPage(1);
    await fetchFees(buildParams({ status: newValue, page: 1 }));
  }

  async function handleMonthChange(value: string | null) {
    const newValue = value ?? '';
    setMonth(newValue);
    setPage(1);
    await fetchFees(buildParams({ month: newValue, page: 1 }));
  }

  async function handleYearChange(value: string) {
    setYear(value);
    setPage(1);
    await fetchFees(buildParams({ year: value, page: 1 }));
  }

  async function handlePageChange(newPage: number) {
    setPage(newPage);
    await fetchFees(buildParams({ page: newPage }));
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-1 flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por DNI, nombre o apellido..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              <SelectItem value="PENDING">Pendiente</SelectItem>
              <SelectItem value="PAID">Pagada</SelectItem>
              <SelectItem value="OVERDUE">Vencida</SelectItem>
            </SelectContent>
          </Select>

          <Select value={month} onValueChange={handleMonthChange}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Mes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos los meses</SelectItem>
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
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Socio</TableHead>
              <TableHead>Periodo</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Vencimiento</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-16">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : fees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No se encontraron cuotas
                </TableCell>
              </TableRow>
            ) : (
              fees.map((fee) => (
                <TableRow key={fee.id}>
                  <TableCell>
                    {fee.member.firstName} {fee.member.lastName}
                    <div className="text-xs text-muted-foreground">DNI {fee.member.dni}</div>
                  </TableCell>
                  <TableCell>
                    {monthLabels[fee.month]} {fee.year}
                  </TableCell>
                  <TableCell>{currencyFormatter.format(fee.amount)}</TableCell>
                  <TableCell>{new Date(fee.dueDate).toLocaleDateString('es-AR')}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusBadgeClasses[fee.status]}>
                      {statusLabels[fee.status] ?? fee.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="ghost" size="icon" aria-label="Acciones">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        }
                      />
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => setDetailFee(fee)}>
                          <Eye className="mr-2 size-4" />
                          Ver detalle
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Mostrando {fees.length} de {total} cuotas
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
            Pagina {page} de {totalPages}
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

      <Dialog open={detailFee !== null} onOpenChange={(open) => !open && setDetailFee(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalle de cuota</DialogTitle>
            <DialogDescription>
              {detailFee && (
                <>
                  {detailFee.member.firstName} {detailFee.member.lastName} — DNI{' '}
                  {detailFee.member.dni}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {detailFee && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Periodo</span>
                <span>
                  {monthLabels[detailFee.month]} {detailFee.year}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Monto</span>
                <span>{currencyFormatter.format(detailFee.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vencimiento</span>
                <span>{new Date(detailFee.dueDate).toLocaleDateString('es-AR')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estado</span>
                <Badge variant="outline" className={statusBadgeClasses[detailFee.status]}>
                  {statusLabels[detailFee.status] ?? detailFee.status}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Categoria</span>
                <span>{detailFee.feeConfig.category}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
