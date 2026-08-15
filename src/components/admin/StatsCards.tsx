import {
  Users,
  Clock,
  AlertCircle,
  CreditCard,
  Percent,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
  },
  {
    key: 'cuotasPendientes' as const,
    label: 'Cuotas pendientes',
    icon: Clock,
  },
  {
    key: 'cuotasVencidas' as const,
    label: 'Cuotas vencidas',
    icon: AlertCircle,
  },
  {
    key: 'pagosMes' as const,
    label: 'Pagos este mes',
    icon: CreditCard,
  },
  {
    key: 'comisionesMes' as const,
    label: 'Comisiones este mes',
    icon: Percent,
  },
];

export function StatsCards({ data }: StatsCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.key}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
              <Icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data[card.key]}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
