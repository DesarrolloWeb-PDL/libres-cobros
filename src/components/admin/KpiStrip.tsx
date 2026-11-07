'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, Users, Wallet, AlertTriangle, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { KpiResponse } from '@/types/kpi';

const currencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

export function KpiStrip() {
  const [data, setData] = useState<KpiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchKpis = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/kpis', { cache: 'no-store' });
      if (!response.ok) throw new Error('Error al cargar KPIs');
      const json: KpiResponse = await response.json();
      setData(json);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los KPIs');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Defer to avoid synchronous setState inside the effect (React 19 lint rule).
    const handle = window.setTimeout(() => {
      fetchKpis();
    }, 0);
    return () => window.clearTimeout(handle);
  }, [fetchKpis]);

  const institution = data?.institution ?? null;
  const platform = data?.platform ?? null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          KPIs en tiempo real
        </h2>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-xs text-muted-foreground">
              Actualizado {lastUpdated.toLocaleTimeString('es-AR')}
            </span>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchKpis}
            disabled={isLoading}
            aria-label="Actualizar KPIs"
          >
            <RefreshCw className={cn('size-4', isLoading && 'animate-spin')} />
            <span className="ml-1 hidden sm:inline">Actualizar</span>
          </Button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {platform && (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
          <Card className="rounded-2xl shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-5">
              <CardTitle className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                Instituciones
              </CardTitle>
              <Users className="size-4 text-blue-600" />
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="text-2xl font-bold tabular-nums">{platform.institutionsCount}</div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-5">
              <CardTitle className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                Recaudación del mes (plataforma)
              </CardTitle>
              <Wallet className="size-4 text-emerald-600" />
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="text-2xl font-bold tabular-nums">
                {currencyFormatter.format(platform.totalCollectionsThisMonth)}
              </div>
              <p className="text-xs text-muted-foreground">
                {platform.totalPaymentsThisMonthCount} pagos
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {institution && (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card className="rounded-2xl shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-5">
              <CardTitle className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                Socios al día
              </CardTitle>
              <Users className="size-4 text-blue-600" />
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="text-2xl font-bold tabular-nums">
                {institution.sociosAlDiaPercent.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                {institution.upToDateMembers} de {institution.activeMembers} socios activos
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-5">
              <CardTitle className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                Recaudación del mes
              </CardTitle>
              <Wallet className="size-4 text-emerald-600" />
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="text-2xl font-bold tabular-nums">
                {currencyFormatter.format(institution.collectionsCurrentMonth)}
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                {institution.collectionsChangePercent === null ? (
                  'Sin comparación'
                ) : institution.collectionsChangePercent >= 0 ? (
                  <>
                    <TrendingUp className="size-3 text-emerald-600" />
                    <span className="text-emerald-600">
                      +{institution.collectionsChangePercent.toFixed(1)}%
                    </span>
                    <span>vs mes anterior</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="size-3 text-red-600" />
                    <span className="text-red-600">
                      {institution.collectionsChangePercent.toFixed(1)}%
                    </span>
                    <span>vs mes anterior</span>
                  </>
                )}
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-5">
              <CardTitle className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                Morosidad
              </CardTitle>
              <AlertTriangle className="size-4 text-red-600" />
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="text-2xl font-bold tabular-nums">
                {institution.overdueFeesCount}
              </div>
              <p className="text-xs text-muted-foreground">
                {currencyFormatter.format(institution.overdueFeesAmount)} vencidas
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-5">
              <CardTitle className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                Pagos del mes
              </CardTitle>
              <CreditCard className="size-4 text-violet-600" />
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="text-2xl font-bold tabular-nums">
                {institution.paymentsThisMonthCount}
              </div>
              <p className="text-xs text-muted-foreground">
                {currencyFormatter.format(institution.paymentsThisMonthAmount)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {institution && institution.overdueAging && institution.overdueAging.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Morosidad por antigüedad
          </h3>
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            {institution.overdueAging.map((bucket) => (
              <div key={bucket.key} className="rounded-xl bg-muted/40 p-3">
                <p className="text-xs font-medium text-muted-foreground">{bucket.label}</p>
                <p className="text-lg font-bold tabular-nums">{bucket.count}</p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {currencyFormatter.format(bucket.amount)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {isLoading && !data && (
        <p className="text-sm text-muted-foreground">Cargando KPIs…</p>
      )}
    </div>
  );
}