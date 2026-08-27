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
  clubSlug?: string;
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

export function FeeCard({ fee, memberDni, clubSlug }: FeeCardProps) {
  const [selectorOpen, setSelectorOpen] = useState(false);

  const canPay = fee.status === 'PENDING' || fee.status === 'OVERDUE';

  return (
    <>
      <div className="flex flex-col p-6 rounded-xl border border-border bg-card hover:border-accent/50 transition-all duration-200">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg font-semibold">
              {monthLabels[fee.month]} {fee.year}
            </h3>
            <p className="text-sm text-muted-foreground">{fee.feeConfig.category}</p>
          </div>
          <Badge variant="outline" className={statusBadgeClasses[fee.status]}>
            {statusLabels[fee.status] ?? fee.status}
          </Badge>
        </div>
        
        <div className="flex-1">
          <div className="flex items-baseline gap-1 mb-3">
            <span className="text-3xl font-bold text-accent">{currencyFormatter.format(fee.amount)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Calendar className="size-4" />
            <span>Vence el {new Date(fee.dueDate).toLocaleDateString('es-AR')}</span>
          </div>
        </div>

        {canPay && (
          <div className="mt-4 pt-4 border-t border-border">
            <Button 
              className="w-full bg-accent hover:bg-accent-hover text-white" 
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
        clubSlug={clubSlug}
        open={selectorOpen}
        onOpenChange={setSelectorOpen}
      />
    </>
  );
}
