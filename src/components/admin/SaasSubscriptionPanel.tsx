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
