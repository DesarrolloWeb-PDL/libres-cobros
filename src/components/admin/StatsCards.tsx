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
    gradient: 'from-blue-50 to-indigo-50/50',
    iconGradient: 'from-blue-500 to-indigo-500',
  },
  {
    key: 'cuotasPendientes' as const,
    label: 'Pendientes',
    icon: Clock,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    gradient: 'from-amber-50 to-orange-50/50',
    iconGradient: 'from-amber-500 to-orange-500',
  },
  {
    key: 'cuotasVencidas' as const,
    label: 'Vencidas',
    icon: AlertCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    gradient: 'from-red-50 to-rose-50/50',
    iconGradient: 'from-red-500 to-rose-500',
  },
  {
    key: 'pagosMes' as const,
    label: 'Pagos mes',
    icon: CreditCard,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    gradient: 'from-emerald-50 to-teal-50/50',
    iconGradient: 'from-emerald-500 to-teal-500',
  },
  {
    key: 'comisionesMes' as const,
    label: 'Comisiones',
    icon: Percent,
    color: 'text-violet-600',
    bgColor: 'bg-violet-50',
    gradient: 'from-violet-50 to-purple-50/50',
    iconGradient: 'from-violet-500 to-purple-500',
  },
];

export function StatsCards({ data }: StatsCardsProps) {
  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;
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
              <div className="text-3xl font-bold tabular-nums tracking-tight text-foreground">
                {data[card.key]}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
