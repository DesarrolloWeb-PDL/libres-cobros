import Link from 'next/link';

function CubesMark({ className = '' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className={className} aria-hidden>
      <defs>
        <linearGradient id="footerCubesGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="14" height="14" rx="2.5" fill="url(#footerCubesGrad)" opacity="1" />
      <rect x="18" y="0" width="14" height="14" rx="2.5" fill="url(#footerCubesGrad)" opacity="0.7" />
      <rect x="0" y="18" width="14" height="14" rx="2.5" fill="url(#footerCubesGrad)" opacity="0.5" />
      <rect x="18" y="18" width="14" height="14" rx="2.5" fill="url(#footerCubesGrad)" opacity="0.3" />
    </svg>
  );
}

function CubesMarkMuted({ className = '' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className={className} fill="currentColor" aria-hidden>
      <rect x="0" y="0" width="14" height="14" rx="2.5" opacity="1" />
      <rect x="18" y="0" width="14" height="14" rx="2.5" opacity="0.7" />
      <rect x="0" y="18" width="14" height="14" rx="2.5" opacity="0.5" />
      <rect x="18" y="18" width="14" height="14" rx="2.5" opacity="0.3" />
    </svg>
  );
}

const sections = [
  {
    title: 'Para clubes',
    links: [
      { label: 'Registrar club', href: '/registro' },
      { label: 'Iniciar Sesión', href: '/login' },
      { label: 'Panel de administración', href: '/admin' },
    ],
  },
  {
    title: 'Para socios',
    links: [
      { label: 'Portal de socios', href: '/pagos' },
      { label: 'Pagar cuota', href: '/pagos' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative mt-auto bg-gray-900 pt-8 pb-6 text-gray-300">
      <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-violet-600 via-[#764ba2] to-violet-600" />
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-8 grid gap-8 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
          {/* Brand */}
          <div className="flex flex-col gap-2">
            <h3 className="flex items-center gap-2 text-xl font-bold text-white">
              <CubesMark className="size-7 shrink-0" />
              Libres Cobros
            </h3>
            <p className="text-sm leading-relaxed text-gray-400">
              Sistema de administración de cobros para clubes e instituciones:
              socios, cuotas, pagos online y reportes en un solo lugar.
            </p>
          </div>

          {/* Link sections */}
          {sections.map((section) => (
            <div key={section.title} className="flex flex-col gap-3 border-t border-gray-800 pt-4 md:first:border-t-0 md:first:pt-0">
              <h4 className="text-base font-semibold text-white">{section.title}</h4>
              <ul className="flex list-none flex-col gap-2 pl-0">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="inline-block text-sm text-gray-400 no-underline transition-all duration-200 hover:translate-x-1 hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-800 pt-6 text-center text-sm text-gray-500 md:flex-row">
          <p>© 2026 Libres Cobros. Todos los derechos reservados.</p>
          <a
            href="https://desarrolloweb-pdl.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-2 text-xs text-gray-500 no-underline transition-colors hover:text-violet-400"
          >
            <CubesMarkMuted className="size-4 shrink-0 transition-all duration-200 group-hover:scale-110 group-hover:text-violet-400" />
            DesarrolloWeb-pdl
          </a>
        </div>
      </div>
    </footer>
  );
}
