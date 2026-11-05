/**
 * Placeholder product visual for the landing-page hero.
 * Replace this static mock with a real screenshot of the admin panel
 * (cuotas, pagos, reportes) as soon as one is available.
 */

const summaryCards = [
  { label: 'Recaudación del mes', value: '$245.000' },
  { label: 'Socios al día', value: '38/42' },
  { label: 'Próximo vencimiento', value: '05/12' },
];

const quotaRows = [
  { name: 'Socio A', plan: 'Cuota social', amount: '$5.000', status: 'Pagado' },
  { name: 'Socio B', plan: 'Cuota social', amount: '$5.000', status: 'Pendiente' },
  { name: 'Socio C', plan: 'Cuota deportiva', amount: '$6.500', status: 'Pagado' },
];

export function HeroPanel() {
  return (
    <div className="w-full max-w-2xl overflow-hidden rounded-xl border border-border bg-card p-1 shadow-sm">
      <div className="overflow-hidden rounded-lg border border-border">
        <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-3 py-2">
          <span className="size-2.5 rounded-full bg-red-400" />
          <span className="size-2.5 rounded-full bg-amber-400" />
          <span className="size-2.5 rounded-full bg-green-400" />
          <span className="ml-2 text-xs font-medium text-muted-foreground">Panel de administración</span>
        </div>

        <div className="grid gap-4 p-4 sm:p-5">
          <div className="grid grid-cols-3 gap-3">
            {summaryCards.map((card) => (
              <div key={card.label} className="rounded-lg border border-border bg-background p-3">
                <p className="mb-1 text-xs text-muted-foreground">{card.label}</p>
                <p className="text-lg font-bold text-foreground sm:text-xl">{card.value}</p>
              </div>
            ))}
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-foreground">Cuotas del mes</p>
            <div className="space-y-2">
              {quotaRows.map((row) => {
                const paid = row.status === 'Pagado';
                return (
                  <div
                    key={row.name}
                    className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium text-foreground">{row.name}</p>
                      <p className="text-xs text-muted-foreground">{row.plan}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground">{row.amount}</span>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          paid
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                        }`}
                      >
                        {row.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
