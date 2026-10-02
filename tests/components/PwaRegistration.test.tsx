import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { PwaRegistration } from '@/components/PwaRegistration';

describe('PwaRegistration', () => {
  it('renders nothing', () => {
    const { container } = render(<PwaRegistration />);
    expect(container.firstChild).toBeNull();
  });

  it('registers the service worker when available', () => {
    const registerSpy = vi.fn().mockResolvedValue(undefined as unknown as ServiceWorkerRegistration);
    Object.defineProperty(global.navigator, 'serviceWorker', {
      value: { register: registerSpy },
      configurable: true,
    });

    render(<PwaRegistration />);

    expect(registerSpy).toHaveBeenCalledWith('/sw.js');
  });

  it('swallows service worker registration errors', () => {
    Object.defineProperty(global.navigator, 'serviceWorker', {
      value: {
        register: vi.fn().mockRejectedValue(new Error('Registration failed')),
      },
      configurable: true,
    });

    expect(() => render(<PwaRegistration />)).not.toThrow();
  });
});
