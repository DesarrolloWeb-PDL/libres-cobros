import {
  Users,
  Clock,
  AlertCircle,
  CreditCard,
  Percent,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatsCardsProps {
  data: {
    totalSocios: number;
    cuotasPendientes: number;
    cuotasVencidas: number;
    pagosMes: number;
    comisionesMes: number;
  };
}

const cards = [
  {
    key: 'totalSocios' as const,
    label: 'Total socios',
    icon: Users,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-100',
  },
  {
    key: 'cuotasPendientes' as const,
    label: 'Pendientes',
    icon: Clock,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-100',
  },
  {
    key: 'cuotasVencidas' as const,
    label: 'Vencidas',
    icon: AlertCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-100',
  },
  {
    key: 'pagosMes' as const,
    label: 'Pagos mes',
    icon: CreditCard,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-100',
  },
  {
    key: 'comisionesMes' as const,
    label: 'Comisiones',
    icon: Percent,
    color: 'text-violet-600',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-100',
  },
];

export function StatsCards({ data }: StatsCardsProps) {
  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.key} className={cn('hover:shadow-sm transition-shadow duration-200 border', card.borderColor)}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {card.label}
              </CardTitle>
              <div className={cn('flex size-7 shrink-0 items-center justify-center rounded-md', card.bgColor)}>
                <Icon className={cn('size-3.5', card.color)} />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold tabular-nums">{data[card.key]}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
