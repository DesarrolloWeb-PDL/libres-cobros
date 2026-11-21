import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/db', () => ({
  prisma: {
    club: { findMany: vi.fn(), findUnique: vi.fn() },
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/pagos',
  redirect: vi.fn(),
}));

import { prisma } from '@/lib/db';
import PagosPage from '@/app/pagos/page';

const CLUBS = [
  { id: 'c1', name: 'Club Test', slug: 'club-test' },
  { id: 'c2', name: 'Zum Zum', slug: 'club-zum-zum' },
];

describe('Portal de socios (/pagos) — marca y footer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.club.findMany).mockResolvedValue(CLUBS as never);
  });

  // Server component: resolve it manually, then render the returned element.
  it('usa el nombre de marca "Libres Cobros", nunca "Institución Libres"', async () => {
    render(await PagosPage());

    expect(screen.getByRole('heading', { level: 1, name: 'Libres Cobros' })).toBeInTheDocument();
    expect(screen.queryByText(/Institución Libres/)).toBeNull();
  });

  it('el footer usa el nombre de marca correcto', async () => {
    render(await PagosPage());

    expect(screen.getAllByText(/Libres Cobros — Sistema de cobros/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Institución Libres/)).toBeNull();
  });

  it('el logo enlaza a la landing (no queda inerte)', async () => {
    render(await PagosPage());

    const logoLink = screen.getByRole('link', { name: /ir al inicio/i });
    expect(logoLink).toHaveAttribute('href', '/');
  });

  it('tiene el fondo con glow de acento, igual que el login', async () => {
    const { container } = render(await PagosPage());

    expect(container.querySelector('.blur-3xl')).not.toBeNull();
  });
});

describe('Portal del socio (/[slug]) — glow de fondo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.club.findUnique).mockResolvedValue({
      id: 'c1',
      name: 'Club Test',
      slug: 'club-test',
      status: 'ACTIVE',
      logoUrl: null,
      primaryColor: '#000000',
      secondaryColor: '#111111',
      accentColor: '#7c3aed',
    } as never);
  });

  it('la página de entrada del socio comparte el glow del login', async () => {
    const { default: MemberPortalPage } = await import('@/app/pagos/[slug]/page');
    const { container } = render(
      await MemberPortalPage({
        params: Promise.resolve({ slug: 'club-test' }),
        searchParams: Promise.resolve({}),
      })
    );

    expect(container.querySelector('.blur-3xl')).not.toBeNull();
  });
});
