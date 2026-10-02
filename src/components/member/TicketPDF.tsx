import Image from 'next/image';

const monthLabels: Record<number, string> = {
  1: 'Enero',
  2: 'Febrero',
  3: 'Marzo',
  4: 'Abril',
  5: 'Mayo',
  6: 'Junio',
  7: 'Julio',
  8: 'Agosto',
  9: 'Septiembre',
  10: 'Octubre',
  11: 'Noviembre',
  12: 'Diciembre',
};

const methodLabels: Record<string, string> = {
  stripe: 'Stripe',
  mercadopago: 'Mercado Pago',
  bank_transfer: 'Transferencia bancaria',
};

const currencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
});

const dateFormatter = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export interface TicketPDFProps {
  institution: {
    name: string;
    logoUrl?: string | null;
    primaryColor?: string | null;
  };
  member: {
    firstName: string;
    lastName: string;
    dni: string;
  };
  payment: {
    id: string;
    amount: number;
    method: string;
    createdAt: string;
    confirmedAt: string | null;
    referenceNumber?: string | null;
  };
  fee: {
    month: number;
    year: number;
    planName: string;
  };
  confirmationUrl: string;
  qrDataUrl: string;
}

function getMethodLabel(method: string): string {
  return methodLabels[method] ?? method;
}

function formatPaymentDate(payment: TicketPDFProps['payment']): string {
  const date = payment.confirmedAt ?? payment.createdAt;
  return dateFormatter.format(new Date(date));
}

export function TicketPDF({
  institution,
  member,
  payment,
  fee,
  confirmationUrl,
  qrDataUrl,
}: TicketPDFProps) {
  const primaryColor = institution.primaryColor ?? '#7c3aed';
  const accentStyle = { '--ticket-accent': primaryColor } as React.CSSProperties;

  return (
    <div
      className="ticket-pdf mx-auto max-w-2xl bg-white p-8 text-foreground print:p-0"
      style={accentStyle}
    >
      {/* Header */}
      <header className="mb-6 flex items-center gap-4 border-b border-gray-200 pb-6">
        {institution.logoUrl ? (
          <div className="relative size-16 shrink-0 overflow-hidden rounded-lg">
            <Image
              src={institution.logoUrl}
              alt={institution.name}
              fill
              className="object-contain"
              unoptimized
            />
          </div>
        ) : (
          <div
            className="flex size-16 shrink-0 items-center justify-center rounded-lg text-xl font-bold text-white"
            style={{ backgroundColor: primaryColor }}
          >
            {institution.name.charAt(0)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold leading-tight">{institution.name}</h1>
          <p className="text-xs text-muted-foreground">Portal de Socios</p>
        </div>
      </header>

      {/* Title */}
      <section className="mb-6 text-center">
        <h2
          className="mb-1 text-2xl font-bold uppercase tracking-wide"
          style={{ color: primaryColor }}
        >
          Comprobante de Pago
        </h2>
        <p className="text-xs font-medium text-muted-foreground">
          No es documento fiscal · Referencia: <span className="font-mono">{payment.id}</span>
        </p>
      </section>

      {/* Member */}
      <section className="mb-6 rounded-xl border border-gray-200 bg-gray-50/50 p-5">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Datos del socio
        </h3>
        <div className="grid gap-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Nombre</span>
            <span className="font-medium">
              {member.firstName} {member.lastName}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">DNI</span>
            <span className="font-medium">{member.dni}</span>
          </div>
        </div>
      </section>

      {/* Fee */}
      <section className="mb-6 rounded-xl border border-gray-200 bg-gray-50/50 p-5">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Concepto
        </h3>
        <div className="grid gap-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Período</span>
            <span className="font-medium">
              {monthLabels[fee.month]} {fee.year}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Plan / Categoría</span>
            <span className="font-medium">{fee.planName}</span>
          </div>
        </div>
      </section>

      {/* Payment */}
      <section className="mb-6 rounded-xl border-2 p-5" style={{ borderColor: primaryColor }}>
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Detalle del pago
        </h3>
        <div className="grid gap-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Monto</span>
            <span className="text-xl font-bold" style={{ color: primaryColor }}>
              {currencyFormatter.format(payment.amount)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Fecha de acreditación</span>
            <span className="font-medium">{formatPaymentDate(payment)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Método de pago</span>
            <span className="font-medium">{getMethodLabel(payment.method)}</span>
          </div>
          {payment.referenceNumber && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Referencia externa</span>
              <span className="font-mono text-xs font-medium">{payment.referenceNumber}</span>
            </div>
          )}
        </div>
      </section>

      {/* Footer / QR */}
      <footer className="mt-8 flex flex-col items-center gap-4 border-t border-gray-200 pt-6 sm:flex-row sm:justify-between">
        <div className="text-center text-xs text-muted-foreground sm:text-left">
          <p className="font-medium">Verificá este comprobante escaneando el código QR.</p>
          <p className="mt-1 break-all">{confirmationUrl}</p>
        </div>
        <div className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUrl}
            alt="Código QR de verificación"
            width={120}
            height={120}
            className="size-[120px] rounded-lg border border-gray-200"
          />
        </div>
      </footer>

      {/* Legal disclaimer */}
      <div className="mt-6 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3 text-center text-[10px] uppercase leading-relaxed text-muted-foreground">
        Este documento es un comprobante de pago informativo y no constituye una factura fiscal
        válida. Para fines impositivos, solicitá el correspondiente comprobante fiscal ante la
        administración de {institution.name}.
      </div>
    </div>
  );
}
