import Link from 'next/link';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  ArrowLeft,
  CalendarDays,
  CreditCard,
  Wallet,
  Landmark,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PaymentConfirmationProps {
  status: string;
  provider: string;
  payment: {
    id: string;
    amount: number;
    method: string;
    createdAt: string;
    confirmedAt: string | null;
    fee: {
      month: number;
      year: number;
    };
  } | null;
}

const monthLabels: Record<number, string> = {
  1: 'Enero',
  2: 'Febrero',
  3: 'Marzo',
  4: 'Abril',
  5: 'Mayo',
  6: 'Junio',
  7: 'Julio',
  8: 'Agosto',
  9: 'Septiembre',
  10: 'Octubre',
  11: 'Noviembre',
  12: 'Diciembre',
};

const methodLabels: Record<string, string> = {
  stripe: 'Stripe',
  mercadopago: 'MercadoPago',
  bank_transfer: 'Transferencia bancaria',
};

const currencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
});

function getStatusConfig(status: string) {
  switch (status) {
    case 'success':
      return {
        icon: <CheckCircle2 className="size-12 text-green-600" />,
        title: '¡Pago acreditado!',
        message: 'Tu pago fue procesado correctamente. Ya podés cerrar esta ventana.',
        variant: 'success' as const,
      };
    case 'pending':
      return {
        icon: <Clock className="size-12 text-yellow-600" />,
        title: 'Pago pendiente',
        message:
          'Tu pago está siendo procesado. En breve recibirás la confirmación. Si elegiste transferencia, recordá enviar el comprobante.',
        variant: 'pending' as const,
      };
    case 'cancelled':
      return {
        icon: <XCircle className="size-12 text-muted-foreground" />,
        title: 'Pago cancelado',
        message: 'Cancelaste el proceso de pago. Podés intentarlo nuevamente cuando quieras.',
        variant: 'neutral' as const,
      };
    case 'failure':
      return {
        icon: <AlertCircle className="size-12 text-destructive" />,
        title: 'El pago no pudo realizarse',
        message:
          'Hubo un problema al procesar tu pago. Verificá los datos e intentá de nuevo.',
        variant: 'error' as const,
      };
    default:
      return {
        icon: <AlertCircle className="size-12 text-muted-foreground" />,
        title: 'Estado desconocido',
        message: 'No pudimos determinar el estado de tu pago.',
        variant: 'neutral' as const,
      };
  }
}

function MethodIcon({ method }: { method: string }) {
  if (method === 'mercadopago') return <Wallet className="size-4" />;
  if (method === 'bank_transfer') return <Landmark className="size-4" />;
  return <CreditCard className="size-4" />;
}

export function PaymentConfirmation({ status, provider, payment }: PaymentConfirmationProps) {
  const config = getStatusConfig(status);

  return (
    <div className="container mx-auto max-w-xl px-4 py-12">
      <Card>
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">{config.icon}</div>
          <CardTitle className="text-xl">{config.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-center text-muted-foreground">{config.message}</p>

          {payment && (
            <div className="space-y-3 rounded-lg bg-muted/50 p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Monto</span>
                <span className="text-lg font-bold">
                  {currencyFormatter.format(payment.amount)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Cuota</span>
                <span>
                  {monthLabels[payment.fee.month]} {payment.fee.year}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Método</span>
                <span className="flex items-center gap-1.5">
                  <MethodIcon method={payment.method} />
                  {methodLabels[payment.method] ?? payment.method}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Fecha</span>
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="size-4" />
                  {payment.confirmedAt
                    ? new Date(payment.confirmedAt).toLocaleString('es-AR')
                    : new Date(payment.createdAt).toLocaleString('es-AR')}
                </span>
              </div>
              {provider && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Proveedor</span>
                  <span className="capitalize">{provider}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Referencia</span>
                <span className="font-mono text-xs">{payment.id}</span>
              </div>
            </div>
          )}

          {!payment && status !== 'success' && (
            <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
              No se encontró el pago solicitado. Si ya realizaste el pago, podés volver a consultar
              tus cuotas en el portal.
            </div>
          )}

          <Button render={<Link href="/pagos" />} variant="outline" className="w-full">
            <ArrowLeft className="mr-2 size-4" />
            Volver al portal
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
