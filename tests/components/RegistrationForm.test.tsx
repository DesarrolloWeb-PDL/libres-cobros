import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RegistrationForm } from '@/components/auth/RegistrationForm';

const pushMock = vi.fn();
const refreshMock = vi.fn();
const signInMock = vi.fn();

delete (globalThis as { fetch?: unknown }).fetch;

vi.mock('next-auth/react', () => ({
  signIn: (...args: unknown[]) => signInMock(...args),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
}));

describe('RegistrationForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all required fields', () => {
    render(<RegistrationForm />);

    expect(screen.getByLabelText(/nombre del club/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/siglas/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/identificador url/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/nombre del administrador/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email del administrador/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^contraseña$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /crear cuenta/i })).toBeInTheDocument();
  });

  it('auto-generates slug from club name', () => {
    render(<RegistrationForm />);

    const nameInput = screen.getByLabelText(/nombre del club/i);
    fireEvent.change(nameInput, { target: { value: 'Club Atlético Libres' } });

    expect(screen.getByLabelText(/identificador url/i)).toHaveValue('club-atletico-libres');
  });

  it('shows slug preview based on generated slug', () => {
    render(<RegistrationForm />);

    const nameInput = screen.getByLabelText(/nombre del club/i);
    fireEvent.change(nameInput, { target: { value: 'Club Libres' } });

    expect(screen.getByText(/portal de socios:/i)).toHaveTextContent('/pagos/club-libres');
  });

  it('shows validation errors for empty required fields', async () => {
    render(<RegistrationForm />);

    fireEvent.click(screen.getByRole('button', { name: /crear cuenta/i }));

    await waitFor(() => {
      expect(screen.getByText(/el nombre del club es obligatorio/i)).toBeInTheDocument();
      expect(screen.getByText(/el slug es obligatorio/i)).toBeInTheDocument();
      expect(screen.getByText(/el nombre del administrador es obligatorio/i)).toBeInTheDocument();
      expect(screen.getByText(/ingresá un email válido/i)).toBeInTheDocument();
      expect(screen.getByText(/la contraseña debe tener al menos 6 caracteres/i)).toBeInTheDocument();
    });
  });

  it('submits registration and redirects to admin on success', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    signInMock.mockResolvedValue({ ok: true, error: null });

    render(<RegistrationForm />);

    fireEvent.change(screen.getByLabelText(/nombre del club/i), { target: { value: 'Club Libres' } });
    fireEvent.change(screen.getByLabelText(/nombre del administrador/i), { target: { value: 'Juan Pérez' } });
    fireEvent.change(screen.getByLabelText(/email del administrador/i), { target: { value: 'admin@club.com' } });
    fireEvent.change(screen.getByLabelText(/^contraseña$/i), { target: { value: 'secure123' } });

    fireEvent.click(screen.getByRole('button', { name: /crear cuenta/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/register',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('"slug":"club-libres"'),
        })
      );
    });

    await waitFor(() => {
      expect(signInMock).toHaveBeenCalledWith('credentials', expect.objectContaining({
        email: 'admin@club.com',
        password: 'secure123',
        redirect: false,
        callbackUrl: '/admin',
      }));
    });

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/admin');
    });
  });

  it('redirects to login when auto-login fails after successful registration', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    signInMock.mockResolvedValue({ ok: false, error: 'CredentialsSignin' });

    render(<RegistrationForm />);

    fireEvent.change(screen.getByLabelText(/nombre del club/i), { target: { value: 'Club Libres' } });
    fireEvent.change(screen.getByLabelText(/nombre del administrador/i), { target: { value: 'Juan Pérez' } });
    fireEvent.change(screen.getByLabelText(/email del administrador/i), { target: { value: 'admin@club.com' } });
    fireEvent.change(screen.getByLabelText(/^contraseña$/i), { target: { value: 'secure123' } });

    fireEvent.click(screen.getByRole('button', { name: /crear cuenta/i }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/login?registered=1');
    });
  });

  it('displays server error when registration fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Ya existe una institución con ese identificador' }),
    });

    render(<RegistrationForm />);

    fireEvent.change(screen.getByLabelText(/nombre del club/i), { target: { value: 'Club Libres' } });
    fireEvent.change(screen.getByLabelText(/nombre del administrador/i), { target: { value: 'Juan Pérez' } });
    fireEvent.change(screen.getByLabelText(/email del administrador/i), { target: { value: 'admin@club.com' } });
    fireEvent.change(screen.getByLabelText(/^contraseña$/i), { target: { value: 'secure123' } });

    fireEvent.click(screen.getByRole('button', { name: /crear cuenta/i }));

    await waitFor(() => {
      expect(screen.getByText(/ya existe una institución con ese identificador/i)).toBeInTheDocument();
    });
  });
});
