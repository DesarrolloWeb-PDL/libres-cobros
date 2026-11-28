import {
  Users,
  Wallet,
  Clock,
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
    iconColor: 'text-blue-600',
    format: (value: number) => value.toLocaleString('es-AR'),
  },
  {
    key: 'incomeCollected' as const,
    label: 'Ingresos del Mes',
    icon: Wallet,
    iconColor: 'text-emerald-600',
    format: (value: number) => currencyFormatter.format(value),
  },
  {
    key: 'pendingFees' as const,
    label: 'Cuotas Pendientes',
    icon: Clock,
    iconColor: 'text-amber-600',
    format: (value: number) => value.toLocaleString('es-AR'),
  },
];

export function StatsCards({ data }: StatsCardsProps) {
  const valueMap = {
    activeMembers: data.activeMembers,
    incomeCollected: data.income.collected,
    pendingFees: data.fees.pending.count,
  };

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon;
        const value = valueMap[card.key];
        return (
          <Card key={card.key} className="rounded-2xl shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-5">
              <CardTitle className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                {card.label}
              </CardTitle>
              <Icon className={cn('size-4', card.iconColor)} />
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="text-2xl font-semibold font-mono tabular-nums">
                {card.format(value)}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
