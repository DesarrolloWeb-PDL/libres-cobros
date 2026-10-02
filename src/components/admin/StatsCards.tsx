import {
  Users,
  Wallet,
  Clock,
  Percent,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { DashboardData } from '@/types/dashboard';

interface StatsCardsProps {
  data: DashboardData;
}

const currencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

const cards = [
  {
    key: 'activeMembers' as const,
    label: 'Socios Activos',
    icon: Users,
    color: 'text-blue-600',
    gradient: 'from-blue-50 to-indigo-50/50',
    iconGradient: 'from-blue-500 to-indigo-500',
    format: (value: number) => value.toLocaleString('es-AR'),
  },
  {
    key: 'incomeCollected' as const,
    label: 'Ingresos del Mes',
    icon: Wallet,
    color: 'text-emerald-600',
    gradient: 'from-emerald-50 to-teal-50/50',
    iconGradient: 'from-emerald-500 to-teal-500',
    format: (value: number) => currencyFormatter.format(value),
  },
  {
    key: 'pendingFees' as const,
    label: 'Cuotas Pendientes',
    icon: Clock,
    color: 'text-amber-600',
    gradient: 'from-amber-50 to-orange-50/50',
    iconGradient: 'from-amber-500 to-orange-500',
    format: (value: number) => value.toLocaleString('es-AR'),
  },
  {
    key: 'commissions' as const,
    label: 'Comisiones',
    icon: Percent,
    color: 'text-violet-600',
    gradient: 'from-violet-50 to-purple-50/50',
    iconGradient: 'from-violet-500 to-purple-500',
    format: (value: number) => currencyFormatter.format(value),
  },
];

export function StatsCards({ data }: StatsCardsProps) {
  const valueMap = {
    activeMembers: data.activeMembers,
    incomeCollected: data.income.collected,
    pendingFees: data.fees.pending.count,
    commissions: data.commissions,
  };

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const value = valueMap[card.key];
        return (
          <Card
            key={card.key}
            className={cn(
              'group relative overflow-hidden rounded-2xl border-0 shadow-sm',
              'hover:shadow-md hover:-translate-y-0.5',
              'transition-all duration-300 ease-out',
              'bg-gradient-to-br',
              card.gradient
            )}
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-current to-transparent opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-5">
              <CardTitle className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                {card.label}
              </CardTitle>
              <div className={cn(
                'flex size-9 shrink-0 items-center justify-center rounded-xl',
                'bg-gradient-to-br text-white shadow-sm',
                card.iconGradient
              )}>
                <Icon className="size-4" />
              </div>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="text-2xl lg:text-3xl font-bold tabular-nums tracking-tight text-foreground">
                {card.format(value)}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
