'use client';

import { useState } from 'react';
import { CreditCard, Wallet, Landmark, Loader2, ArrowLeft } from 'lucide-react';
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
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type PaymentMethod = 'stripe' | 'mercadopago' | 'bank_transfer';

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
  open,
  onOpenChange,
}: PaymentMethodSelectorProps) {
  const [loadingMethod, setLoadingMethod] = useState<PaymentMethod | null>(null);
  const [bankTransfer, setBankTransfer] = useState<BankTransferInfoData | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

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
      <DialogContent className="sm:max-w-md">
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
            <Button variant="outline" className="w-full" onClick={reset}>
              <ArrowLeft className="mr-2 size-4" />
              Elegir otro método
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {methods.map((method) => {
              const isLoading = loadingMethod === method.id;
              const disabled = loadingMethod !== null && !isLoading;

              return (
                <Button
                  key={method.id}
                  variant="outline"
                  className="h-auto w-full justify-start gap-4 p-4 text-left"
                  onClick={() => handleSelectMethod(method.id)}
                  disabled={disabled}
                >
                  <span className="shrink-0 text-muted-foreground">{method.icon}</span>
                  <span className="flex-1">
                    <span className="block font-medium">{method.label}</span>
                    <span className="block text-xs text-muted-foreground">
                      {method.description}
                    </span>
                  </span>
                  {isLoading && <Loader2 className="size-4 animate-spin" />}
                </Button>
              );
            })}

            {checkoutError && (
              <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {checkoutError}
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
