'use client';

import { useState } from 'react';
import { CreditCard, RefreshCw, AlertCircle, Loader2, ExternalLink, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StyledSelect } from '@/components/ui/styled-select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from '@/components/ui/toast';
import type { SaasSubscriptionDetailResponse } from '@/types/saas';

interface AdminSubscriptionPanelProps {
  institutionId: string;
  initialData: SaasSubscriptionDetailResponse;
}

const currencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
});

const statusLabels: Record<string, string> = {
  PENDING: 'Pendiente',
  PAID: 'Pagada',
  OVERDUE: 'Vencida',
  ACTIVE: 'Activa',
  CANCELLED: 'Cancelada',
};

export function AdminSubscriptionPanel({ institutionId, initialData }: AdminSubscriptionPanelProps) {
  const [data, setData] = useState<SaasSubscriptionDetailResponse>(initialData);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);
  const [pendingPaymentUrl, setPendingPaymentUrl] = useState<string | null>(null);

  async function refresh() {
    try {
      const response = await fetch(`/api/admin/saas/institutions/${institutionId}/subscription`, {
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('Error al actualizar');
      const updated: SaasSubscriptionDetailResponse = await response.json();
      setData(updated);
    } catch {
      toast.add({ title: 'Error', description: 'No se pudo actualizar la información', type: 'error' });
    }
  }

  async function handleRequestChange() {
    if (!selectedPlanId) return;

    setRequesting(true);
    try {
      const response = await fetch(`/api/admin/saas/institutions/${institutionId}/change-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestedSaasPlanId: selectedPlanId }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || 'Error al solicitar el cambio');
      }

      toast.add({ title: 'Solicitud enviada', description: 'Un superadmin la revisará pronto', type: 'success' });
      setSelectedPlanId('');
      refresh();
    } catch (error) {
      toast.add({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo solicitar el cambio',
        type: 'error',
      });
    } finally {
      setRequesting(false);
    }
  }

  async function handlePayWithMercadoPago(invoiceId: string) {
    setPayingInvoiceId(invoiceId);
    try {
      const response = await fetch(`/api/admin/saas/invoices/${invoiceId}/preference`, {
        method: 'POST',
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || 'Error al preparar el pago');
      }

      if (result.initPoint) {
        setPendingPaymentUrl(result.initPoint);
        return;
      }

      toast.add({ title: 'Error', description: 'No se recibió el link de pago', type: 'error' });
    } catch (error) {
      toast.add({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo iniciar el pago',
        type: 'error',
      });
    } finally {
      setPayingInvoiceId(null);
    }
  }

  function dismissPendingPayment() {
    setPendingPaymentUrl(null);
  }

  const subscription = data.subscription;
  const pendingRequest = data.changeRequests.find((r) => r.status === 'PENDING');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="size-5 text-muted-foreground" />
            <CardTitle>Tu plan actual</CardTitle>
          </div>
          <CardDescription>
            Resumen de la suscripción de tu institución con la plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!subscription ? (
            <div className="flex items-start gap-2 rounded-xl bg-amber-100 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>Tu institución no tiene un plan SaaS contratado. Estás en el nivel gratuito según la cantidad de socios.</span>
            </div>
          ) : (
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Plan</dt>
                <dd className="font-medium">{subscription.saasPlan.name}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Hasta</dt>
                <dd className="font-medium">{subscription.saasPlan.maxMembers} socios</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Precio mensual</dt>
                <dd className="font-medium">{currencyFormatter.format(subscription.saasPlan.priceArs)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Estado</dt>
                <dd>
                  <Badge variant={subscription.status === 'ACTIVE' ? 'default' : 'secondary'}>
                    {statusLabels[subscription.status] ?? subscription.status}
                  </Badge>
                </dd>
              </div>
              {subscription.pendingSaasPlan && (
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Cambio pendiente</dt>
                  <dd className="font-medium">{subscription.pendingSaasPlan.name}</dd>
                </div>
              )}
            </dl>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <RefreshCw className="size-5 text-muted-foreground" />
            <CardTitle>Solicitar cambio de plan</CardTitle>
          </div>
          <CardDescription>
            Elegí un nuevo plan. El cambio se aplica desde el próximo ciclo de facturación.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {pendingRequest ? (
            <div className="flex items-start gap-2 rounded-xl bg-blue-100 p-3 text-sm text-blue-800 dark:bg-blue-950 dark:text-blue-300">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>
                Ya tenés una solicitud pendiente para{' '}
                <strong>{pendingRequest.requestedSaasPlan.name}</strong>. Un superadmin la revisará pronto.
              </span>
            </div>
          ) : (
            <>
              <StyledSelect
                value={selectedPlanId}
                onChange={setSelectedPlanId}
                options={data.availablePlans.map((plan) => ({
                  value: plan.id,
                  label: `${plan.name} — ${plan.minMembers}-${plan.maxMembers} socios — ${currencyFormatter.format(plan.priceArs)}`,
                }))}
                placeholder="Seleccioná un plan"
              />
              <Button onClick={handleRequestChange} disabled={!selectedPlanId || requesting}>
                {requesting && <Loader2 className="mr-2 size-4 animate-spin" />}
                Solicitar cambio
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="size-5 text-muted-foreground" />
            <CardTitle>Facturas</CardTitle>
          </div>
          <CardDescription>
            Facturas mensuales de la suscripción. Podés pagar las pendientes con Mercado Pago.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Período</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-40">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      No se encontraron facturas
                    </TableCell>
                  </TableRow>
                ) : (
                  data.invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        {invoice.month.toString().padStart(2, '0')}/{invoice.year}
                      </TableCell>
                      <TableCell>{currencyFormatter.format(invoice.amount)}</TableCell>
                      <TableCell>{new Date(invoice.dueDate).toLocaleDateString('es-AR')}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            invoice.status === 'PAID'
                              ? 'default'
                              : invoice.status === 'OVERDUE'
                                ? 'destructive'
                                : 'secondary'
                          }
                        >
                          {statusLabels[invoice.status] ?? invoice.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {invoice.status !== 'PAID' && (
                          <Button
                            size="sm"
                            onClick={() => handlePayWithMercadoPago(invoice.id)}
                            disabled={payingInvoiceId === invoice.id}
                          >
                            {payingInvoiceId === invoice.id ? (
                              <Loader2 className="mr-2 size-3.5 animate-spin" />
                            ) : (
                              <ExternalLink className="mr-2 size-3.5" />
                            )}
                            Pagar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {pendingPaymentUrl && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle>Continuar con el pago</CardTitle>
              <CardDescription>
                Se generó el link de Mercado Pago. Cerrá esta ventana cuando termines.
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={dismissPendingPayment} aria-label="Cerrar">
              <X className="size-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <a
              href={pendingPaymentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ className: 'gap-2' }))}
            >
              <ExternalLink className="size-4" />
              Pagar ahora
            </a>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
