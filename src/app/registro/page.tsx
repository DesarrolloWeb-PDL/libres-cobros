import Link from 'next/link';
import { RegistrationForm } from '@/components/auth/RegistrationForm';
import { Logo } from '@/components/Logo';

export const metadata = {
  title: 'Crear cuenta - Libres Cobros',
  description: 'Registrá tu club y empezá a gestionar tus cobros.',
};

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-3">
          <Link href="/">
            <Logo size={64} showScroll={false} />
          </Link>
          <div className="text-center">
            <h1 className="text-2xl font-bold">Libres Cobros</h1>
            <p className="text-sm text-muted-foreground">Sistema de administración de instituciones</p>
          </div>
        </div>

        <RegistrationForm />

        <p className="text-center text-sm text-muted-foreground">
          ¿Ya tenés una cuenta?{' '}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
