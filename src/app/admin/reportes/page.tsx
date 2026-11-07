import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const reports = [
  { href: '/admin/reportes/deudas', title: 'Reporte de deudas', description: 'Socios con cuotas pendientes o vencidas y monto total adeudado.' },
  { href: '/admin/reportes/pagos', title: 'Historial de pagos', description: 'Pagos confirmados con filtros por período, método y socio.' },
  { href: '/admin/comisiones', title: 'Reporte de comisiones', description: 'Comisiones generadas por período y método de pago.' },
  { href: '/admin/reportes/morosidad', title: 'Morosidad por antigüedad', description: 'Socios con cuotas vencidas agrupados por días de atraso.' },
  { href: '/admin/reportes/conceptos', title: 'Reporte por concepto', description: 'Cuotas agrupadas por plan y categoría.' },
];

export default async function ReportsIndexPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
    redirect('/login');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Reportes</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Seleccioná un reporte para ver el detalle y exportarlo.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => (
          <Link key={report.href} href={report.href} className="block">
            <Card className="h-full transition-colors hover:bg-muted/40">
              <CardHeader>
                <CardTitle className="text-base">{report.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{report.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}