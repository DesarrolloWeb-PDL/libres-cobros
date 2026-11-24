import { describe, it, expect } from 'vitest';
import { buildDueDateForConfig } from '@/lib/fee-config';

describe('buildDueDateForConfig', () => {
  it('keeps the historical default: due on the 10th when generation is the 1st', () => {
    const result = buildDueDateForConfig(2026, 3, { dueDay: 10, generationDay: 1 });
    expect(result.toISOString()).toBe('2026-03-10T00:00:00.000Z');
  });

  it('uses any configured due day that is after the generation day', () => {
    const result = buildDueDateForConfig(2026, 3, { dueDay: 20, generationDay: 5 });
    expect(result.toISOString()).toBe('2026-03-20T00:00:00.000Z');
  });

  it('rolls to the next month when the due day is before the generation day', () => {
    // Spec S2: generación 28, vencimiento 5 → vence el 5 del mes siguiente.
    const result = buildDueDateForConfig(2026, 11, { dueDay: 5, generationDay: 28 });
    expect(result.toISOString()).toBe('2026-12-05T00:00:00.000Z');
  });

  it('rolls to the next month when the due day equals the generation day', () => {
    const result = buildDueDateForConfig(2026, 11, { dueDay: 15, generationDay: 15 });
    expect(result.toISOString()).toBe('2026-12-15T00:00:00.000Z');
  });

  it('rolls January into February', () => {
    const result = buildDueDateForConfig(2027, 1, { dueDay: 3, generationDay: 28 });
    expect(result.toISOString()).toBe('2027-02-03T00:00:00.000Z');
  });

  it('rolls December into the next year', () => {
    const result = buildDueDateForConfig(2026, 12, { dueDay: 5, generationDay: 28 });
    expect(result.toISOString()).toBe('2027-01-05T00:00:00.000Z');
  });
});
