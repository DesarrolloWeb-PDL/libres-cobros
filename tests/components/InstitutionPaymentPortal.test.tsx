import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

const fetchMock = vi.fn();

vi.mock('@/components/ui/toast', () => ({
  toast: { add: vi.fn() },
}));

vi.mock('@/components/member/PaymentPortal', () => ({
  PaymentPortal: () => <div data-testid="payment-portal" />,
}));

import { InstitutionPaymentPortal } from '@/components/member/InstitutionPaymentPortal';

function jsonResponse(status: number, data: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  } as Response;
}

const FEES_PAYLOAD = {
  member: { id: 'm1', dni: '28111222', firstName: 'Juan', lastName: 'Perez', email: null },
  fees: [],
};

function mockRoutes({
  requestStatus = 200,
  requestPayload = { otpRequired: true, message: 'Si el DNI corresponde a un socio, recibirás un código.' },
  verifyStatus = 200,
  verifyPayload = { ok: true },
  feesStatus = 200,
  feesPayload = FEES_PAYLOAD,
}: {
  requestStatus?: number;
  requestPayload?: Record<string, unknown>;
  verifyStatus?: number;
  verifyPayload?: Record<string, unknown>;
  feesStatus?: number;
  feesPayload?: Record<string, unknown>;
} = {}) {
  fetchMock.mockImplementation((url: string) => {
    const u = String(url);
    if (u.includes('/api/member/auth/request-code')) {
      return Promise.resolve(jsonResponse(requestStatus, requestPayload));
    }
    if (u.includes('/api/member/auth/verify-code')) {
      return Promise.resolve(jsonResponse(verifyStatus, verifyPayload));
    }
    if (u.includes('/api/member/auth/logout')) {
      return Promise.resolve(jsonResponse(200, { ok: true }));
    }
    if (u.includes('/api/member/fees')) {
      return Promise.resolve(jsonResponse(feesStatus, feesPayload));
    }
    return Promise.resolve(jsonResponse(404, { error: 'not found' }));
  });
}

async function submitDni(value = '28111222') {
  fireEvent.change(screen.getByPlaceholderText('Ingresá tu DNI'), {
    target: { value },
  });
  fireEvent.click(screen.getByRole('button', { name: /buscar/i }));
}

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = fetchMock as unknown as typeof fetch;
  window.sessionStorage.clear();
  mockRoutes();
});

afterEach(cleanup);

describe('InstitutionPaymentPortal — flujo OTP', () => {
  it('al enviar el DNI llama a request-code y muestra el paso de código', async () => {
    render(
      <InstitutionPaymentPortal clubName="Club Test" slug="club-test" primaryColor="#000" />
    );

    await submitDni();

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some((c) => String(c[0]).includes('/api/member/auth/request-code'))
      ).toBe(true);
    });

    // Code step: single input, ready for paste / SMS-style autofill
    const codeInput = await screen.findByPlaceholderText(/código/i);
    expect(codeInput.getAttribute('autocomplete')).toBe('one-time-code');
    expect(codeInput.getAttribute('inputmode')).toBe('numeric');
    expect(codeInput.getAttribute('maxlength')).toBe('8');
    expect(screen.getByText(/recibirás un código/i)).toBeInTheDocument();
  });

  it('otpRequired:false pero DNI inexistente (club bypass) → error claro, sin paso de código', async () => {
    mockRoutes({
      requestPayload: { otpRequired: false, message: 'x' },
      feesStatus: 401,
      feesPayload: { error: 'Sesión requerida' },
    });
    render(
      <InstitutionPaymentPortal clubName="Club Test" slug="club-test" primaryColor="#000" />
    );

    await submitDni();

    expect(await screen.findByText(/no encontramos un socio/i)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/código/i)).toBeNull();
    expect(screen.queryByTestId('payment-portal')).toBeNull();
  });

  it('verify correcto → carga las cuotas y muestra el portal de pagos', async () => {
    render(
      <InstitutionPaymentPortal clubName="Club Test" slug="club-test" primaryColor="#000" />
    );

    await submitDni();
    const codeInput = await screen.findByPlaceholderText(/código/i);
    fireEvent.change(codeInput, { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /verificar/i }));

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some((c) => String(c[0]).includes('/api/member/auth/verify-code'))
      ).toBe(true);
    });

    expect(await screen.findByTestId('payment-portal')).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some((c) => String(c[0]).includes('/api/member/fees'))
    ).toBe(true);
  });

  it('verify fallido → muestra el error y permite reintentar', async () => {
    mockRoutes({ verifyStatus: 401, verifyPayload: { error: 'El código es incorrecto.' } });
    render(
      <InstitutionPaymentPortal clubName="Club Test" slug="club-test" primaryColor="#000" />
    );

    await submitDni();
    const codeInput = await screen.findByPlaceholderText(/código/i);
    fireEvent.change(codeInput, { target: { value: '000000' } });
    fireEvent.click(screen.getByRole('button', { name: /verificar/i }));

    expect(await screen.findByText(/código es incorrecto/i)).toBeInTheDocument();
    expect(screen.queryByTestId('payment-portal')).toBeNull();
    // still on the code step for a retry
    expect(screen.getByPlaceholderText(/código/i)).toBeInTheDocument();
  });

  it('otpRequired:false (bypass del club) → pasa directo a las cuotas sin pedir código', async () => {
    mockRoutes({ requestPayload: { otpRequired: false, message: 'x' } });
    render(
      <InstitutionPaymentPortal clubName="Club Test" slug="club-test" primaryColor="#000" />
    );

    await submitDni();

    expect(await screen.findByTestId('payment-portal')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/código/i)).toBeNull();
  });

  it('"Volver" en el paso de código regresa al formulario de DNI', async () => {
    render(
      <InstitutionPaymentPortal clubName="Club Test" slug="club-test" primaryColor="#000" />
    );

    await submitDni();
    await screen.findByPlaceholderText(/código/i);

    fireEvent.click(screen.getByRole('button', { name: /volver/i }));

    expect(screen.getByPlaceholderText('Ingresá tu DNI')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/código/i)).toBeNull();
  });

  it('"Cambiar socio" invoca logout y limpia el estado', async () => {
    // Session already valid: request-code short-circuits and fees load directly.
    mockRoutes({ requestPayload: { otpRequired: false, message: 'x' } });
    render(
      <InstitutionPaymentPortal clubName="Club Test" slug="club-test" primaryColor="#000" />
    );

    await submitDni();
    expect(await screen.findByTestId('payment-portal')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /cambiar socio/i }));

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some((c) => String(c[0]).includes('/api/member/auth/logout'))
      ).toBe(true);
    });
    expect(screen.queryByTestId('payment-portal')).toBeNull();
    expect(screen.getByPlaceholderText('Ingresá tu DNI')).toBeInTheDocument();
  });
});
