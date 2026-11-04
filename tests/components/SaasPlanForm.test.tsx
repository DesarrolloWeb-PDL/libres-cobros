import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SaasPlanForm } from '@/components/admin/SaasPlanForm';
import type { SaasPlanListItem } from '@/types/saas';

const basePlan: SaasPlanListItem = {
  id: 'plan-1',
  name: 'Hasta 200 socios',
  minMembers: 51,
  maxMembers: 200,
  priceArs: 35000,
  highlight: true,
  isActive: true,
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
};

describe('SaasPlanForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (globalThis as { fetch?: unknown }).fetch;
  });

  it('renders create form fields', () => {
    render(
      <SaasPlanForm open onOpenChange={() => {}} onSuccess={() => {}} />
    );

    expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/mínimo de socios/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/máximo de socios/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/precio mensual/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /guardar/i })).toBeInTheDocument();
  });

  it('loads existing plan values in edit mode', () => {
    render(
      <SaasPlanForm plan={basePlan} open onOpenChange={() => {}} onSuccess={() => {}} />
    );

    expect(screen.getByLabelText(/nombre/i)).toHaveValue(basePlan.name);
    expect(screen.getByLabelText(/mínimo de socios/i)).toHaveValue(51);
    expect(screen.getByLabelText(/máximo de socios/i)).toHaveValue(200);
    expect(screen.getByLabelText(/precio mensual/i)).toHaveValue(35000);
  });

  it('shows validation error when max members is lower than min members', async () => {
    render(
      <SaasPlanForm open onOpenChange={() => {}} onSuccess={() => {}} />
    );

    fireEvent.change(screen.getByLabelText(/nombre/i), { target: { value: 'Plan' } });
    fireEvent.change(screen.getByLabelText(/mínimo de socios/i), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText(/máximo de socios/i), { target: { value: '50' } });
    fireEvent.change(screen.getByLabelText(/precio mensual/i), { target: { value: '10000' } });
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

    await waitFor(() => {
      expect(screen.getByText(/el máximo debe ser mayor o igual al mínimo/i)).toBeInTheDocument();
    });
  });

  it('submits create payload and calls onSuccess', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'plan-new' }),
    });
    global.fetch = fetchMock as unknown as typeof global.fetch;

    const onSuccess = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <SaasPlanForm open onOpenChange={onOpenChange} onSuccess={onSuccess} />
    );

    fireEvent.change(screen.getByLabelText(/nombre/i), { target: { value: 'Plan nuevo' } });
    fireEvent.change(screen.getByLabelText(/mínimo de socios/i), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText(/máximo de socios/i), { target: { value: '50' } });
    fireEvent.change(screen.getByLabelText(/precio mensual/i), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/admin/saas/plans',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('"name":"Plan nuevo"'),
        })
      );
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body).toMatchObject({
      name: 'Plan nuevo',
      minMembers: 0,
      maxMembers: 50,
      priceArs: 0,
      highlight: false,
      isActive: true,
    });

    expect(onSuccess).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
