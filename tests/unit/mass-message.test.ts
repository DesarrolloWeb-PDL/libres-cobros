import { describe, it, expect } from 'vitest';
import {
  buildMassMessageWhere,
  deriveCampaignStatus,
  parseScheduledAt,
} from '@/lib/mass-message';
import type { MassMessageFilters } from '@/types/messaging';

describe('buildMassMessageWhere', () => {
  it('scopes by clubId (tenant isolation)', () => {
    const where = buildMassMessageWhere('club-123', { segment: 'all' });
    expect(where).toHaveProperty('clubId', 'club-123');
  });

  it('returns empty tenant scope for superadmin without institution', () => {
    const where = buildMassMessageWhere(null, { segment: 'all' });
    expect(where).toEqual({});
  });

  it('applies status, plan and category filters', () => {
    const filters: MassMessageFilters = {
      status: 'ACTIVE',
      planId: 'plan-1',
      category: 'ADULT',
      segment: 'all',
    };
    const where = buildMassMessageWhere('club-1', filters);
    expect(where).toMatchObject({
      clubId: 'club-1',
      status: 'ACTIVE',
      planId: 'plan-1',
      category: 'ADULT',
    });
  });

  it('builds an OR search over dni, first and last name', () => {
    const where = buildMassMessageWhere('club-1', {
      search: 'Juan',
      segment: 'all',
    });
    expect(where.OR).toHaveLength(3);
    expect(where.OR).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ dni: expect.objectContaining({ contains: 'Juan' }) }),
        expect.objectContaining({ firstName: expect.objectContaining({ contains: 'Juan' }) }),
        expect.objectContaining({ lastName: expect.objectContaining({ contains: 'Juan' }) }),
      ])
    );
  });

  it('filters up_to_date members as those without pending or overdue fees', () => {
    const where = buildMassMessageWhere('club-1', { segment: 'up_to_date' });
    expect(where.fees).toEqual({
      none: { status: { in: ['PENDING', 'OVERDUE'] } },
    });
  });

  it('filters overdue members as those with at least one overdue fee', () => {
    const where = buildMassMessageWhere('club-1', { segment: 'overdue' });
    expect(where.fees).toEqual({ some: { status: 'OVERDUE' } });
  });

  it('filters debt members as pending fees but no overdue fees', () => {
    const where = buildMassMessageWhere('club-1', { segment: 'debt' });
    expect(where.fees).toEqual({ some: { status: 'PENDING' } });
    expect(where.NOT).toEqual({ fees: { some: { status: 'OVERDUE' } } });
  });

  it('defaults segment to all when omitted', () => {
    const where = buildMassMessageWhere('club-1', {});
    expect(where.fees).toBeUndefined();
    expect(where.NOT).toBeUndefined();
  });
});

describe('deriveCampaignStatus', () => {
  it('returns SENT when every recipient succeeded', () => {
    expect(deriveCampaignStatus({ recipientCount: 3, sent: 3, failed: 0, skipped: 0 })).toBe(
      'SENT'
    );
  });

  it('returns FAILED when every recipient failed', () => {
    expect(deriveCampaignStatus({ recipientCount: 3, sent: 0, failed: 3, skipped: 0 })).toBe(
      'FAILED'
    );
  });

  it('returns PARTIAL on a mixed result', () => {
    expect(deriveCampaignStatus({ recipientCount: 4, sent: 2, failed: 1, skipped: 1 })).toBe(
      'PARTIAL'
    );
  });

  it('returns FAILED when there are no recipients', () => {
    expect(deriveCampaignStatus({ recipientCount: 0, sent: 0, failed: 0, skipped: 0 })).toBe(
      'FAILED'
    );
  });
});

describe('parseScheduledAt', () => {
  it('interprets a datetime-local value as America/Argentina/Buenos_Aires', () => {
    const result = parseScheduledAt('2026-12-25T09:00');
    expect(result).not.toBeNull();
    expect(result!.toISOString()).toBe('2026-12-25T12:00:00.000Z');
  });

  it('returns null for invalid input', () => {
    expect(parseScheduledAt('not-a-date')).toBeNull();
  });
});
