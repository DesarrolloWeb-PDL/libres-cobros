import type { Metadata } from 'next';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Soporte - Libres Cobros',
  description:
    '¿Necesitás ayuda con el registro, tu cuenta o una consulta de facturación? Escribinos y te respondemos en 24 h hábiles.',
};

export default function SoportePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
        <p className="text-accent font-mono text-xs tracking-[0.2em] uppercase mb-3">
          Ayuda
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold mb-6">
          ¿Necesitás ayuda?
        </h1>

        <div className="space-y-5 text-sm leading-relaxed text-muted-foreground [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_strong]:text-foreground">
          <p>
            Si algo no funciona como esperabas o tenés una consulta, escribinos.
            Atendemos:
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>Consultas sobre el registro:</strong> por qué tu club
              todavía no fue aprobado, qué revisamos y en qué plazo.
            </li>
            <li>
              <strong>Ayuda con tu cuenta:</strong> acceso al panel, usuarios,
              contraseñas y configuración de la institución.
            </li>
            <li>
              <strong>Consultas de facturación:</strong> planes, cobros y
              comprobantes.
            </li>
          </ul>

          {/* TODO: replace with real support email */}
          <p>
            Escribinos a{' '}
            <a
              href="mailto:soporte@librescobros.com"
              className="font-medium text-primary hover:underline"
            >
              soporte@librescobros.com
            </a>
            . Te respondemos en 24 h hábiles.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
