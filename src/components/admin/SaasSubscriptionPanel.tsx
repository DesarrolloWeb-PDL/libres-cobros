'use client';

import { useState, useCallback } from 'react';
import {
  Check,
  CreditCard,
  Loader2,
  RefreshCw,
  UserCheck,
  Wallet,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/toast';
import type {
  SaasPlanChangeRequestListItem,
  SaasPlanChangeRequestListResponse,
  SaasSubscriptionListItem,
  SaasSubscriptionListResponse,
  SaasInvoiceListItem,
  SaasInvoiceListResponse,
} from '@/types/saas';

interface SaasSubscriptionPanelProps {
  initialRequests: SaasPlanChangeRequestListResponse;
  initialSubscriptions: SaasSubscriptionListResponse;
  initialInvoices: SaasInvoiceListResponse;
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
  APPROVED: 'Aprobada',
  REJECTED: 'Rechazada',
};

export function SaasSubscriptionPanel({
  initialRequests,
  initialSubscriptions,
  initialInvoices,
}: SaasSubscriptionPanelProps) {
  const [requests, setRequests] = useState<SaasPlanChangeRequestListItem[]>(initialRequests.data);
  const [subscriptions, setSubscriptions] = useState<SaasSubscriptionListItem[]>(initialSubscriptions.data);
  const [invoices, setInvoices] = useState<SaasInvoiceListItem[]>(initialInvoices.data);

  const [requestStatus, setRequestStatus] = useState('');
  const [subscriptionStatus, setSubscriptionStatus] = useState('');
  const [invoiceStatus, setInvoiceStatus] = useState('');

  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);

  const [enrollOpen, setEnrollOpen] = useState(false);
  const [enrollInstitutionId, setEnrollInstitutionId] = useState<string | null>(null);
  const [enrollGateway, setEnrollGateway] = useState<'mercadopago' | 'stripe'>('mercadopago');
  const [enrollEmail, setEnrollEmail] = useState('');

  const [payOpen, setPayOpen] = useState(false);
  const [payInvoice, setPayInvoice] = useState<SaasInvoiceListItem | null>(null);
  const [transferRef, setTransferRef] = useState('');

  const fetchRequests = useCallback(async (status: string) => {
    try {
      const query = status ? `?status=${status}` : '';
      const response = await fetch(`/api/admin/saas/change-requests${query}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Error al cargar solicitudes');
      const data: SaasPlanChangeRequestListResponse = await response.json();
      setRequests(data.data);
    } catch {
      toast.add({ title: 'Error', description: 'No se pudieron cargar las solicitudes', type: 'error' });
    }
  }, []);

  const fetchSubscriptions = useCallback(async (status: string) => {
    try {
      const query = status ? `?status=${status}` : '';
      const response = await fetch(`/api/admin/saas/subscriptions${query}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Error al cargar suscripciones');
      const data: SaasSubscriptionListResponse = await response.json();
      setSubscriptions(data.data);
    } catch {
      toast.add({ title: 'Error', description: 'No se pudieron cargar las suscripciones', type: 'error' });
    }
  }, []);

  const fetchInvoices = useCallback(async (status: string) => {
    try {
      const query = status ? `?status=${status}` : '';
      const response = await fetch(`/api/admin/saas/invoices${query}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Error al cargar facturas');
      const data: SaasInvoiceListResponse = await response.json();
      setInvoices(data.data);
    } catch {
      toast.add({ title: 'Error', description: 'No se pudieron cargar las facturas', type: 'error' });
    }
  }, []);

  async function handleDecide(request: SaasPlanChangeRequestListItem, decision: 'APPROVED' | 'REJECTED') {
    setDecidingId(request.id);
    try {
      const response = await fetch(`/api/admin/saas/change-requests/${request.id}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Error al resolver la solicitud');
      }

      toast.add({
        title: decision === 'APPROVED' ? 'Solicitud aprobada' : 'Solicitud rechazada',
        description: `La solicitud de ${request.institution.name} fue resuelta`,
        type: 'success',
      });

      fetchRequests(requestStatus);
      fetchSubscriptions(subscriptionStatus);
    } catch (error) {
      toast.add({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo resolver la solicitud',
        type: 'error',
      });
    } finally {
      setDecidingId(null);
    }
  }

  function openEnroll(institutionId: string) {
    setEnrollInstitutionId(institutionId);
    setEnrollGateway('mercadopago');
    setEnrollEmail('');
    setEnrollOpen(true);
  }

  async function handleEnroll() {
    if (!enrollInstitutionId) return;

    setEnrolling(enrollInstitutionId);
    try {
      const response = await fetch(`/api/admin/saas/institutions/${enrollInstitutionId}/autodebit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gateway: enrollGateway, payerEmail: enrollEmail || undefined }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Error al configurar el débito automático');
      }

      toast.add({
        title: 'Débito configurado',
        description: data.authorizationUrl
          ? 'Se generó el link de autorización para la institución'
          : 'La suscripción quedó activa',
        type: 'success',
      });

      setEnrollOpen(false);
      fetchSubscriptions(subscriptionStatus);
    } catch (error) {
      toast.add({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo configurar el débito',
        type: 'error',
      });
    } finally {
      setEnrolling(null);
    }
  }

  function openPay(invoice: SaasInvoiceListItem) {
    setPayInvoice(invoice);
    setTransferRef('');
    setPayOpen(true);
  }

  async function handlePay() {
    if (!payInvoice) return;

    setPayingId(payInvoice.id);
    try {
      const response = await fetch(`/api/admin/saas/invoices/${payInvoice.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transferRef: transferRef.trim() }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Error al confirmar el pago');
      }

      toast.add({ title: 'Pago confirmado', description: 'La factura fue marcada como pagada', type: 'success' });
      setPayOpen(false);
      fetchInvoices(invoiceStatus);
    } catch (error) {
      toast.add({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo confirmar el pago',
        type: 'error',
      });
    } finally {
      setPayingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="requests">
        <TabsList variant="line">
          <TabsTrigger value="requests">
            <RefreshCw className="size-4 mr-2" />
            Solicitudes
          </TabsTrigger>
          <TabsTrigger value="subscriptions">
            <Wallet className="size-4 mr-2" />
            Suscripciones
          </TabsTrigger>
          <TabsTrigger value="invoices">
            <CreditCard className="size-4 mr-2" />
            Facturas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="mt-5 space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <StyledSelect
              value={requestStatus}
              onChange={(v) => {
                setRequestStatus(v);
                fetchRequests(v);
              }}
              options={[
                { value: '', label: 'Todos' },
                { value: 'PENDING', label: 'Pendientes' },
                { value: 'APPROVED', label: 'Aprobadas' },
                { value: 'REJECTED', label: 'Rechazadas' },
              ]}
              placeholder="Estado"
              className="w-full sm:w-44"
            />
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Institución</TableHead>
                  <TableHead>Plan solicitado</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-40">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                      No se encontraron solicitudes
                    </TableCell>
                  </TableRow>
                ) : (
                  requests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">{request.institution.name}</TableCell>
                      <TableCell>
                        {request.requestedSaasPlan.name} ({currencyFormatter.format(request.requestedSaasPlan.priceArs)})
                      </TableCell>
                      <TableCell>
                        <Badge variant={request.status === 'PENDING' ? 'secondary' : request.status === 'APPROVED' ? 'default' : 'destructive'}>
                          {statusLabels[request.status] ?? request.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {request.status === 'PENDING' && (
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              onClick={() => handleDecide(request, 'APPROVED')}
                              disabled={decidingId === request.id}
                            >
                              {decidingId === request.id ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <Check className="size-3.5" />
                              )}
                              Aprobar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDecide(request, 'REJECTED')}
                              disabled={decidingId === request.id}
                            >
                              <X className="size-3.5" />
                              Rechazar
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="subscriptions" className="mt-5 space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <StyledSelect
              value={subscriptionStatus}
              onChange={(v) => {
                setSubscriptionStatus(v);
                fetchSubscriptions(v);
              }}
              options={[
                { value: '', label: 'Todos' },
                { value: 'ACTIVE', label: 'Activas' },
                { value: 'CANCELLED', label: 'Canceladas' },
              ]}
              placeholder="Estado"
              className="w-full sm:w-44"
            />
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Institución</TableHead>
                  <TableHead>Plan actual</TableHead>
                  <TableHead>Plan pendiente</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-40">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      No se encontraron suscripciones
                    </TableCell>
                  </TableRow>
                ) : (
                  subscriptions.map((subscription) => (
                    <TableRow key={subscription.id}>
                      <TableCell className="font-medium">{subscription.institution.name}</TableCell>
                      <TableCell>
                        {subscription.saasPlan.name} ({currencyFormatter.format(subscription.saasPlan.priceArs)})
                      </TableCell>
                      <TableCell>
                        {subscription.pendingSaasPlan ? subscription.pendingSaasPlan.name : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={subscription.status === 'ACTIVE' ? 'default' : 'secondary'}>
                          {statusLabels[subscription.status] ?? subscription.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEnroll(subscription.institutionId)}
                          disabled={enrolling === subscription.institutionId}
                        >
                          {enrolling === subscription.institutionId ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <UserCheck className="size-3.5" />
                          )}
                          Débito
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="invoices" className="mt-5 space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <StyledSelect
              value={invoiceStatus}
              onChange={(v) => {
                setInvoiceStatus(v);
                fetchInvoices(v);
              }}
              options={[
                { value: '', label: 'Todos' },
                { value: 'PENDING', label: 'Pendientes' },
                { value: 'PAID', label: 'Pagadas' },
                { value: 'OVERDUE', label: 'Vencidas' },
              ]}
              placeholder="Estado"
              className="w-full sm:w-44"
            />
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Institución</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-32">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      No se encontraron facturas
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.institution.name}</TableCell>
                      <TableCell>
                        {invoice.month.toString().padStart(2, '0')}/{invoice.year}
                      </TableCell>
                      <TableCell>{invoice.saasPlan.name}</TableCell>
                      <TableCell>{currencyFormatter.format(invoice.amount)}</TableCell>
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
                            variant="outline"
                            onClick={() => openPay(invoice)}
                            disabled={payingId === invoice.id}
                          >
                            {payingId === invoice.id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Check className="size-3.5" />
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
        </TabsContent>
      </Tabs>

      <Dialog open={enrollOpen} onOpenChange={setEnrollOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Configurar débito automático SaaS</DialogTitle>
            <DialogDescription>
              Elegí el medio de pago y el email del pagador. Mercado Pago genera un link de autorización.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Medio de pago</Label>
              <StyledSelect
                value={enrollGateway}
                onChange={(v) => setEnrollGateway(v as 'mercadopago' | 'stripe')}
                options={[
                  { value: 'mercadopago', label: 'Mercado Pago' },
                  { value: 'stripe', label: 'Stripe' },
                ]}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="enroll-email">Email del pagador</Label>
              <Input
                id="enroll-email"
                type="email"
                value={enrollEmail}
                onChange={(e) => setEnrollEmail(e.target.value)}
                placeholder="admin@institucion.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEnrollOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEnroll} disabled={!enrollEmail || enrolling !== null}>
              {enrolling ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              Configurar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar pago por transferencia</DialogTitle>
            <DialogDescription>
              Marcá como pagada la factura de {payInvoice?.institution.name} ingresando la referencia bancaria.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="transfer-ref">Referencia / comprobante</Label>
              <Input
                id="transfer-ref"
                value={transferRef}
                onChange={(e) => setTransferRef(e.target.value)}
                placeholder="Ej: Transferencia #123456"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(false)} disabled={payingId !== null}>
              Cancelar
            </Button>
            <Button onClick={handlePay} disabled={!transferRef.trim() || payingId !== null}>
              {payingId ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              Confirmar pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
