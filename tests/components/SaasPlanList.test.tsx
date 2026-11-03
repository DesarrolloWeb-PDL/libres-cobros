import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SaasPlanList } from '@/components/admin/SaasPlanList';
import type { SaasPlanListResponse } from '@/types/saas';

const initialData: SaasPlanListResponse = {
  data: [
    {
      id: 'plan-1',
      name: 'Hasta 50 socios',
      minMembers: 0,
      maxMembers: 50,
      priceArs: 0,
      highlight: false,
      isActive: true,
      createdAt: '2026-11-01T00:00:00.000Z',
      updatedAt: '2026-11-01T00:00:00.000Z',
    },
    {
      id: 'plan-2',
      name: '51 a 200 socios',
      minMembers: 51,
      maxMembers: 200,
      priceArs: 35000,
      highlight: true,
      isActive: false,
      createdAt: '2026-11-01T00:00:00.000Z',
      updatedAt: '2026-11-01T00:00:00.000Z',
    },
  ],
};

describe('SaasPlanList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (globalThis as { fetch?: unknown }).fetch;
  });

  it('renders the list of SaaS plans', () => {
    render(<SaasPlanList initialData={initialData} />);

    expect(screen.getByText('Hasta 50 socios')).toBeInTheDocument();
    expect(screen.getByText('51 a 200 socios')).toBeInTheDocument();
    expect(screen.getByText('Activo')).toBeInTheDocument();
    expect(screen.getByText('Inactivo')).toBeInTheDocument();
  });

  it('opens the form to create a new plan', () => {
    render(<SaasPlanList initialData={initialData} />);

    fireEvent.click(screen.getByRole('button', { name: /nuevo plan saas/i }));

    expect(screen.getByRole('heading', { name: /nuevo plan saas/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/nombre/i)).toHaveValue('');
  });

  it('opens the form pre-filled when editing a plan', () => {
    render(<SaasPlanList initialData={initialData} />);

    const editButtons = screen.getAllByRole('button', { name: /editar/i });
    fireEvent.click(editButtons[1]);

    expect(screen.getByText(/editar plan saas/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/nombre/i)).toHaveValue('51 a 200 socios');
  });

  it('toggles plan active status and refreshes the list', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: initialData.data.map((p) =>
            p.id === 'plan-1' ? { ...p, isActive: false } : p
          ),
        }),
      });
    global.fetch = fetchMock as unknown as typeof global.fetch;

    render(<SaasPlanList initialData={initialData} />);

    const toggleButtons = screen.getAllByRole('button', { name: /desactivar/i });
    fireEvent.click(toggleButtons[0]);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/admin/saas/plans/plan-1',
        expect.objectContaining({
          method: 'PATCH',
          body: expect.stringContaining('"isActive":false'),
        })
      );
    });
  });
});
