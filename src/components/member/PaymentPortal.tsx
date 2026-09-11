'use client';

import { User, Receipt, AlertCircle } from 'lucide-react';
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
  institutionSlug?: string;
}

export function PaymentPortal({ member, fees, institutionSlug }: PaymentPortalProps) {
  const pendingFees = fees.filter((fee) => fee.status === 'PENDING' || fee.status === 'OVERDUE');
  const totalPending = pendingFees.reduce((sum, fee) => sum + fee.amount, 0);

  const currencyFormatter = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
  });

  return (
    <div className="space-y-8">
      {/* Member Info Section */}
      <section className="relative py-6 px-6 border-t border-border">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-5 p-5 rounded-xl border border-border bg-card">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-accent/10">
              <User className="size-6 text-accent" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold">
                {member.firstName} {member.lastName}
              </h2>
              <p className="text-sm text-muted-foreground">DNI {member.dni}</p>
              {pendingFees.length > 0 && (
                <p className="mt-1.5 text-sm font-medium text-destructive">
                  Tenés {pendingFees.length} cuota{pendingFees.length === 1 ? '' : 's'} pendiente
                  {pendingFees.length === 1 ? '' : 's'} por {currencyFormatter.format(totalPending)}
                </p>
              )}
              {pendingFees.length === 0 && fees.length > 0 && (
                <p className="mt-1.5 text-sm font-medium text-emerald-600">
                  No tenés cuotas pendientes
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Fees Section */}
      <section className="relative py-6 px-6 border-t border-border">
        <div className="max-w-lg mx-auto">
          <div className="mb-5 text-center">
            <p className="text-accent font-mono text-xs tracking-[0.2em] uppercase mb-2">
              Cuotas
            </p>
            <h2 className="text-xl font-bold">
              Tus Cuotas
            </h2>
          </div>

          <div className="flex items-center gap-2 mb-5">
            <Receipt className="size-4 text-accent" />
            <h3 className="font-semibold text-sm">Detalle de Cuotas</h3>
          </div>

          {fees.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border p-10 text-center">
              <AlertCircle className="mb-3 size-10 text-muted-foreground/50" />
              <p className="font-semibold mb-1">No encontramos cuotas</p>
              <p className="text-sm text-muted-foreground">
                Tu cuenta no tiene cuotas generadas por el momento.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {fees.map((fee) => (
                <FeeCard key={fee.id} fee={fee} memberDni={member.dni} institutionSlug={institutionSlug} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
