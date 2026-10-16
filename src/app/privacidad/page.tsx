import type { Metadata } from 'next';
import Link from 'next/link';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Política de Privacidad - Libres Cobros',
  description:
    'Cómo Libres Cobros procesa los datos de tu institución y de tus socios, y tus derechos bajo la Ley 25.326 de Protección de Datos Personales.',
};

export default function PrivacidadPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
        <p className="text-accent font-mono text-xs tracking-[0.2em] uppercase mb-3">
          Legal
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold mb-8">
          Política de Privacidad
        </h1>

        <div className="space-y-8 text-sm leading-relaxed text-muted-foreground [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_strong]:text-foreground">
          <p>
            Esta política describe cómo <strong>Libres Cobros</strong> procesa la
            información personal en el marco del uso de la plataforma. Está
            redactada para la realidad de este producto: un sistema de
            administración de cobros para clubes e instituciones.
          </p>

          <section>
            <h2>Qué datos procesamos</h2>
            <p>
              Procesamos dos categorías de datos personales. Primero, los{' '}
              <strong>datos de la cuenta de la institución (el club)</strong>:
              nombre, email de las personas administradoras y datos de la
              institución (nombre, slug, configuración del club).
            </p>
            <p>
              Segundo, los <strong>datos de los socios</strong> que la
              institución carga o importa en la plataforma: nombre, DNI,
              teléfono, email, historial de cuotas y de pagos. La institución
              decide qué socios y qué datos incorpora; nosotros los procesamos
              siguiendo sus instrucciones.
            </p>
          </section>

          <section>
            <h2>Cómo se procesan los pagos</h2>
            <p>
              Los pagos online se procesan a través de <strong>Mercado Pago</strong>{' '}
              y <strong>Stripe</strong>. Libres Cobros nunca almacena números de
              tarjeta ni datos completos de tarjetas de crédito o débito: esa
              información viaja cifrada directamente a los procesadores de pago.
              Solo registramos el resultado del pago (monto, fecha, estado y la
              referencia del medio de pago) para el historial del club.
            </p>
          </section>

          <section>
            <h2>Email transaccional y hosting</h2>
            <p>
              Enviamos emails transaccionales (recordatorios de cuota,
              comprobantes, notificaciones de la cuenta) a través de{' '}
              <strong>Resend</strong>. La plataforma está alojada en{' '}
              <strong>Vercel</strong>, con base de datos administrada en la
              nube.
            </p>
          </section>

          <section>
            <h2>Quién controla los datos</h2>
            <p>
              Para los datos de los socios, el <strong>club o institución es el
              responsable del tratamiento</strong>: él decide qué socios carga y
              con qué finalidad. <strong>Libres Cobros actúa como encargado del
              tratamiento</strong>, procesando esos datos únicamente para
              prestar el servicio contratado por la institución. Para los datos
              de la cuenta de la institución (sus administradores), Libres
              Cobros es el responsable del tratamiento.
            </p>
          </section>

          <section>
            <h2>Tus derechos (Ley 25.326)</h2>
            <p>
              La Ley 25.326 de Protección de Datos Personales (Argentina) te
              reconoce derechos de acceso, rectificación, actualización y
              supresión de tus datos personales, y el derecho a oponerte a su
              tratamiento en determinadas circunstancias.
            </p>
            <p>
              Si sos socio de un club que usa Libres Cobros, tu solicitud sobre
              tus datos personales debe dirigirse primero a la institución, que
              es responsable del tratamiento. Si sos administrador de una cuenta
              de Libres Cobros o querés ejercer un derecho sobre datos que
              procesamos como encargados, escribinos y te ayudamos en el
              procedimiento.
            </p>
          </section>

          <section>
            <h2>Contacto</h2>
            <p>
              Para cualquier consulta sobre privacidad o para ejercer tus
              derechos, escribinos a{' '}
              <a
                href="mailto:soporte@librescobros.com"
                className="font-medium text-primary hover:underline"
              >
                soporte@librescobros.com
              </a>
              . También podés ver{' '}
              <Link href="/soporte" className="font-medium text-primary hover:underline">
                la página de soporte
              </Link>
              .
            </p>
          </section>

          <section>
            <h2>Plazos y cambios</h2>
            <p>
              Conservamos los datos mientras la institución mantenga su cuenta
              activa, y luego del cierre según los plazos legales aplicables.
              Podemos actualizar esta política cuando cambie el producto o la
              ley; la fecha de la última actualización figura al pie.
            </p>
          </section>

          <div className="border-t border-border pt-6">
            <p className="text-sm text-muted-foreground">
              Última actualización: octubre 2026
            </p>
            <p className="mt-2 text-xs text-muted-foreground/70">
              Documento informativo — consultá con tu asesor legal antes de
              publicar.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
