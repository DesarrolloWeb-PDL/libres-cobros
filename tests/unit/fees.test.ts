import { describe, it, expect } from 'vitest';
import { buildDueDate } from '@/lib/fees';

describe('buildDueDate', () => {
  it('returns a Date on the 10th of the given month/year in UTC', () => {
    const result = buildDueDate(2026, 3);
    expect(result.getUTCFullYear()).toBe(2026);
    expect(result.getUTCMonth()).toBe(2); // March = 2 (0-indexed)
    expect(result.getUTCDate()).toBe(10);
  });

  it('handles January (month 1)', () => {
    const result = buildDueDate(2025, 1);
    expect(result.getUTCFullYear()).toBe(2025);
    expect(result.getUTCMonth()).toBe(0);
    expect(result.getUTCDate()).toBe(10);
  });

  it('handles December (month 12)', () => {
    const result = buildDueDate(2024, 12);
    expect(result.getUTCFullYear()).toBe(2024);
    expect(result.getUTCMonth()).toBe(11);
    expect(result.getUTCDate()).toBe(10);
  });

  it('always uses UTC (ignores local timezone)', () => {
    const result = buildDueDate(2026, 6);
    // Should be exactly midnight UTC on the 10th
    expect(result.toISOString()).toBe('2026-06-10T00:00:00.000Z');
  });
});
