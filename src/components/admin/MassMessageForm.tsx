'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Send,
  Loader2,
  User,
  Users,
  CreditCard,
  Calendar,
  Hash,
  Clock,
  ListFilter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StyledSelect } from '@/components/ui/styled-select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import type { PlanListItem } from '@/types/fee';
import type { MassMessageFilters, MassMessageSegment } from '@/types/messaging';

interface MassMessageFormProps {
  initialPlans: PlanListItem[];
  initialCategories: string[];
}

interface Filters {
  status: string;
  planId: string;
  search: string;
  segment: MassMessageSegment | '';
  category: string;
}

const segmentOptions: { value: MassMessageSegment | ''; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'up_to_date', label: 'Al día' },
  { value: 'debt', label: 'Con deuda' },
  { value: 'overdue', label: 'En mora' },
];

const templateVariables = [
  { key: '{nombre}', label: 'Nombre', icon: User },
  { key: '{apellido}', label: 'Apellido', icon: Users },
  { key: '{dni}', label: 'DNI', icon: Hash },
  { key: '{monto}', label: 'Monto', icon: CreditCard },
  { key: '{vencimiento}', label: 'Vencimiento', icon: Calendar },
];

export function MassMessageForm({ initialPlans, initialCategories }: MassMessageFormProps) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [filters, setFilters] = useState<Filters>({
    status: '',
    planId: '',
    search: '',
    segment: '',
    category: '',
  });
  const [message, setMessage] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [recipientCount, setRecipientCount] = useState(0);
  const [isCounting, setIsCounting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const fetchRecipientCount = useCallback(async () => {
    setIsCounting(true);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.planId) params.set('planId', filters.planId);
      if (filters.search.trim()) params.set('search', filters.search.trim());
      if (filters.segment) params.set('segment', filters.segment);
      if (filters.category) params.set('category', filters.category);

      const response = await fetch(`/api/admin/messaging/count?${params.toString()}`, {
        cache: 'no-store',
      });

      if (!response.ok) throw new Error('Error al contar destinatarios');

      const data = await response.json();
      setRecipientCount(data.total ?? 0);
    } catch {
      setRecipientCount(0);
    } finally {
      setIsCounting(false);
    }
  }, [filters]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchRecipientCount();
    }, 300);

    return () => clearTimeout(timeout);
  }, [fetchRecipientCount]);

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function insertVariable(variable: string) {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart ?? message.length;
    const end = textarea.selectionEnd ?? message.length;
    const before = message.slice(0, start);
    const after = message.slice(end);
    const next = `${before}${variable}${after}`;

    setMessage(next);

    requestAnimationFrame(() => {
      const newPosition = start + variable.length;
      textarea.setSelectionRange(newPosition, newPosition);
      textarea.focus();
    });
  }

  function validate(): boolean {
    if (!message.trim()) {
      toast.add({
        title: 'Mensaje vacío',
        description: 'Escribí el mensaje antes de enviarlo',
        type: 'error',
      });
      return false;
    }

    if (recipientCount === 0) {
      toast.add({
        title: 'Sin destinatarios',
        description: 'No hay socios que coincidan con los filtros seleccionados',
        type: 'error',
      });
      return false;
    }

    if (scheduledAt) {
      const selected = new Date(scheduledAt);
      if (Number.isNaN(selected.getTime()) || selected.getTime() <= Date.now()) {
        toast.add({
          title: 'Fecha inválida',
          description: 'La fecha de envío programado debe ser futura',
          type: 'error',
        });
        return false;
      }
    }

    return true;
  }

  function handleOpenConfirm() {
    if (!validate()) return;
    setConfirmOpen(true);
  }

  async function handleSend() {
    setIsSending(true);
    setConfirmOpen(false);

    const payloadFilters: MassMessageFilters = {
      segment: filters.segment || 'all',
    };
    if (filters.status) payloadFilters.status = filters.status as 'ACTIVE' | 'INACTIVE';
    if (filters.planId) payloadFilters.planId = filters.planId;
    if (filters.search.trim()) payloadFilters.search = filters.search.trim();
    if (filters.category) payloadFilters.category = filters.category;

    try {
      const response = await fetch('/api/admin/messaging', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters: payloadFilters,
          message,
          ...(scheduledAt && { scheduledAt }),
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || 'Error al enviar los mensajes');
      }

      if (result.scheduled) {
        toast.add({
          title: 'Envío programado',
          description: `El mensaje se enviará a ${recipientCount} socios en la fecha indicada`,
          type: 'success',
        });
      } else {
        toast.add({
          title: 'Mensajes enviados',
          description: `${result.sent} enviados · ${result.failed} fallidos`,
          type: 'success',
        });
      }

      setMessage('');
      setScheduledAt('');
      router.refresh();
    } catch (error) {
      toast.add({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudieron enviar los mensajes',
        type: 'error',
      });
    } finally {
      setIsSending(false);
    }
  }

  const isScheduled = Boolean(scheduledAt);

  return (
    <div className="space-y-6 rounded-2xl border bg-card p-5 shadow-sm">
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="flex-1 space-y-2">
            <Label htmlFor="message-search">Buscar</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="message-search"
                placeholder="Nombre o DNI..."
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="w-full space-y-2 sm:w-44">
            <Label htmlFor="message-status">Estado</Label>
            <StyledSelect
              id="message-status"
              value={filters.status}
              onChange={(value) => updateFilter('status', value as Filters['status'])}
              options={[
                { value: '', label: 'Todos' },
                { value: 'ACTIVE', label: 'Activo' },
                { value: 'INACTIVE', label: 'Inactivo' },
              ]}
              placeholder="Todos"
            />
          </div>

          <div className="w-full space-y-2 sm:w-56">
            <Label htmlFor="message-plan">Plan</Label>
            <StyledSelect
              id="message-plan"
              value={filters.planId}
              onChange={(value) => updateFilter('planId', value as Filters['planId'])}
              options={[
                { value: '', label: 'Todos los planes' },
                ...initialPlans.map((plan) => ({
                  value: plan.id,
                  label: plan.name,
                })),
              ]}
              placeholder="Todos los planes"
            />
          </div>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="w-full space-y-2 sm:w-56">
            <Label htmlFor="message-segment" className="flex items-center gap-1.5">
              <ListFilter className="size-3.5" />
              Segmento
            </Label>
            <StyledSelect
              id="message-segment"
              value={filters.segment}
              onChange={(value) => updateFilter('segment', value as Filters['segment'])}
              options={segmentOptions}
              placeholder="Todos"
            />
          </div>

          <div className="w-full space-y-2 sm:w-56">
            <Label htmlFor="message-category">Categoría</Label>
            <StyledSelect
              id="message-category"
              value={filters.category}
              onChange={(value) => updateFilter('category', value as Filters['category'])}
              options={[
                { value: '', label: 'Todas las categorías' },
                ...initialCategories.map((category) => ({
                  value: category,
                  label: category,
                })),
              ]}
              placeholder="Todas las categorías"
            />
          </div>

          <div className="flex-1 space-y-2">
            <Label htmlFor="message-scheduled" className="flex items-center gap-1.5">
              <Clock className="size-3.5" />
              Programar envío (opcional)
            </Label>
            <Input
              id="message-scheduled"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              placeholder="Ahora"
            />
            <p className="text-xs text-muted-foreground">Horario de Argentina (UTC-3).</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {isCounting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Contando destinatarios...
            </>
          ) : (
            <>
              <Users className="size-4" />
              <span className="font-medium text-foreground">{recipientCount}</span> socios
              seleccionados
            </>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="message-body">Mensaje</Label>
        <textarea
          id="message-body"
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Escribí el mensaje. Usá las variables para personalizarlo."
          className={cn(
            'flex min-h-[140px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'
          )}
        />
        <p className="text-xs text-muted-foreground">
          Disponible:{' '}
          {templateVariables.map((variable, index) => (
            <span key={variable.key}>
              <code className="rounded bg-muted px-1 py-0.5 text-xs">{variable.key}</code>
              {index < templateVariables.length - 1 ? ' · ' : ''}
            </span>
          ))}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {templateVariables.map((variable) => {
          const Icon = variable.icon;
          return (
            <Button
              key={variable.key}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => insertVariable(variable.key)}
              className="gap-1.5"
            >
              <Icon className="size-3.5" />
              {variable.label}
            </Button>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleOpenConfirm}
          disabled={isSending || recipientCount === 0}
          className="gap-2"
        >
          {isSending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          {isScheduled ? 'Programar envío' : 'Enviar mensajes'}
        </Button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isScheduled ? 'Confirmar programación' : 'Confirmar envío'}</DialogTitle>
            <DialogDescription>
              {isScheduled ? (
                <>
                  Vas a programar un mensaje masivo a{' '}
                  <strong>{recipientCount} socios</strong> para el{' '}
                  <strong>
                    {scheduledAt
                      ? new Date(scheduledAt).toLocaleString('es-AR')
                      : 'fecha seleccionada'}
                  </strong>
                  .
                </>
              ) : (
                <>
                  Vas a enviar un mensaje masivo a{' '}
                  <strong>{recipientCount} socios</strong>. Esta acción no se puede deshacer.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border bg-muted/50 p-3 text-sm">
            <p className="line-clamp-6 whitespace-pre-wrap">{message}</p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={isSending}>
              Cancelar
            </Button>
            <Button onClick={handleSend} disabled={isSending} className="gap-2">
              {isSending && <Loader2 className="size-4 animate-spin" />}
              {isScheduled ? 'Confirmar programación' : 'Confirmar envío'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
