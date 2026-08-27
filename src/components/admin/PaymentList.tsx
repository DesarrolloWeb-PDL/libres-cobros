'use client';

import { useState, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  CheckCircle,
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
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/toast';
import type { PaymentListItem, PaymentListResponse } from '@/types/payment';

interface PaymentListProps {
  initialData: PaymentListResponse;
}

const methodLabels: Record<string, string> = {
  stripe: 'Stripe',
  mercadopago: 'MercadoPago',
  bank_transfer: 'Transferencia',
};

const statusLabels: Record<string, string> = {
  PENDING: 'Pendiente',
  PAID: 'Pagado',
  FAILED: 'Fallido',
  REFUNDED: 'Reembolsado',
};

const statusBadgeClasses: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
  PAID: 'bg-green-100 text-green-800 hover:bg-green-100',
  FAILED: 'bg-red-100 text-red-800 hover:bg-red-100',
  REFUNDED: 'bg-gray-100 text-gray-800 hover:bg-gray-100',
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
  method: string;
  status: string;
  from: string;
  to: string;
}

export function PaymentList({ initialData }: PaymentListProps) {
  const [payments, setPayments] = useState<PaymentListItem[]>(initialData.data);
  const [total, setTotal] = useState(initialData.total);
  const [page, setPage] = useState(initialData.page);
  const [limit] = useState(initialData.limit);
  const [search, setSearch] = useState('');
  const [method, setMethod] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchPayments = useCallback(async (params: FetchParams) => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      queryParams.set('page', String(params.page));
      queryParams.set('limit', String(params.limit));
      if (params.search) queryParams.set('search', params.search);
      if (params.method) queryParams.set('method', params.method);
      if (params.status) queryParams.set('status', params.status);
      if (params.from) queryParams.set('from', params.from);
      if (params.to) queryParams.set('to', params.to);

      const response = await fetch(`/api/admin/payments?${queryParams.toString()}`, {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('Error al cargar pagos');
      }

      const data: PaymentListResponse = await response.json();
      setPayments(data.data);
      setTotal(data.total);
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
      search,
      method,
      status,
      from,
      to,
      ...overrides,
    };
  }

  async function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
    await fetchPayments(buildParams({ search: value, page: 1 }));
  }

  async function handleMethodChange(value: string | null) {
    const newValue = value ?? '';
    setMethod(newValue);
    setPage(1);
    await fetchPayments(buildParams({ method: newValue, page: 1 }));
  }

  async function handleStatusChange(value: string | null) {
    const newValue = value ?? '';
    setStatus(newValue);
    setPage(1);
    await fetchPayments(buildParams({ status: newValue, page: 1 }));
  }

  async function handleFromChange(value: string) {
    setFrom(value);
    setPage(1);
    await fetchPayments(buildParams({ from: value, page: 1 }));
  }

  async function handleToChange(value: string) {
    setTo(value);
    setPage(1);
    await fetchPayments(buildParams({ to: value, page: 1 }));
  }

  async function handlePageChange(newPage: number) {
    setPage(newPage);
    await fetchPayments(buildParams({ page: newPage }));
  }

  async function handleConfirmTransfer(paymentId: string) {
    try {
      const response = await fetch(`/api/admin/payments/${paymentId}/confirm`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al confirmar');
      }

      toast.add({
        title: 'Transferencia confirmada',
        description: 'El pago fue marcado como pagado.',
        type: 'success',
      });

      await fetchPayments(buildParams());
    } catch (err) {
      toast.add({
        title: 'Error',
        description: err instanceof Error ? err.message : 'No se pudo confirmar',
        type: 'error',
      });
    }
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

          <Select value={method} onValueChange={handleMethodChange}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Todos los métodos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              <SelectItem value="stripe">Stripe</SelectItem>
              <SelectItem value="mercadopago">MercadoPago</SelectItem>
              <SelectItem value="bank_transfer">Transferencia</SelectItem>
            </SelectContent>
          </Select>

          <Select value={status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              <SelectItem value="PENDING">Pendiente</SelectItem>
              <SelectItem value="PAID">Pagado</SelectItem>
              <SelectItem value="FAILED">Fallido</SelectItem>
              <SelectItem value="REFUNDED">Reembolsado</SelectItem>
            </SelectContent>
          </Select>

          <Input
            type="date"
            placeholder="Desde"
            value={from}
            onChange={(e) => handleFromChange(e.target.value)}
            className="w-full sm:w-40"
          />

          <Input
            type="date"
            placeholder="Hasta"
            value={to}
            onChange={(e) => handleToChange(e.target.value)}
            className="w-full sm:w-40"
          />
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Socio</TableHead>
              <TableHead>Cuota</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Método</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="w-16">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  No se encontraron pagos
                </TableCell>
              </TableRow>
            ) : (
              payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>
                    {payment.member.firstName} {payment.member.lastName}
                    <div className="text-xs text-muted-foreground">DNI {payment.member.dni}</div>
                  </TableCell>
                  <TableCell>
                    {monthLabels[payment.fee.month]} {payment.fee.year}
                  </TableCell>
                  <TableCell>{currencyFormatter.format(payment.amount)}</TableCell>
                  <TableCell>{methodLabels[payment.method] ?? payment.method}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusBadgeClasses[payment.status]}>
                      {statusLabels[payment.status] ?? payment.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(payment.createdAt).toLocaleDateString('es-AR')}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={(props) => (
                          <Button {...props} variant="ghost" size="icon" aria-label="Acciones">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        )}
                      />
                      <DropdownMenuContent>
                        {payment.method === 'bank_transfer' && payment.status === 'PENDING' && (
                          <DropdownMenuItem onClick={() => handleConfirmTransfer(payment.id)}>
                            <CheckCircle className="mr-2 size-4" />
                            Confirmar transferencia
                          </DropdownMenuItem>
                        )}
                        {payment.bankTransferRef && (
                          <DropdownMenuItem
                            onClick={() =>
                              navigator.clipboard.writeText(payment.bankTransferRef ?? '')
                            }
                          >
                            Copiar referencia
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
