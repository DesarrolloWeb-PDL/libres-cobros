import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DashboardData } from '@/types/dashboard';

interface RecentActivityProps {
  payments: DashboardData['recentPayments'];
}

const currencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

const methodLabels: Record<string, string> = {
  stripe: 'Stripe',
  mercadopago: 'MercadoPago',
  bank_transfer: 'Transferencia',
};

const methodBadgeClasses: Record<string, string> = {
  stripe: 'bg-indigo-100 text-indigo-800 hover:bg-indigo-100',
  mercadopago: 'bg-sky-100 text-sky-800 hover:bg-sky-100',
  bank_transfer: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100',
};

export function RecentActivity({ payments }: RecentActivityProps) {
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="p-5 pb-3">
        <CardTitle className="text-base font-semibold">Actividad Reciente</CardTitle>
      </CardHeader>
      <CardContent className="p-5 pt-0">
        {payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-10 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-muted">
              <CreditCard className="size-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Sin pagos recientes</p>
              <p className="text-xs text-muted-foreground">
                Los últimos pagos confirmados aparecerán aquí.
              </p>
            </div>
          </div>
        ) : (
          <ul className="divide-y">
            {payments.map((payment) => {
              const date = payment.confirmedAt ?? payment.createdAt;
              return (
                <li
                  key={payment.id}
                  className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {payment.memberName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(date).toLocaleDateString('es-AR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-xs',
                        methodBadgeClasses[payment.method] ?? 'bg-gray-100 text-gray-800 hover:bg-gray-100'
                      )}
                    >
                      {methodLabels[payment.method] ?? payment.method}
                    </Badge>
                    <span className="text-sm font-bold tabular-nums text-foreground">
                      {currencyFormatter.format(payment.amount)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
