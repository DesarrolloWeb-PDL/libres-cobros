import { describe, it, expect } from 'vitest';
import {
  defaultGenerationStart,
  shouldGenerateOn,
  type FeeConfig,
} from '@/lib/fee-config';

function makeConfig(overrides: Partial<FeeConfig> = {}): FeeConfig {
  return {
    generationDay: 1,
    dueDay: 10,
    notifyEnabled: true,
    generationStart: null,
    effectiveStart: new Date('2026-12-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('defaultGenerationStart', () => {
  it('starts the month after a mid-month signup (spec S6)', () => {
    const start = defaultGenerationStart(new Date('2026-11-15T12:00:00Z'));
    expect(start.toISOString()).toBe('2026-12-01T00:00:00.000Z');
  });

  it('also starts the next month when signing up on the 1st', () => {
    const start = defaultGenerationStart(new Date('2026-11-01T12:00:00Z'));
    expect(start.toISOString()).toBe('2026-12-01T00:00:00.000Z');
  });

  it('rolls December signups into January of the next year', () => {
    const start = defaultGenerationStart(new Date('2026-12-20T12:00:00Z'));
    expect(start.toISOString()).toBe('2027-01-01T00:00:00.000Z');
  });
});

describe('shouldGenerateOn', () => {
  it('generates when today is the configured day on/after the start', () => {
    const config = makeConfig({
      generationDay: 5,
      effectiveStart: new Date('2026-11-01T00:00:00.000Z'),
    });
    expect(shouldGenerateOn(new Date('2026-11-05T09:00:00Z'), config)).toEqual({
      generate: true,
    });
  });

  it('skips with not-generation-day on any other day', () => {
    const config = makeConfig({
      generationDay: 5,
      effectiveStart: new Date('2026-11-01T00:00:00.000Z'),
    });
    expect(shouldGenerateOn(new Date('2026-11-23T09:00:00Z'), config)).toEqual({
      generate: false,
      reason: 'not-generation-day',
    });
  });

  it('skips with before-start before the configured start date', () => {
    const config = makeConfig({
      generationDay: 30,
      effectiveStart: new Date('2026-12-01T00:00:00.000Z'),
    });
    expect(shouldGenerateOn(new Date('2026-11-30T12:00:00Z'), config)).toEqual({
      generate: false,
      reason: 'before-start',
    });
  });

  it('generates exactly on the start date', () => {
    const config = makeConfig({
      generationDay: 1,
      effectiveStart: new Date('2026-12-01T00:00:00.000Z'),
    });
    expect(shouldGenerateOn(new Date('2026-12-01T09:00:00Z'), config)).toEqual({
      generate: true,
    });
  });

  it('decides on the Argentina calendar day, not the UTC day', () => {
    // 02:00 UTC on Dec 1 is still Nov 30, 21:00 in Buenos Aires.
    const config = makeConfig({
      generationDay: 1,
      effectiveStart: new Date('2026-11-01T00:00:00.000Z'),
    });
    expect(shouldGenerateOn(new Date('2026-12-01T02:00:00Z'), config)).toEqual({
      generate: false,
      reason: 'not-generation-day',
    });
  });
});
