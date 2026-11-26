/**
 * Landing content model (spec S6): stored in SiteConfig rows under the
 * `landing_` prefix — no migration, one key per section so partial saves
 * never rewrite the big image blobs of other sections.
 *
 * Images are data-URLs (the only pattern that works on Vercel, whose FS is
 * read-only at runtime): cover ≤ ~2.2MB, event flyer ≤ ~1MB, max 8 events.
 */
export const LANDING_KEYS = {
  url: 'landing_url',
  cover: 'landing_cover',
  events: 'landing_events',
  authorities: 'landing_authorities',
  contacts: 'landing_contacts',
  history: 'landing_history',
  appearance: 'landing_appearance',
} as const;

export interface LandingCover {
  image: string | null;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
}

export interface LandingEvent {
  id: string;
  title: string;
  image: string | null;
  date: string;
  link: string;
}

export interface LandingAuthority {
  id: string;
  name: string;
  role: string;
}

export interface LandingContact {
  id: string;
  area: string;
  phone: string;
  email: string;
  note: string;
}

export interface LandingAppearance {
  dark: boolean;
  sections: {
    events: boolean;
    authorities: boolean;
    contacts: boolean;
    history: boolean;
  };
  heroStyle: 'overlay' | 'brand';
}

export interface LandingContent {
  url: string | null;
  cover: LandingCover | null;
  events: LandingEvent[];
  authorities: LandingAuthority[];
  contacts: LandingContact[];
  history: string;
  appearance: LandingAppearance;
}

export const DEFAULT_APPEARANCE: LandingAppearance = {
  dark: false,
  sections: { events: true, authorities: true, contacts: true, history: true },
  heroStyle: 'overlay',
};

export const EMPTY_COVER: LandingCover = {
  image: null,
  title: '',
  subtitle: '',
  ctaLabel: '',
  ctaHref: '',
};

function parseJson<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    const value = JSON.parse(raw);
    return value === null || value === undefined ? fallback : value;
  } catch {
    return fallback;
  }
}

function readList<T>(
  raw: string | undefined,
  maxItems: number,
  normalize: (item: Record<string, unknown>, index: number) => T
): T[] {
  const parsed = parseJson<unknown>(raw, []);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((item) => item && typeof item === 'object')
    .slice(0, maxItems)
    .map((item, index) => normalize(item as Record<string, unknown>, index));
}

/** Tolerant read used by the public API (specs S1-S3). */
export function readLandingContent(values: Record<string, string>): LandingContent {
  const rawCover = parseJson<Record<string, unknown> | null>(values[LANDING_KEYS.cover], null);
  const rawAppearance = parseJson<Partial<LandingAppearance> | null>(values[LANDING_KEYS.appearance], null);

  const cover: LandingCover | null = rawCover
    ? {
        image:
          typeof rawCover.image === 'string' && rawCover.image.startsWith('data:image/')
            ? rawCover.image.slice(0, 3_000_000)
            : null,
        title: String(rawCover.title ?? '').slice(0, 140),
        subtitle: String(rawCover.subtitle ?? '').slice(0, 240),
        ctaLabel: String(rawCover.ctaLabel ?? '').slice(0, 60),
        ctaHref: String(rawCover.ctaHref ?? '').slice(0, 300),
      }
    : null;

  const appearance: LandingAppearance = {
    dark: rawAppearance?.dark === true,
    sections: {
      events: rawAppearance?.sections?.events ?? DEFAULT_APPEARANCE.sections.events,
      authorities: rawAppearance?.sections?.authorities ?? DEFAULT_APPEARANCE.sections.authorities,
      contacts: rawAppearance?.sections?.contacts ?? DEFAULT_APPEARANCE.sections.contacts,
      history: rawAppearance?.sections?.history ?? DEFAULT_APPEARANCE.sections.history,
    },
    heroStyle: rawAppearance?.heroStyle === 'brand' ? 'brand' : 'overlay',
  };

  return {
    url: values[LANDING_KEYS.url] || null,
    cover,
    events: readList<LandingEvent>(values[LANDING_KEYS.events], 8, (item, index) => ({
      id: typeof item.id === 'string' && item.id ? item.id : `ev-${index}`,
      title: String(item.title ?? '').slice(0, 140),
      image:
        typeof item.image === 'string' && item.image.startsWith('data:image/')
          ? item.image
          : null,
      date: String(item.date ?? '').slice(0, 40),
      link: String(item.link ?? '').slice(0, 300),
    })),
    authorities: readList<LandingAuthority>(values[LANDING_KEYS.authorities], 12, (item, index) => ({
      id: typeof item.id === 'string' && item.id ? item.id : `au-${index}`,
      name: String(item.name ?? '').slice(0, 90),
      role: String(item.role ?? '').slice(0, 90),
    })),
    contacts: readList<LandingContact>(values[LANDING_KEYS.contacts], 10, (item, index) => ({
      id: typeof item.id === 'string' && item.id ? item.id : `ct-${index}`,
      area: String(item.area ?? '').slice(0, 70),
      phone: String(item.phone ?? '').slice(0, 40),
      email: String(item.email ?? '').slice(0, 130),
      note: String(item.note ?? '').slice(0, 180),
    })),
    // Raw text (not JSON): long prose with newlines must not need escaping.
    history: (values[LANDING_KEYS.history] ?? '').slice(0, 20000),
    appearance,
  };
}
