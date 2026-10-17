'use client';

import { useEffect, useState } from 'react';
import { CreditCard, Wallet, Landmark, Loader2, ArrowLeft, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { BankTransferInfo, type BankTransferInfoData } from './BankTransferInfo';
import type { MemberFeeItem } from '@/types/fee';
import type { CheckoutResponse } from '@/types/checkout';

interface PaymentMethodSelectorProps {
  fee: MemberFeeItem;
  memberDni: string;
  institutionSlug?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type PaymentMethod = 'stripe' | 'mercadopago' | 'bank_transfer';

type MethodAvailability = Record<PaymentMethod, boolean>;

const methods: { id: PaymentMethod; label: string; description: string; icon: React.ReactNode }[] = [
  {
    id: 'mercadopago',
    label: 'MercadoPago',
    description: 'Pagá con tarjeta, dinero en cuenta o Rapipago/PagoFácil.',
    icon: <Wallet className="size-6" />,
  },
  {
    id: 'stripe',
    label: 'Stripe',
    description: 'Pagá con tarjeta de crédito o débito de forma segura.',
    icon: <CreditCard className="size-6" />,
  },
  {
    id: 'bank_transfer',
    label: 'Transferencia bancaria',
    description: 'Transferí a nuestra cuenta y te acreditaremos en 24-48 hs.',
    icon: <Landmark className="size-6" />,
  },
];

const currencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
});

export function PaymentMethodSelector({
  fee,
  memberDni,
  institutionSlug,
  open,
  onOpenChange,
}: PaymentMethodSelectorProps) {
  const [loadingMethod, setLoadingMethod] = useState<PaymentMethod | null>(null);
  const [bankTransfer, setBankTransfer] = useState<BankTransferInfoData | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [availability, setAvailability] = useState<MethodAvailability | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);

  // Ask the checkout endpoint which methods this institution actually
  // configured, so members only see methods that can succeed.
  useEffect(() => {
    if (!open || !institutionSlug) return;

    let cancelled = false;
    setAvailabilityLoading(true);

    fetch(`/api/checkout?clubSlug=${encodeURIComponent(institutionSlug)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled && data?.data) {
          setAvailability(data.data as MethodAvailability);
        }
      })
      .catch(() => {
        // Availability unknown: keep showing all methods (existing behavior).
      })
      .finally(() => {
        if (!cancelled) setAvailabilityLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, institutionSlug]);

  const visibleMethods = availability
    ? methods.filter((method) => availability[method.id])
    : methods;

  function reset() {
    setBankTransfer(null);
    setCheckoutError(null);
    setLoadingMethod(null);
  }

  function handleOpenChange(newOpen: boolean) {
    if (!newOpen) {
      reset();
    }
    onOpenChange(newOpen);
  }

  async function handleSelectMethod(method: PaymentMethod) {
    setLoadingMethod(method);
    setCheckoutError(null);
    setBankTransfer(null);

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feeId: fee.id,
          method,
          memberDni,
          ...(institutionSlug && { institutionSlug }),
        }),
      });

      const data: CheckoutResponse & { error?: string; details?: string } = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al iniciar el pago');
      }

      if (data.checkoutUrl) {
        window.location.assign(data.checkoutUrl);
        return;
      }

      if (data.bankTransfer) {
        setBankTransfer(data.bankTransfer);
        return;
      }

      throw new Error('Respuesta de checkout inesperada');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo iniciar el pago';
      setCheckoutError(message);
      toast.add({
        title: 'Error',
        description: message,
        type: 'error',
      });
    } finally {
      setLoadingMethod(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md bg-card text-card-foreground border border-border shadow-xl">
        <DialogHeader>
          <DialogTitle>
            {bankTransfer ? 'Transferencia bancaria' : 'Seleccionar método de pago'}
          </DialogTitle>
          <DialogDescription>
            {bankTransfer
              ? 'Usá estos datos para realizar la transferencia.'
              : `Cuota de ${currencyFormatter.format(fee.amount)}`}
          </DialogDescription>
        </DialogHeader>

        {bankTransfer ? (
          <div className="space-y-4">
            <BankTransferInfo bankTransfer={bankTransfer} />
            <Button variant="outline" className="w-full rounded-xl" onClick={reset}>
              <ArrowLeft className="mr-2 size-4" />
              Elegir otro método
            </Button>
          </div>
        ) : availabilityLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : visibleMethods.length === 0 ? (
          <div className="flex items-start gap-2 rounded-xl bg-muted/30 p-4 text-sm text-muted-foreground">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>Los pagos online no están disponibles por el momento. Contactá con tu institución.</span>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleMethods.map((method) => {
              const isLoading = loadingMethod === method.id;
              const disabled = loadingMethod !== null && !isLoading;

              return (
                <Button
                  key={method.id}
                  variant="secondary"
                  className="h-auto w-full justify-start gap-4 rounded-xl p-4 text-left"
                  onClick={() => handleSelectMethod(method.id)}
                  disabled={disabled}
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    {method.icon}
                  </span>
                  <span className="flex-1">
                    <span className="block font-medium">{method.label}</span>
                    <span className="block text-xs text-muted-foreground">
                      {method.description}
                    </span>
                  </span>
                  {isLoading && <Loader2 className="size-4 animate-spin text-primary" />}
                </Button>
              );
            })}

            {checkoutError && (
              <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
                {checkoutError}
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
