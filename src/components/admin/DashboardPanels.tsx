import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { DashboardData } from '@/types/dashboard';

interface DashboardPanelsProps {
  data: DashboardData;
}

const currencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

interface Segment {
  key: string;
  label: string;
  count?: number;
  amount: number;
  color: string;
  bgClass: string;
}

function StatusBar({ segments, showCounts }: { segments: Segment[]; showCounts?: boolean }) {
  const total = segments.reduce((sum, segment) => sum + segment.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex h-4 w-full overflow-hidden rounded-full bg-muted">
        {segments.map((segment) => {
          const percentage = total > 0 ? (segment.amount / total) * 100 : 0;
          return (
            <div
              key={segment.key}
              className={cn('h-full transition-all duration-500', segment.bgClass)}
              style={{ width: `${percentage}%` }}
              aria-label={`${segment.label}: ${currencyFormatter.format(segment.amount)}`}
              title={`${segment.label}: ${currencyFormatter.format(segment.amount)}`}
            />
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {segments.map((segment) => (
          <div
            key={segment.key}
            className="flex items-start gap-3 rounded-xl border bg-card/50 p-3"
          >
            <div className={cn('mt-1 size-3 rounded-full', segment.bgClass)} />
            <div className="min-w-0 flex-1">
              <p className={cn('text-sm font-medium', segment.color)}>{segment.label}</p>
              <p className="text-lg font-bold tabular-nums text-foreground">
                {currencyFormatter.format(segment.amount)}
              </p>
              {showCounts && segment.count !== undefined && (
                <p className="text-xs text-muted-foreground">
                  {segment.count.toLocaleString('es-AR')} cuota{segment.count === 1 ? '' : 's'}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RevenueHistory({ history }: { history: DashboardData['history'] }) {
  const maxAmount = Math.max(...history.map((item) => item.amount), 1);

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        Historial de Ingresos (6 meses)
      </h4>
      {history.length === 0 || history.every((item) => item.amount === 0) ? (
        <p className="text-sm text-muted-foreground">No hay ingresos registrados en los últimos meses.</p>
      ) : (
        <div className="flex items-end gap-2 h-32">
          {history.map((item) => {
            const height = maxAmount > 0 ? (item.amount / maxAmount) * 100 : 0;
            return (
              <div
                key={`${item.year}-${item.month}`}
                className="flex flex-1 flex-col items-center gap-2"
              >
                <div
                  className="w-full max-w-12 rounded-t-md bg-gradient-to-t from-primary to-accent opacity-90 transition-all duration-500 hover:opacity-100"
                  style={{ height: `${height}%` }}
                  title={`${item.label}: ${currencyFormatter.format(item.amount)}`}
                />
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function DashboardPanels({ data }: DashboardPanelsProps) {
  const feeSegments: Segment[] = [
    {
      key: 'paid',
      label: 'Pagadas',
      count: data.fees.paid.count,
      amount: data.fees.paid.amount,
      color: 'text-emerald-600',
      bgClass: 'bg-emerald-500',
    },
    {
      key: 'pending',
      label: 'Pendientes',
      count: data.fees.pending.count,
      amount: data.fees.pending.amount,
      color: 'text-amber-600',
      bgClass: 'bg-amber-500',
    },
    {
      key: 'overdue',
      label: 'Vencidas',
      count: data.fees.overdue.count,
      amount: data.fees.overdue.amount,
      color: 'text-red-600',
      bgClass: 'bg-red-500',
    },
  ];

  const incomeSegments: Segment[] = [
    {
      key: 'collected',
      label: 'Cobrado',
      amount: data.income.collected,
      color: 'text-emerald-600',
      bgClass: 'bg-emerald-500',
    },
    {
      key: 'pending',
      label: 'Pendiente',
      amount: data.income.pending,
      color: 'text-amber-600',
      bgClass: 'bg-amber-500',
    },
    {
      key: 'overdue',
      label: 'Vencido',
      amount: data.income.overdue,
      color: 'text-red-600',
      bgClass: 'bg-red-500',
    },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="p-5 pb-3">
          <CardTitle className="text-base font-semibold">Estado de Cuotas</CardTitle>
        </CardHeader>
        <CardContent className="p-5 pt-0 space-y-4">
          {data.fees.generated.count === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay cuotas generadas para el mes en curso.
            </p>
          ) : (
            <StatusBar segments={feeSegments} showCounts />
          )}
          <div className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
            <span className="text-sm text-muted-foreground">Total generadas</span>
            <div className="text-right">
              <p className="text-sm font-semibold text-foreground">
                {data.fees.generated.count.toLocaleString('es-AR')} cuota
                {data.fees.generated.count === 1 ? '' : 's'}
              </p>
              <p className="text-xs text-muted-foreground">
                {currencyFormatter.format(data.fees.generated.amount)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="p-5 pb-3">
          <CardTitle className="text-base font-semibold">Resumen Financiero</CardTitle>
        </CardHeader>
        <CardContent className="p-5 pt-0 space-y-6">
          <StatusBar segments={incomeSegments} />
          <RevenueHistory history={data.history} />
        </CardContent>
      </Card>
    </div>
  );
}
