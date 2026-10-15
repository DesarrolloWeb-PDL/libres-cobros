'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, Calendar, CreditCard, Loader2, RefreshCw, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import type { AutoDebitInfo, CreateMemberAutoDebitResponse } from '@/types/autodebit';

interface AutoDebitSectionProps {
  dni: string;
  clubSlug: string;
  memberEmail: string | null;
  /** Optional seed; the section refreshes status from the API on mount. */
  currentAutoDebit?: AutoDebitInfo | null;
}

type Gateway = 'mercadopago' | 'stripe';

const statusLabels: Record<string, string> = {
  ACTIVE: 'Activo',
  PENDING_AUTH: 'Pendiente de activación',
  FAILED: 'Falló',
  PAUSED: 'Pausado',
  CANCELLED: 'Cancelado',
};

const statusBadgeClasses: Record<string, string> = {
  ACTIVE:
    'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
  PENDING_AUTH:
    'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
  FAILED:
    'bg-red-100 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-950 dark:text-red-300 dark:border-red-800',
  PAUSED:
    'bg-zinc-100 text-zinc-700 border-zinc-200 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-700',
  CANCELLED:
    'bg-zinc-100 text-zinc-700 border-zinc-200 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-700',
};

const gatewayLabels: Record<string, string> = {
  mercadopago: 'Mercado Pago',
  stripe: 'Stripe',
};

const currencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
});

