import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/db', () => ({
  prisma: {
    club: { findMany: vi.fn() },
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
});
