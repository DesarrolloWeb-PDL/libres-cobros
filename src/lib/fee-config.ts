import { DateTime } from 'luxon';
import { getInstitutionSiteConfigValues } from '@/lib/site-config';

/**
 * Per-institution fee generation settings (SiteConfig rows, no migration).
 *
 * - fee_generation_day:  day of the month fees are generated (1-28, default 1)
 * - fee_due_day:         day of the month fees are due (1-28, default 10)
 * - fee_notify_enabled:  notify members when new fees are generated (default on)
 * - fee_generation_start:'YYYY-MM-DD' from when the platform wants generation to
 *                        start; when unset the default is the first day of the
 *                        month AFTER the institution was created (a club that
 *                        signs up mid-month starts the following month).
 *
 * Days are capped at 28 so a configured day always exists in every month.
 */
export const FEE_KEYS = {
  generationDay: 'fee_generation_day',
  dueDay: 'fee_due_day',
  notify: 'fee_notify_enabled',
  generationStart: 'fee_generation_start',
} as const;

export const DEFAULT_GENERATION_DAY = 1;
export const DEFAULT_DUE_DAY = 10;
export const MIN_DAY = 1;
export const MAX_DAY = 28;

const ART_ZONE = 'America/Argentina/Buenos_Aires';

export interface FeeConfig {
  generationDay: number;
  dueDay: number;
  notifyEnabled: boolean;
  /** Raw configured start ('YYYY-MM-DD') or null when not set. */
  generationStart: Date | null;
  /** Effective start date (configured value or the next-month-after-signup default). */
  effectiveStart: Date;
}

function parseDay(value: string | undefined, fallback: number): number {
  const n = Number.parseInt((value ?? '').trim(), 10);
  if (Number.isNaN(n) || n < MIN_DAY || n > MAX_DAY) return fallback;
  return n;
}

/** First day of the month AFTER the institution signed up (spec S6). */
export function defaultGenerationStart(createdAt: Date): Date {
  return new Date(Date.UTC(createdAt.getUTCFullYear(), createdAt.getUTCMonth() + 1, 1));
}

function parseStart(value: string | undefined): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function getFeeConfig(clubId: string, createdAt: Date): Promise<FeeConfig> {
  const values = await getInstitutionSiteConfigValues(clubId, Object.values(FEE_KEYS));
  const generationStart = parseStart(values[FEE_KEYS.generationStart]);

  return {
    generationDay: parseDay(values[FEE_KEYS.generationDay], DEFAULT_GENERATION_DAY),
    dueDay: parseDay(values[FEE_KEYS.dueDay], DEFAULT_DUE_DAY),
    notifyEnabled: (values[FEE_KEYS.notify] ?? 'true').trim().toLowerCase() !== 'false',
    generationStart,
    effectiveStart: generationStart ?? defaultGenerationStart(createdAt),
  };
}

/**
 * Due date for a period using the institution's due day (spec S2).
 * When the due day is not after the generation day (e.g. generate 28, due 5)
 * the fee falls due the same day of the NEXT month.
 */
export function buildDueDateForConfig(
  year: number,
  month: number,
  config: Pick<FeeConfig, 'dueDay' | 'generationDay'>
): Date {
  if (config.dueDay > config.generationDay) {
    return new Date(Date.UTC(year, month - 1, config.dueDay));
  }
  // month is 1-based: Date.UTC(year, month, day) lands on the next month.
  return new Date(Date.UTC(year, month, config.dueDay));
}

export type GenerationDecision =
  | { generate: true }
  | { generate: false; reason: 'not-generation-day' | 'before-start' };

/**
 * Should this institution generate today? (specs S1/S5/S6)
 * The start date is a calendar date (stored as YYYY-MM-DD), so both sides of
 * the comparison are compared as calendar days in Argentina time — never as
 * raw instants, which would shift the start back one day.
 */
export function shouldGenerateOn(today: Date, config: FeeConfig): GenerationDecision {
  const now = DateTime.fromJSDate(today, { zone: ART_ZONE });
  const start = DateTime.fromObject(
    {
      year: config.effectiveStart.getUTCFullYear(),
      month: config.effectiveStart.getUTCMonth() + 1,
      day: config.effectiveStart.getUTCDate(),
    },
    { zone: ART_ZONE }
  );

  if (now.startOf('day') < start) {
    return { generate: false, reason: 'before-start' };
  }
  if (now.day !== config.generationDay) {
    return { generate: false, reason: 'not-generation-day' };
  }
  return { generate: true };
}
