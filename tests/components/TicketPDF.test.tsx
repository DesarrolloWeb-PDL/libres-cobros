import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TicketPDF } from '@/components/member/TicketPDF';
import { TicketActions } from '@/components/member/TicketActions';

const baseTicket = {
  institution: {
    name: 'Club Atlético Libre',
    logoUrl: null,
    primaryColor: '#7c3aed',
  },
  member: {
    firstName: 'Juan',
    lastName: 'Pérez',
    dni: '12345678',
  },
  payment: {
    id: 'payment_123',
    amount: 15000,
    method: 'mercadopago',
    createdAt: '2026-10-02T12:00:00.000Z',
    confirmedAt: '2026-10-02T12:05:00.000Z',
    referenceNumber: 'mp_ref_456',
  },
  fee: {
    month: 10,
    year: 2026,
    planName: 'Cuota social activa',
  },
  confirmationUrl: 'https://example.com/pagos/club-libre/confirmacion?payment_id=payment_123',
  qrDataUrl: 'data:image/png;base64,aaa',
};

describe('TicketPDF', () => {
  it('renders institution name and member details', () => {
    render(<TicketPDF {...baseTicket} />);

    expect(screen.getByText('Club Atlético Libre')).toBeInTheDocument();
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
    expect(screen.getByText('12345678')).toBeInTheDocument();
  });

  it('renders payment details and fee period', () => {
    render(<TicketPDF {...baseTicket} />);

    expect(screen.getByText('Octubre 2026')).toBeInTheDocument();
    expect(screen.getByText('Cuota social activa')).toBeInTheDocument();
    expect(screen.getByText('Mercado Pago')).toBeInTheDocument();
    expect(screen.getByText('mp_ref_456')).toBeInTheDocument();
  });

  it('states the document is not a fiscal invoice', () => {
    render(<TicketPDF {...baseTicket} />);

    expect(screen.getByText(/No es documento fiscal/i)).toBeInTheDocument();
    expect(
      screen.getByText(/no constituye una factura fiscal válida/i)
    ).toBeInTheDocument();
  });

  it('renders the verification QR image', () => {
    render(<TicketPDF {...baseTicket} />);

    const qr = screen.getByAltText('Código QR de verificación');
    expect(qr).toBeInTheDocument();
    expect(qr).toHaveAttribute('src', 'data:image/png;base64,aaa');
  });

  it('shows payment reference and confirmation URL', () => {
    render(<TicketPDF {...baseTicket} />);

    expect(screen.getAllByText(/payment_123/).length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(baseTicket.confirmationUrl)
    ).toBeInTheDocument();
  });
});

describe('TicketActions', () => {
  it('calls window.print when print button is clicked', () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});

    render(<TicketActions />);
    fireEvent.click(screen.getByRole('button', { name: /imprimir/i }));

    expect(printSpy).toHaveBeenCalledTimes(1);

    printSpy.mockRestore();
  });

  it('calls window.print when download PDF button is clicked', () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});

    render(<TicketActions />);
    fireEvent.click(screen.getByRole('button', { name: /descargar pdf/i }));

    expect(printSpy).toHaveBeenCalledTimes(1);

    printSpy.mockRestore();
  });
});
