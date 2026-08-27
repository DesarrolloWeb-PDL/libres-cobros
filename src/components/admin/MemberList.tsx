'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Search,
  Download,
  Upload,
  Plus,
  Send,
  MessageSquare,
} from 'lucide-react';
import { BulkImportForm } from './BulkImportForm';
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
import type { MemberListItem, MemberListResponse } from '@/types/member';

interface MemberListProps {
  initialData: MemberListResponse;
}

const categoryLabels: Record<string, string> = {
  ADULT: 'Adulto',
  FAMILY: 'Familia',
  MINOR: 'Menor',
};

const statusVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  ACTIVE: 'default',
  INACTIVE: 'secondary',
};

interface FetchParams {
  page: number;
  limit: number;
  search: string;
  category: string;
  status: string;
}

export function MemberList({ initialData }: MemberListProps) {
  const router = useRouter();
  const [members, setMembers] = useState<MemberListItem[]>(initialData.data);
  const [total, setTotal] = useState(initialData.total);
  const [page, setPage] = useState(initialData.page);
  const [limit] = useState(initialData.limit);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sendingBulk, setSendingBulk] = useState(false);

  const fetchMembers = useCallback(async (params: FetchParams) => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      queryParams.set('page', String(params.page));
      queryParams.set('limit', String(params.limit));
      if (params.search) queryParams.set('search', params.search);
      if (params.category) queryParams.set('category', params.category);
      if (params.status) queryParams.set('status', params.status);

      const response = await fetch(`/api/admin/members?${queryParams.toString()}`, {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('Error al cargar socios');
      }

      const data: MemberListResponse = await response.json();
      setMembers(data.data);
      setTotal(data.total);
      setPage(data.page);
    } catch {
      toast.add({
        title: 'Error',
        description: 'No se pudieron cargar los socios',
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
      category,
      status,
      ...overrides,
    };
  }

  async function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
    await fetchMembers(buildParams({ search: value, page: 1 }));
  }

  async function handleCategoryChange(value: string | null) {
    const newValue = value ?? '';
    setCategory(newValue);
    setPage(1);
    await fetchMembers(buildParams({ category: newValue, page: 1 }));
  }

  async function handleStatusChange(value: string | null) {
    const newValue = value ?? '';
    setStatus(newValue);
    setPage(1);
    await fetchMembers(buildParams({ status: newValue, page: 1 }));
  }

  async function handlePageChange(newPage: number) {
    setPage(newPage);
    await fetchMembers(buildParams({ page: newPage }));
  }

  function toggleSelectAll() {
    if (selectedIds.size === members.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(members.map((m) => m.id)));
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function sendReminderSingle(memberId: string) {
    setSendingId(memberId);
    try {
      const response = await fetch('/api/admin/sms/send-single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al enviar el recordatorio');
      }

      const result = await response.json();
      const channelLabel = result.data?.channel === 'whatsapp' ? 'WhatsApp' : 'SMS';

      toast.add({
        title: 'Recordatorio enviado',
        description: `El ${channelLabel} fue enviado correctamente`,
        type: 'success',
      });
    } catch (error) {
      toast.add({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo enviar el recordatorio',
        type: 'error',
      });
    } finally {
      setSendingId(null);
    }
  }

  async function sendReminderBulk() {
    if (selectedIds.size === 0) return;

    setSendingBulk(true);
    try {
      const response = await fetch('/api/admin/sms/send-by-ids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberIds: Array.from(selectedIds) }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al enviar los recordatorios');
      }

      const result = await response.json();
      const channelLabel = result.data?.channel === 'whatsapp' ? 'WhatsApp' : 'SMS';

      toast.add({
        title: 'Recordatorios enviados',
        description: `${channelLabel}: ${result.data.sent} enviados, ${result.data.failed} fallidos, ${result.data.skipped} omitidos`,
        type: 'success',
      });
      setSelectedIds(new Set());
    } catch (error) {
      toast.add({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudieron enviar los recordatorios',
        type: 'error',
      });
    } finally {
      setSendingBulk(false);
    }
  }

  async function sendReminderAll() {
    if (!confirm('¿Enviar recordatorio a todos los socios con cuotas pendientes?')) return;

    setSendingBulk(true);
    try {
      const response = await fetch('/api/admin/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al enviar los recordatorios');
      }

      const result = await response.json();
      const channelLabel = result.data?.channel === 'whatsapp' ? 'WhatsApp' : 'SMS';

      toast.add({
        title: 'Recordatorios enviados',
        description: `${channelLabel}: ${result.data.sent} enviados, ${result.data.failed} fallidos, ${result.data.skipped} omitidos`,
        type: 'success',
      });
    } catch (error) {
      toast.add({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudieron enviar los recordatorios',
        type: 'error',
      });
    } finally {
      setSendingBulk(false);
    }
  }

  async function toggleStatus(member: MemberListItem) {
    const newStatus = member.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const actionLabel = newStatus === 'ACTIVE' ? 'activado' : 'desactivado';

    try {
      const response = await fetch(`/api/admin/members/${member.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al actualizar el estado');
      }

      toast.add({
        title: 'Estado actualizado',
        description: `El socio fue ${actionLabel} correctamente`,
        type: 'success',
      });

      fetchMembers(buildParams());
    } catch (error) {
      toast.add({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo actualizar el estado',
        type: 'error',
      });
    }
  }

  async function deleteMember(member: MemberListItem) {
    if (!confirm(`Eliminar a ${member.firstName} ${member.lastName}? Esta accion no se puede deshacer.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/members/${member.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al eliminar el socio');
      }

      toast.add({
        title: 'Socio eliminado',
        description: `${member.firstName} ${member.lastName} fue eliminado correctamente`,
        type: 'success',
      });

      fetchMembers(buildParams());
    } catch (error) {
      toast.add({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo eliminar el socio',
        type: 'error',
      });
    }
  }

  function handleExport() {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (category) params.set('category', category);
    if (status) params.set('status', status);

    window.open(`/api/admin/members/export?${params.toString()}`, '_blank');
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const allSelected = members.length > 0 && selectedIds.size === members.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < members.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-1 flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por DNI, nombre, email..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={category} onValueChange={handleCategoryChange}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Todas las categorias" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas</SelectItem>
              <SelectItem value="ADULT">Adulto</SelectItem>
              <SelectItem value="FAMILY">Familia</SelectItem>
              <SelectItem value="MINOR">Menor</SelectItem>
            </SelectContent>
          </Select>

          <Select value={status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              <SelectItem value="ACTIVE">Activo</SelectItem>
              <SelectItem value="INACTIVE">Inactivo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap gap-2">
          {selectedIds.size > 0 && (
            <Button variant="outline" onClick={sendReminderBulk} disabled={sendingBulk}>
              <Send className="mr-2 size-4" />
              {sendingBulk ? 'Enviando...' : `Enviar a ${selectedIds.size} seleccionados`}
            </Button>
          )}
          <Button variant="outline" onClick={sendReminderAll} disabled={sendingBulk}>
            <MessageSquare className="mr-2 size-4" />
            {sendingBulk ? 'Enviando...' : 'Enviar a todos con deuda'}
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 size-4" />
            Exportar
          </Button>
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="mr-2 size-4" />
            Importar
          </Button>
          <Button onClick={() => router.push('/admin/socios/nuevo')}>
            <Plus className="mr-2 size-4" />
            Nuevo socio
          </Button>
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = someSelected; }}
                  onChange={toggleSelectAll}
                  className="size-4"
                />
              </TableHead>
              <TableHead>DNI</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-20">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No se encontraron socios
                </TableCell>
              </TableRow>
            ) : (
              members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(member.id)}
                      onChange={() => toggleSelect(member.id)}
                      className="size-4"
                    />
                  </TableCell>
                  <TableCell>{member.dni}</TableCell>
                  <TableCell>
                    {member.firstName} {member.lastName}
                    {member.email && (
                      <div className="text-xs text-muted-foreground">{member.email}</div>
                    )}
                  </TableCell>
                  <TableCell>{categoryLabels[member.category] ?? member.category}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariants[member.status] ?? 'default'}>
                      {member.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                    </Badge>
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
                        <DropdownMenuItem
                          onClick={() => router.push(`/admin/socios/${member.id}`)}
                        >
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleStatus(member)}>
                          {member.status === 'ACTIVE' ? 'Desactivar' : 'Activar'}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => sendReminderSingle(member.id)}
                          disabled={sendingId === member.id}
                        >
                          <Send className="mr-2 size-4" />
                          {sendingId === member.id ? 'Enviando...' : 'Enviar recordatorio'}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => deleteMember(member)}
                        >
                          Eliminar
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
          Mostrando {members.length} de {total} socios
          {selectedIds.size > 0 && ` · ${selectedIds.size} seleccionados`}
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

      <BulkImportForm
        open={importOpen}
        onOpenChange={setImportOpen}
        onSuccess={() => fetchMembers(buildParams())}
      />
    </div>
  );
}
