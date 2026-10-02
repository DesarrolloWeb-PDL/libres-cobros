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
import type { MassMessageFilters } from '@/types/messaging';

interface MassMessageFormProps {
  initialPlans: PlanListItem[];
}

interface Filters {
  status: string;
  planId: string;
  search: string;
}

const templateVariables = [
  { key: '{nombre}', label: 'Nombre', icon: User },
  { key: '{apellido}', label: 'Apellido', icon: Users },
  { key: '{dni}', label: 'DNI', icon: Hash },
  { key: '{monto}', label: 'Monto', icon: CreditCard },
  { key: '{vencimiento}', label: 'Vencimiento', icon: Calendar },
];

export function MassMessageForm({ initialPlans }: MassMessageFormProps) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [filters, setFilters] = useState<Filters>({
    status: '',
    planId: '',
    search: '',
  });
  const [message, setMessage] = useState('');
  const [recipientCount, setRecipientCount] = useState(0);
  const [isCounting, setIsCounting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const fetchRecipientCount = useCallback(async () => {
    setIsCounting(true);
    try {
      const params = new URLSearchParams({ limit: '1' });
      if (filters.status) params.set('status', filters.status);
      if (filters.planId) params.set('planId', filters.planId);
      if (filters.search.trim()) params.set('search', filters.search.trim());

      const response = await fetch(`/api/admin/members?${params.toString()}`, {
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

    return true;
  }

  function handleOpenConfirm() {
    if (!validate()) return;
    setConfirmOpen(true);
  }

  async function handleSend() {
    setIsSending(true);
    setConfirmOpen(false);

    const payloadFilters: MassMessageFilters = {};
    if (filters.status) payloadFilters.status = filters.status as 'ACTIVE' | 'INACTIVE';
    if (filters.planId) payloadFilters.planId = filters.planId;
    if (filters.search.trim()) payloadFilters.search = filters.search.trim();

    try {
      const response = await fetch('/api/admin/messaging', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters: payloadFilters,
          message,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || 'Error al enviar los mensajes');
      }

      toast.add({
        title: 'Mensajes enviados',
        description: `${result.sent} enviados · ${result.failed} fallidos`,
        type: 'success',
      });

      setMessage('');
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
          {isSending ? 'Enviando...' : 'Enviar mensajes'}
        </Button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar envío</DialogTitle>
            <DialogDescription>
              Vas a enviar un mensaje masivo a{' '}
              <strong>{recipientCount} socios</strong>. Esta acción no se puede deshacer.
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
              Confirmar envío
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
