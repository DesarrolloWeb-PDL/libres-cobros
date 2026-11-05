import { describe, it, expect } from 'vitest';
import { sociosAlDiaPercent, monthOverMonthPercent } from '@/lib/kpis';

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