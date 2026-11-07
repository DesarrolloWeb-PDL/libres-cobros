import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyState } from '@/components/ui/empty-state';

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(<EmptyState title="Sin datos" description="No hay registros" />);
    expect(screen.getByText('Sin datos')).toBeInTheDocument();
    expect(screen.getByText('No hay registros')).toBeInTheDocument();
  });

  it('renders an icon element', () => {
    const Icon = ({ className }: { className?: string }) => <svg data-testid="icon" className={className} />;
    render(<EmptyState icon={Icon} title="Vacío" />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('renders an action button and fires onAction', () => {
    const onAction = vi.fn();
    render(<EmptyState title="Vacío" actionLabel="Reintentar" onAction={onAction} />);
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onAction).toHaveBeenCalled();
  });

  it('renders a custom action node', () => {
    render(<EmptyState title="Vacío" action={<button>Custom</button>} />);
    expect(screen.getByText('Custom')).toBeInTheDocument();
  });
});