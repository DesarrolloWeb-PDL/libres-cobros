import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next-auth/react', () => ({
  signIn: vi.fn().mockResolvedValue({ ok: false, error: 'CredentialsSignin' }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

import AdminLoginPage from '@/app/(auth)/login/page';

describe('Login de instituciones — caminos de salida', () => {
  it('ofrece el Portal de socios para quien llega al lugar equivocado', () => {
    render(<AdminLoginPage />);

    const portal = screen.getByRole('link', { name: /portal de socios/i });
    expect(portal).toHaveAttribute('href', '/pagos');
  });

  it('ofrece el registro para quien todavía no tiene cuenta', () => {
    render(<AdminLoginPage />);

    const registro = screen.getByRole('link', { name: /registrar mi club/i });
    expect(registro).toHaveAttribute('href', '/registro');
  });

  it('ofrece soporte para quien no puede entrar (no hay auto-recuperación)', () => {
    render(<AdminLoginPage />);

    const soporte = screen.getByRole('link', { name: /soporte/i });
    expect(soporte).toHaveAttribute('href', '/soporte');
  });

  it('mantiene el formulario de credenciales funcionando', () => {
    render(<AdminLoginPage />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ingresar/i })).toBeInTheDocument();
    // CardTitle renders a div in this repo's UI kit; assert by text.
    expect(screen.getByText(/iniciar sesión/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: /libres cobros/i })).toBeInTheDocument();
  });
});
