import {
  Users,
  Clock,
  AlertCircle,
  CreditCard,
  Percent,
  TrendingUp,
  TrendingDown,
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
    bgColor: 'bg-blue-100',
    trend: 'up' as const,
  },
  {
    key: 'cuotasPendientes' as const,
    label: 'Cuotas pendientes',
    icon: Clock,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    trend: 'neutral' as const,
  },
  {
    key: 'cuotasVencidas' as const,
    label: 'Cuotas vencidas',
    icon: AlertCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    trend: 'down' as const,
  },
  {
    key: 'pagosMes' as const,
    label: 'Pagos este mes',
    icon: CreditCard,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    trend: 'up' as const,
  },
  {
    key: 'comisionesMes' as const,
    label: 'Comisiones este mes',
    icon: Percent,
    color: 'text-accent',
    bgColor: 'bg-accent/10',
    trend: 'up' as const,
  },
];

export function StatsCards({ data }: StatsCardsProps) {
  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.key} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground truncate">
                {card.label}
              </CardTitle>
              <div className={cn('flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-lg', card.bgColor)}>
                <Icon className={cn('size-3.5 sm:size-4', card.color)} />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="flex items-end justify-between">
                <div className="text-2xl sm:text-3xl font-bold">{data[card.key]}</div>
                <div className={cn(
                  'flex items-center gap-1 text-xs font-medium',
                  card.trend === 'up' && 'text-green-600',
                  card.trend === 'down' && 'text-red-600',
                  card.trend === 'neutral' && 'text-muted-foreground'
                )}>
                  {card.trend === 'up' && <TrendingUp className="size-3" />}
                  {card.trend === 'down' && <TrendingDown className="size-3" />}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
