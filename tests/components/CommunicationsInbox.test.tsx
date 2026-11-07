import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CommunicationsInbox } from '@/components/member/CommunicationsInbox';

describe('CommunicationsInbox', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it('shows empty state when there are no messages', () => {
    render(<CommunicationsInbox messages={[]} />);
    expect(screen.getByText('Sin mensajes')).toBeInTheDocument();
  });

  it('renders messages and unread badge', () => {
    render(
      <CommunicationsInbox
        messages={[
          {
            id: 'm1',
            kind: 'campaign',
            date: '2026-11-01T10:00:00.000Z',
            sender: 'Club Test',
            message: 'Hola socios',
          },
        ]}
      />
    );

    expect(screen.getByText('Club Test')).toBeInTheDocument();
    expect(screen.getByText('1 sin leer')).toBeInTheDocument();
  });

  it('expands a message and marks it as read', () => {
    render(
      <CommunicationsInbox
        messages={[
          {
            id: 'm2',
            kind: 'campaign',
            date: '2026-11-01T10:00:00.000Z',
            sender: 'Club Test',
            message: 'Mensaje completo',
          },
        ]}
      />
    );

    fireEvent.click(screen.getByText('Club Test').closest('button')!);
    expect(screen.getByText('Mensaje completo')).toBeInTheDocument();
    expect(window.localStorage.getItem('inbox-read:m2')).toBe('1');
  });
});