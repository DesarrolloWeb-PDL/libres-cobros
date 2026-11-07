import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OnboardingChecklist } from '@/components/admin/OnboardingChecklist';

describe('OnboardingChecklist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it('renders progress and steps for incomplete onboarding', () => {
    render(
      <OnboardingChecklist
        initialData={{
          institutionId: 'inst-1',
          steps: [
            { id: 'club-data', label: 'Configurar datos del club', done: true },
            { id: 'members', label: 'Agregar socios', done: false },
          ],
          completedCount: 1,
          totalCount: 2,
          allComplete: false,
        }}
      />
    );

    expect(screen.getByText('Onboarding de la institución')).toBeInTheDocument();
    expect(screen.getByText('1 de 2')).toBeInTheDocument();
    expect(screen.getByText('Configurar datos del club')).toBeInTheDocument();
    expect(screen.getByText('Agregar socios')).toBeInTheDocument();
  });

  it('renders nothing when onboarding is complete', () => {
    const { container } = render(
      <OnboardingChecklist
        initialData={{
          institutionId: 'inst-2',
          steps: [{ id: 'club-data', label: 'Configurar datos del club', done: true }],
          completedCount: 1,
          totalCount: 1,
          allComplete: true,
        }}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('can be dismissed and persists in localStorage', () => {
    const { container } = render(
      <OnboardingChecklist
        initialData={{
          institutionId: 'inst-3',
          steps: [{ id: 'members', label: 'Agregar socios', done: false }],
          completedCount: 0,
          totalCount: 1,
          allComplete: false,
        }}
      />
    );

    expect(screen.getByText('Onboarding de la institución')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Cerrar onboarding/i }));
    expect(container.firstChild).toBeNull();
    expect(window.localStorage.getItem('onboarding-dismissed:inst-3')).toBe('1');
  });

  it('stays hidden when previously dismissed', () => {
    window.localStorage.setItem('onboarding-dismissed:inst-4', '1');
    const { container } = render(
      <OnboardingChecklist
        initialData={{
          institutionId: 'inst-4',
          steps: [{ id: 'members', label: 'Agregar socios', done: false }],
          completedCount: 0,
          totalCount: 1,
          allComplete: false,
        }}
      />
    );
    expect(container.firstChild).toBeNull();
  });
});