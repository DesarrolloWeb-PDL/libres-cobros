'use client';

import { useEffect, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  Check,
  Copy,
  CreditCard,
  Loader2,
  RefreshCw,
  Wallet,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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

interface AdminAutoDebitSectionProps {
  memberId: string;
  memberEmail: string | null;
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

export function AdminAutoDebitSection({ memberId, memberEmail }: AdminAutoDebitSectionProps) {
  const [autoDebit, setAutoDebit] = useState<AutoDebitInfo | null>(null);
  // Authorization/management URLs only live in memory: they are returned on
  // creation and never persisted server-side, so the link the admin must send
  // to the member is available right after subscribing.
  const [authorizationUrl, setAuthorizationUrl] = useState<string | null>(null);
  const [managementUrl, setManagementUrl] = useState<string | null>(null);
  const [loadingGateway, setLoadingGateway] = useState<Gateway | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Refresh from the API on mount so the section always reflects the
    // current gateway-side status (webhooks may have updated it).
    async function loadAutoDebit() {
      try {
        const response = await fetch(`/api/admin/members/${memberId}/autodebit`, {
          cache: 'no-store',
        });
        const data = await response.json();

        if (response.ok) {
          setAutoDebit(data.autoDebit ?? null);
        }
      } catch {
        // Keep the empty seed; the section stays usable without a hard failure.
      }
    }

    loadAutoDebit();
  }, [memberId]);

  async function handleSubscribe(gateway: Gateway) {
    setLoadingGateway(gateway);
    try {
      const response = await fetch(`/api/admin/members/${memberId}/autodebit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gateway }),
      });

      const data: CreateMemberAutoDebitResponse & { error?: string } = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo activar el débito automático');
      }

      setAutoDebit(data.autoDebit);
      setAuthorizationUrl(data.authorizationUrl ?? null);
      setManagementUrl(data.managementUrl ?? null);

      if (data.authorizationUrl) {
        // Mercado Pago needs the member's own authorization, so the admin gets
        // the link to forward instead of being redirected.
        toast.add({
          title: 'Link de autorización generado',
          description: 'Enviale el link al socio para que autorice los débitos.',
          type: 'success',
        });
        return;
      }

      toast.add({
        title: 'Débito automático activado',
        description: 'La suscripción quedó activa y se debita mensualmente.',
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
      const response = await fetch(`/api/admin/members/${memberId}/autodebit`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
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

  async function handleCopyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.add({
        title: 'Link copiado',
        description: 'Ya está en el portapapeles, listo para enviarle al socio.',
        type: 'success',
      });
    } catch {
      toast.add({
        title: 'Error',
        description: 'No se pudo copiar el link',
        type: 'error',
      });
    }
  }

  const subscribeButtons = (
    <div className="space-y-3">
      <Button
        className="w-full h-11"
        onClick={() => handleSubscribe('mercadopago')}
        disabled={!memberEmail || loadingGateway !== null}
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
        disabled={!memberEmail || loadingGateway !== null}
      >
        {loadingGateway === 'stripe' ? (
          <Loader2 className="mr-2 size-4 animate-spin" />
        ) : (
          <CreditCard className="mr-2 size-4" />
        )}
        Activar con Stripe
      </Button>
      {!memberEmail && (
        <div className="flex items-start gap-2 rounded-xl bg-amber-100 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>Cargá un email en los datos del socio para activar el débito automático</span>
        </div>
      )}
    </div>
  );

  const linkToShare = authorizationUrl ?? managementUrl;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <RefreshCw className="size-4 text-accent" />
            <CardTitle>Débito automático</CardTitle>
            {autoDebit && (
              <Badge variant="outline" className={statusBadgeClasses[autoDebit.status]}>
                {statusLabels[autoDebit.status] ?? autoDebit.status}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Activá el cobro mensual automático para este socio. Se debita de su cuenta y
            acredita en la institución.
          </p>

          {(!autoDebit || autoDebit.status === 'CANCELLED' || autoDebit.status === 'FAILED') &&
            subscribeButtons}

          {autoDebit && autoDebit.status === 'FAILED' && (
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-100 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-300">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>El último cobro automático falló. Podés reintentar la suscripción.</span>
            </div>
          )}

          {autoDebit && autoDebit.status === 'CANCELLED' && (
            <p className="mt-3 text-sm text-muted-foreground">
              Suscripción cancelada. Podés activar un débito automático nuevo.
            </p>
          )}

          {autoDebit &&
            (autoDebit.status === 'ACTIVE' ||
              autoDebit.status === 'PENDING_AUTH' ||
              autoDebit.status === 'PAUSED') && (
              <div className="space-y-3">
                <dl className="space-y-1.5 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Medio de pago</dt>
                    <dd className="font-medium">
                      {gatewayLabels[autoDebit.gateway] ?? autoDebit.gateway}
                    </dd>
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
                      La autorización del socio está pendiente. El débito empieza a correr
                      cuando autorice con su cuenta de{' '}
                      {gatewayLabels[autoDebit.gateway] ?? autoDebit.gateway}.
                    </span>
                  </div>
                )}

                {autoDebit.status === 'PAUSED' && (
                  <p className="text-sm text-muted-foreground">
                    La suscripción está pausada. Contactá con soporte para reactivarla.
                  </p>
                )}

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setCancelOpen(true)}
                  disabled={cancelling}
                >
                  Cancelar débito automático
                </Button>
              </div>
            )}

          {linkToShare && (
            <div className="mt-3 space-y-3 rounded-xl border border-border bg-card p-4">
              <div className="flex items-start gap-2 rounded-xl bg-emerald-100 p-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                <Check className="mt-0.5 size-4 shrink-0" />
                <span>
                  {authorizationUrl
                    ? 'Enviale este link al socio para que autorice los débitos con su cuenta de Mercado Pago. Queda pendiente hasta que autorice.'
                    : 'El socio puede gestionar su medio de pago desde este link.'}
                </span>
              </div>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={linkToShare}
                  className="flex-1 font-mono text-xs"
                  onFocus={(e) => e.currentTarget.select()}
                />
                <Button
                  variant="outline"
                  onClick={() => handleCopyLink(linkToShare)}
                  disabled={copied}
                >
                  {copied ? (
                    <Check className="mr-2 size-4" />
                  ) : (
                    <Copy className="mr-2 size-4" />
                  )}
                  Copiar link
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="sm:max-w-md bg-card text-card-foreground border border-border shadow-xl">
          <DialogHeader>
            <DialogTitle>Cancelar débito automático</DialogTitle>
            <DialogDescription>
              ¿Confirmás que querés cancelar el débito automático de este socio? Va a tener
              que pagar la cuota manualmente cada mes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)} disabled={cancelling}>
              Volver
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={cancelling}>
              {cancelling ? 'Cancelando...' : 'Cancelar débito automático'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
