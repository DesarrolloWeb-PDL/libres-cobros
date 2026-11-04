'use client';

import { useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { SubscriptionAlertState } from '@/lib/saas-subscription-alert';

interface SubscriptionAlertBannerProps {
  alert: SubscriptionAlertState;
}

const currencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
});

const monthFormatter = new Intl.DateTimeFormat('es-AR', {
  month: 'long',
  timeZone: 'UTC',
});

const dateFormatter = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

function storageKey(invoiceId: string): string {
  return `saas-alert-dismissed:${invoiceId}`;
}

function isDismissed(alert: SubscriptionAlertState): boolean {
  if (typeof window === 'undefined' || alert.status === 'ok' || !alert.invoice) {
    return false;
  }
  return window.localStorage.getItem(storageKey(alert.invoice.id)) === '1';
}

export function SubscriptionAlertBanner({ alert }: SubscriptionAlertBannerProps) {
  const [visible, setVisible] = useState(() => !isDismissed(alert));

  if (alert.status === 'ok' || !alert.invoice || !visible) {
    return null;
  }

  const { invoice } = alert;
  const periodName = `${monthFormatter.format(invoice.dueDate)} ${invoice.year}`;

  function handleDismiss() {
    setVisible(false);
    window.localStorage.setItem(storageKey(invoice.id), '1');
  }

  return (
    <Alert variant={alert.status === 'overdue' ? 'destructive' : 'warning'} className="pr-12">
      <AlertCircle className="mt-0.5" />
      <AlertTitle>
        {alert.status === 'overdue'
          ? 'Factura SaaS vencida'
          : 'Tu factura SaaS vence pronto'}
      </AlertTitle>
      <AlertDescription>
        {alert.status === 'overdue' ? (
          <>
            La factura de {periodName} está vencida hace {alert.invoice.daysOverdue}{' '}
            {alert.invoice.daysOverdue === 1 ? 'día' : 'días'}. El acceso a la
            plataforma permanece activo. Contactá al equipo para regularizar el pago.
          </>
        ) : (
          <>
            La factura de {periodName} vence el {dateFormatter.format(invoice.dueDate)}.
            Monto: {currencyFormatter.format(invoice.amount)}. Recordá abonar antes de
            la fecha de vencimiento.
          </>
        )}
      </AlertDescription>
      <Button
        variant="ghost"
        size="icon-xs"
        className="absolute top-2 right-2"
        onClick={handleDismiss}
        aria-label="Cerrar alerta"
      >
        <X />
      </Button>
    </Alert>
  );
}
