import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Header } from '@/components/landing/Header';

describe('Landing Header — Portal de socios', () => {
  it('muestra el botón "Portal de socios" apuntando al selector de institución', () => {
    render(<Header />);

    const links = screen.getAllByRole('link', { name: /portal de socios/i });
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link).toHaveAttribute('href', '/pagos');
    }
  });

  it('el CTA primario sigue siendo "Registrar mi club" (jerarquía: una sola CTA rellena)', () => {
    render(<Header />);

    const cta = screen.getAllByRole('link', { name: /registrar mi club/i });
    expect(cta.length).toBeGreaterThan(0);
    for (const link of cta) {
      expect(link).toHaveAttribute('href', '/registro');
      // Primary CTA keeps the filled accent style.
      expect(link.className).toContain('bg-accent');
    }
  });

  it('el botón de socios es secundario (borde, sin relleno accent)', () => {
    render(<Header />);

    const link = screen.getAllByRole('link', { name: /portal de socios/i })[0];
    expect(link.className).toContain('border');
    expect(link.className).not.toContain('bg-accent');
  });
});
