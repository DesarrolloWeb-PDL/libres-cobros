import { describe, it, expect } from 'vitest';
import { sociosAlDiaPercent, monthOverMonthPercent, computeOverdueAging } from '@/lib/kpis';

describe('sociosAlDiaPercent', () => {
  it('returns 0 when total is 0', () => {
    expect(sociosAlDiaPercent(0, 0)).toBe(0);
  });

  it('computes percentage with one decimal', () => {
    expect(sociosAlDiaPercent(3, 4)).toBe(75);
    expect(sociosAlDiaPercent(1, 3)).toBe(33.3);
  });

  it('returns 100 when all up to date', () => {
    expect(sociosAlDiaPercent(10, 10)).toBe(100);
  });
});

describe('monthOverMonthPercent', () => {
  it('returns 0 when both are 0', () => {
    expect(monthOverMonthPercent(0, 0)).toBe(0);
  });

  it('returns null when previous is 0 and current > 0', () => {
    expect(monthOverMonthPercent(100, 0)).toBeNull();
  });

  it('computes positive change', () => {
    expect(monthOverMonthPercent(110, 100)).toBe(10);
  });

  it('computes negative change', () => {
    expect(monthOverMonthPercent(90, 100)).toBe(-10);
  });
});

describe('computeOverdueAging', () => {
  it('buckets fees by days past due', () => {
    const now = new Date('2026-01-31T00:00:00Z');
    const fees = [
      { dueDate: new Date('2026-01-15T00:00:00Z'), amount: 100 }, // 16 days
      { dueDate: new Date('2025-12-15T00:00:00Z'), amount: 200 }, // 47 days
      { dueDate: new Date('2025-11-15T00:00:00Z'), amount: 300 }, // 77 days
      { dueDate: new Date('2025-09-01T00:00:00Z'), amount: 400 }, // 152 days
    ];
    const result = computeOverdueAging(fees, now);
    expect(result.map((b) => b.count)).toEqual([1, 1, 1, 1]);
    expect(result.map((b) => b.amount)).toEqual([100, 200, 300, 400]);
    expect(result.map((b) => b.key)).toEqual(['0-30', '31-60', '61-90', '90+']);
  });

  it('returns zero buckets for empty input', () => {
    const result = computeOverdueAging([], new Date('2026-01-31T00:00:00Z'));
    expect(result.every((b) => b.count === 0 && b.amount === 0)).toBe(true);
  });
});