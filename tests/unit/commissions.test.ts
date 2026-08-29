import { describe, it, expect, vi } from 'vitest';
import { createCommission } from '@/lib/commissions';
import type { Club } from '@prisma/client';

function makeClub(overrides: Partial<Club> = {}): Club {
  return {
    id: 'club-1',
    name: 'Test Club',
    siglas: null,
    slug: 'test-club',
    commissionType: 'PERCENTAGE',
    commissionValue: 10,
    status: 'ACTIVE',
    logoUrl: null,
    primaryColor: '#7c3aed',
    secondaryColor: '#a78bfa',
    accentColor: '#5b21b6',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Club;
}

function makePayment(overrides = {}) {
  return {
    id: 'pay-1',
    feeId: 'fee-1',
    clubId: 'club-1',
    amount: 5000,
    ...overrides,
  };
}

function mockTx() {
  return {
    commission: {
      create: vi.fn().mockResolvedValue({ id: 'comm-1' }),
    },
  } as any;
}

describe('createCommission', () => {
  it('returns null for FIXED commission type', async () => {
    const club = makeClub({ commissionType: 'FIXED' });
    const tx = mockTx();

    const result = await createCommission(tx, makePayment(), club);

    expect(result).toBeNull();
    expect(tx.commission.create).not.toHaveBeenCalled();
  });

  it('calculates PERCENTAGE commission correctly', async () => {
    const club = makeClub({ commissionType: 'PERCENTAGE', commissionValue: 10 });
    const tx = mockTx();

    await createCommission(tx, makePayment({ amount: 5000 }), club);

    expect(tx.commission.create).toHaveBeenCalledWith({
      data: {
        clubId: 'club-1',
        paymentId: 'pay-1',
        feeId: 'fee-1',
        amount: 500, // 5000 * 10 / 100
        rate: 10,
      },
    });
  });

  it('rounds the amount to nearest integer', async () => {
    const club = makeClub({ commissionType: 'PERCENTAGE', commissionValue: 7.5 });
    const tx = mockTx();

    await createCommission(tx, makePayment({ amount: 1000 }), club);

    // 1000 * 7.5 = 7500, / 100 = 75
    expect(tx.commission.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ amount: 75 }),
      })
    );
  });

  it('handles zero payment amount', async () => {
    const club = makeClub({ commissionType: 'PERCENTAGE', commissionValue: 10 });
    const tx = mockTx();

    await createCommission(tx, makePayment({ amount: 0 }), club);

    expect(tx.commission.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ amount: 0 }),
      })
    );
  });

  it('handles 100% commission rate', async () => {
    const club = makeClub({ commissionType: 'PERCENTAGE', commissionValue: 100 });
    const tx = mockTx();

    await createCommission(tx, makePayment({ amount: 3000 }), club);

    expect(tx.commission.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ amount: 3000 }),
      })
    );
  });
});
