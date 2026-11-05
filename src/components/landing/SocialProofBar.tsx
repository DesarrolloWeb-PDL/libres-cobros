const proofItems = [
  'Mercado Pago',
  'Stripe',
  'WhatsApp',
  'Email',
  'Facturación ARCA conectada',
  '0% sobre lo recaudado',
];

export function SocialProofBar() {
  return (
    <section className="border-b border-border bg-muted/30 py-4">
      <div className="mx-auto max-w-5xl px-6">
        <p className="sr-only">Integraciones y características incluidas</p>
        <ul className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          {proofItems.map((item) => (
            <li
              key={item}
              className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground"
            >
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
