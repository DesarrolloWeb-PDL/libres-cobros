'use client';

import { useState } from 'react';
import { Calendar, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PaymentMethodSelector } from './PaymentMethodSelector';
import type { MemberFeeItem } from '@/types/fee';

interface FeeCardProps {
  fee: MemberFeeItem;
  memberDni: string;
  institutionSlug?: string;
}

const statusLabels: Record<string, string> = {
  PENDING: 'Pendiente',
  PAID: 'Pagada',
  OVERDUE: 'Vencida',
};

const statusBadgeClasses: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50',
  PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50',
  OVERDUE: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-50',
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

export function FeeCard({ fee, memberDni, institutionSlug }: FeeCardProps) {
  const [selectorOpen, setSelectorOpen] = useState(false);

  const canPay = fee.status === 'PENDING' || fee.status === 'OVERDUE';

  return (
    <>
      <div className="flex flex-col p-5 rounded-xl border border-border bg-card hover:border-accent/30 hover:shadow-sm transition-all duration-200">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h3 className="text-base font-semibold">
              {monthLabels[fee.month]} {fee.year}
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">{fee.feeConfig.category}</p>
          </div>
          <Badge variant="outline" className={statusBadgeClasses[fee.status]}>
            {statusLabels[fee.status] ?? fee.status}
          </Badge>
        </div>

        <div className="flex-1">
          <div className="flex items-baseline gap-1 mb-2">
            <span className="text-2xl font-bold text-accent">{currencyFormatter.format(fee.amount)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Calendar className="size-3.5" />
            <span>Vence el {new Date(fee.dueDate).toLocaleDateString('es-AR')}</span>
          </div>
        </div>

        {canPay && (
          <div className="mt-4 pt-4 border-t border-border">
            <Button
              className="w-full bg-accent hover:bg-accent-hover text-white rounded-lg h-10 font-medium"
              onClick={() => setSelectorOpen(true)}
            >
              <CreditCard className="mr-2 size-4" />
              Pagar ahora
            </Button>
          </div>
        )}
      </div>

      <PaymentMethodSelector
        fee={fee}
        memberDni={memberDni}
        institutionSlug={institutionSlug}
        open={selectorOpen}
        onOpenChange={setSelectorOpen}
      />
    </>
  );
}
