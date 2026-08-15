'use client';

import { useState } from 'react';
import { Calendar, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PaymentMethodSelector } from './PaymentMethodSelector';
import type { MemberFeeItem } from '@/types/fee';

interface FeeCardProps {
  fee: MemberFeeItem;
  memberDni: string;
}

const statusLabels: Record<string, string> = {
  PENDING: 'Pendiente',
  PAID: 'Pagada',
  OVERDUE: 'Vencida',
};

const statusBadgeClasses: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
  PAID: 'bg-green-100 text-green-800 hover:bg-green-100',
  OVERDUE: 'bg-red-100 text-red-800 hover:bg-red-100',
};

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

const currencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
});

export function FeeCard({ fee, memberDni }: FeeCardProps) {
  const [selectorOpen, setSelectorOpen] = useState(false);

  const canPay = fee.status === 'PENDING' || fee.status === 'OVERDUE';

  return (
    <>
      <Card className="flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">
                {monthLabels[fee.month]} {fee.year}
              </CardTitle>
              <p className="text-xs text-muted-foreground">{fee.feeConfig.category}</p>
            </div>
            <Badge variant="outline" className={statusBadgeClasses[fee.status]}>
              {statusLabels[fee.status] ?? fee.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex-1 pb-3">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold">{currencyFormatter.format(fee.amount)}</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Calendar className="size-4" />
            <span>Vence el {new Date(fee.dueDate).toLocaleDateString('es-AR')}</span>
          </div>
        </CardContent>
        {canPay && (
          <CardFooter className="pt-0">
            <Button className="w-full" onClick={() => setSelectorOpen(true)}>
              <CreditCard className="mr-2 size-4" />
              Pagar ahora
            </Button>
          </CardFooter>
        )}
      </Card>

      <PaymentMethodSelector
        fee={fee}
        memberDni={memberDni}
        open={selectorOpen}
        onOpenChange={setSelectorOpen}
      />
    </>
  );
}
