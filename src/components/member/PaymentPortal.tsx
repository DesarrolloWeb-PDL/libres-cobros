'use client';

import { User, Receipt, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { FeeCard } from './FeeCard';
import type { MemberFeeItem } from '@/types/fee';

interface PaymentPortalProps {
  member: {
    id: string;
    dni: string;
    firstName: string;
    lastName: string;
  };
  fees: MemberFeeItem[];
  clubSlug?: string;
}

export function PaymentPortal({ member, fees, clubSlug }: PaymentPortalProps) {
  const pendingFees = fees.filter((fee) => fee.status === 'PENDING' || fee.status === 'OVERDUE');
  const totalPending = pendingFees.reduce((sum, fee) => sum + fee.amount, 0);

  const currencyFormatter = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex items-start gap-4 py-5">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <User className="size-6 text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">
              {member.firstName} {member.lastName}
            </h2>
            <p className="text-sm text-muted-foreground">DNI {member.dni}</p>
            {pendingFees.length > 0 && (
              <p className="mt-1 text-sm font-medium text-destructive">
                Tenés {pendingFees.length} cuota{pendingFees.length === 1 ? '' : 's'} pendiente
                {pendingFees.length === 1 ? '' : 's'} por {currencyFormatter.format(totalPending)}
              </p>
            )}
            {pendingFees.length === 0 && fees.length > 0 && (
              <p className="mt-1 text-sm font-medium text-green-700">
                No tenés cuotas pendientes
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <div>
        <div className="mb-4 flex items-center gap-2">
          <Receipt className="size-5 text-muted-foreground" />
          <h3 className="font-semibold">Tus cuotas</h3>
        </div>

        {fees.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center">
            <AlertCircle className="mb-2 size-8 text-muted-foreground" />
            <p className="font-medium">No encontramos cuotas</p>
            <p className="text-sm text-muted-foreground">
              Tu cuenta no tiene cuotas generadas por el momento.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {fees.map((fee) => (
              <FeeCard key={fee.id} fee={fee} memberDni={member.dni} clubSlug={clubSlug} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
