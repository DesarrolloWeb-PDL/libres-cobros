import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Skeleton } from '@/components/ui/skeleton';

describe('Skeleton', () => {
  it('renders with animate-pulse class', () => {
    const { container } = render(<Skeleton className="w-10 h-4" />);
    expect(container.firstChild).toHaveClass('animate-pulse');
  });

  it('applies width/height via className', () => {
    const { container } = render(<Skeleton className="w-24 h-6" />);
    expect(container.firstChild).toHaveClass('w-24', 'h-6');
  });
});