export function AutoDebitSection({
  dni,
  clubSlug,
  memberEmail,
  currentAutoDebit = null,
}: AutoDebitSectionProps) {
  const [autoDebit, setAutoDebit] = useState<AutoDebitInfo | null>(currentAutoDebit);
  // MP authorization URL only lives in memory: it is returned on creation and
  // never persisted server-side, so the "complete authorization" link is
  // available right after subscribing (the member also gets the email from MP).
  const [authorizationUrl, setAuthorizationUrl] = useState<string | null>(null);
  const [managementUrl, setManagementUrl] = useState<string | null>(null);
  const [loadingGateway, setLoadingGateway] = useState<Gateway | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    // Refresh from the API on mount so returning members always see the
    // current gateway-side status (webhooks may have updated it).
    async function loadAutoDebit() {
      try {
        const response = await fetch(
          `/api/member/autodebit?dni=${encodeURIComponent(dni)}&clubSlug=${encodeURIComponent(clubSlug)}`,
          { cache: 'no-store' }
        );
        const data = await response.json();

        if (response.ok) {
          setAutoDebit(data.autoDebit ?? null);
        }
      } catch {
        // Keep the seeded value; the section stays usable without a hard failure.
      }
    }

    loadAutoDebit();
  }, [dni, clubSlug]);

  async function handleSubscribe(gateway: Gateway) {
    setLoadingGateway(gateway);
    try {
      const response = await fetch('/api/member/autodebit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dni, clubSlug, gateway }),
      });

      const data: CreateMemberAutoDebitResponse & { error?: string } = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo activar el débito automático');
      }

      setAutoDebit(data.autoDebit);
      setManagementUrl(data.managementUrl ?? null);

      if (data.authorizationUrl) {
        setAuthorizationUrl(data.authorizationUrl);
        window.location.assign(data.authorizationUrl);
        return;
      }

      toast.add({
        title: 'Débito automático activado',
        description: 'Ya estás suscripto al cobro mensual automático.',
        type: 'success',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo activar el débito automático';
      toast.add({
        title: 'Error',
        description: message,
        type: 'error',
      });
    } finally {
      setLoadingGateway(null);
    }
  }

  async function handleCancel() {
    if (!autoDebit) return;

    setCancelling(true);
    try {
      const response = await fetch('/api/member/autodebit', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dni, clubSlug }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo cancelar la suscripción');
      }

      setAutoDebit(data.autoDebit ?? null);
      setAuthorizationUrl(null);
      setManagementUrl(null);
      setCancelOpen(false);

      toast.add({
        title: 'Suscripción cancelada',
        description: 'El débito automático fue cancelado correctamente.',
        type: 'success',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo cancelar la suscripción';
      toast.add({
        title: 'Error',
        description: message,
        type: 'error',
      });
    } finally {
      setCancelling(false);
    }
  }

  const cancelButton = (
    <Button
      variant="outline"
      className="w-full"
      onClick={() => setCancelOpen(true)}
      disabled={cancelling}
    >
      Cancelar suscripción
    </Button>
  );

  return (
    <>
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <RefreshCw className="size-4 text-accent" />
          <h3 className="font-semibold text-sm">Débito automático</h3>
          {autoDebit && (
            <Badge variant="outline" className={statusBadgeClasses[autoDebit.status]}>
              {statusLabels[autoDebit.status] ?? autoDebit.status}
            </Badge>
          )}
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Suscribite a débito automático y olvídate de perseguir la cuota. Se cobra
          automáticamente cada mes.
        </p>

        {!autoDebit && !memberEmail && (
          <div className="flex items-start gap-2 rounded-xl bg-amber-100 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>Necesitás tener un email cargado para activar el débito automático</span>
          </div>
        )}

        {!autoDebit && memberEmail && (
          <div className="space-y-3">
            <Button
              className="w-full h-11"
              onClick={() => handleSubscribe('mercadopago')}
              disabled={loadingGateway !== null}
            >
              {loadingGateway === 'mercadopago' ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Wallet className="mr-2 size-4" />
              )}
              Activar con Mercado Pago
            </Button>
            <Button
              className="w-full h-11"
              onClick={() => handleSubscribe('stripe')}
              disabled={loadingGateway !== null}
            >
              {loadingGateway === 'stripe' ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <CreditCard className="mr-2 size-4" />
              )}
              Activar con Stripe
            </Button>
          </div>
        )}

        {autoDebit && (autoDebit.status === 'ACTIVE' || autoDebit.status === 'PENDING_AUTH' || autoDebit.status === 'PAUSED') && (
          <div className="space-y-3">
            <dl className="space-y-1.5 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Medio de pago</dt>
                <dd className="font-medium">{gatewayLabels[autoDebit.gateway] ?? autoDebit.gateway}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Importe mensual</dt>
                <dd className="font-medium">{currencyFormatter.format(autoDebit.amount)}</dd>
              </div>
              {autoDebit.status === 'ACTIVE' && autoDebit.nextBillingAt && (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Próximo cobro</dt>
                  <dd className="flex items-center gap-1.5 font-medium">
                    <Calendar className="size-3.5" />
                    {new Date(autoDebit.nextBillingAt).toLocaleDateString('es-AR')}
                  </dd>
                </div>
              )}
            </dl>

            {autoDebit.status === 'PENDING_AUTH' && (
              <div className="flex items-start gap-2 rounded-xl bg-amber-100 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>
                  Tu autorización está pendiente. Completá la activación desde el email que te
                  envió {gatewayLabels[autoDebit.gateway] ?? autoDebit.gateway}.
                </span>
              </div>
            )}

            {autoDebit.status === 'PENDING_AUTH' && authorizationUrl && (
              <Button className="w-full h-11" onClick={() => window.location.assign(authorizationUrl)}>
                Completar autorización
              </Button>
            )}

            {autoDebit.status === 'PAUSED' && (
              <p className="text-sm text-muted-foreground">
                Tu suscripción está pausada. Contactá con administración para reactivarla.
              </p>
            )}

            {cancelButton}
          </div>
        )}

        {autoDebit && autoDebit.status === 'FAILED' && (
          <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-xl bg-red-100 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-300">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>El último cobro automático falló. Podés reintentar la suscripción.</span>
            </div>
            <Button
              className="w-full h-11"
              onClick={() => handleSubscribe(autoDebit.gateway as Gateway)}
              disabled={loadingGateway !== null}
            >
              {loadingGateway ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 size-4" />
              )}
              Reintentar
            </Button>
          </div>
        )}

        {autoDebit && autoDebit.status === 'CANCELLED' && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Suscripción cancelada.</p>
            <Button
              className="w-full h-11"
              onClick={() => handleSubscribe(autoDebit.gateway as Gateway)}
              disabled={loadingGateway !== null}
            >
              {loadingGateway ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 size-4" />
              )}
              Reactivar
            </Button>
          </div>
        )}

        {managementUrl && autoDebit?.status === 'ACTIVE' && (
          <a
            href={managementUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-sm font-medium text-primary underline underline-offset-4 hover:text-primary/80"
          >
            Gestionar suscripción
          </a>
        )}
      </div>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="sm:max-w-md bg-card text-card-foreground border border-border shadow-xl">
          <DialogHeader>
            <DialogTitle>Cancelar suscripción</DialogTitle>
            <DialogDescription>
              ¿Confirmás que querés cancelar el débito automático? Vas a tener que pagar la
              cuota manualmente cada mes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)} disabled={cancelling}>
              Volver
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={cancelling}>
              {cancelling ? 'Cancelando...' : 'Cancelar suscripción'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
