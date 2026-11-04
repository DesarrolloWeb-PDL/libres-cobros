import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SubscriptionAlertBanner } from '@/components/admin/SubscriptionAlertBanner';
import type { SubscriptionAlertState } from '@/lib/saas-subscription-alert';

describe('SubscriptionAlertBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it('renders nothing when the alert status is ok', () => {
    const alert: SubscriptionAlertState = { status: 'ok', invoice: null };
    const { container } = render(<SubscriptionAlertBanner alert={alert} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders a due-soon warning with the due date and amount', () => {
    const alert: SubscriptionAlertState = {
      status: 'due-soon',
      invoice: {
        id: 'inv-1',
        amount: 35000,
        dueDate: new Date('2026-11-10T00:00:00.000Z'),
        month: 11,
        year: 2026,
        daysUntilDue: 5,
      },
    };
    render(<SubscriptionAlertBanner alert={alert} />);

    expect(screen.getByText(/Tu factura SaaS vence pronto/i)).toBeInTheDocument();
    expect(screen.getByText(/vence el 10 de noviembre de 2026/i)).toBeInTheDocument();
    expect(screen.getByText(/35\.000,00/)).toBeInTheDocument();
  });

  it('renders an overdue warning with the number of days overdue', () => {
    const alert: SubscriptionAlertState = {
      status: 'overdue',
      invoice: {
        id: 'inv-1',
        amount: 35000,
        dueDate: new Date('2026-11-10T00:00:00.000Z'),
        month: 11,
        year: 2026,
        daysOverdue: 5,
      },
    };
    render(<SubscriptionAlertBanner alert={alert} />);

    expect(screen.getByText(/Factura SaaS vencida/i)).toBeInTheDocument();
    expect(screen.getByText(/vencida hace 5 días/i)).toBeInTheDocument();
    expect(
      screen.getByText(/El acceso a la plataforma permanece activo/i)
    ).toBeInTheDocument();
  });

  it('can be dismissed and hides the banner', () => {
    const alert: SubscriptionAlertState = {
      status: 'due-soon',
      invoice: {
        id: 'inv-1',
        amount: 35000,
        dueDate: new Date('2026-11-10T00:00:00.000Z'),
        month: 11,
        year: 2026,
        daysUntilDue: 5,
      },
    };
    const { container } = render(<SubscriptionAlertBanner alert={alert} />);

    expect(screen.getByText(/Tu factura SaaS vence pronto/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Cerrar alerta/i }));

    expect(container.firstChild).toBeNull();
    expect(window.localStorage.getItem('saas-alert-dismissed:inv-1')).toBe('1');
  });

  it('stays hidden when it was previously dismissed for the same invoice', () => {
    const alert: SubscriptionAlertState = {
      status: 'due-soon',
      invoice: {
        id: 'inv-dismissed',
        amount: 35000,
        dueDate: new Date('2026-11-10T00:00:00.000Z'),
        month: 11,
        year: 2026,
        daysUntilDue: 5,
      },
    };
    window.localStorage.setItem('saas-alert-dismissed:inv-dismissed', '1');

    const { container } = render(<SubscriptionAlertBanner alert={alert} />);

    expect(container.firstChild).toBeNull();
  });
});
