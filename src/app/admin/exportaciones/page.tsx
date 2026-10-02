import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ExportForm } from '@/components/admin/ExportForm';

export default async function ExportsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.role || session.user.role !== 'SUPER_ADMIN') {
    redirect('/login');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Exportaciones</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Exportá datos de la institución en formato CSV o JSON para respaldos o análisis.
        </p>
      </div>

      <ExportForm institutionId={session.user.institutionId} />

      <div className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Notas</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>JSON permite exportar varias tablas en un solo archivo.</li>
          <li>CSV genera un archivo por tabla.</li>
          <li>Los datos se filtran por el rango de fechas según la tabla seleccionada.</li>
          <li>La exportación respeta el alcance institucional del usuario.</li>
        </ul>
      </div>
    </div>
  );
}
