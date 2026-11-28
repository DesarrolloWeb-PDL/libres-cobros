/**
 * Brand isotipo — "LC" monogram (branding guide S1: "monograma geométrico
 * modular... una L de trazo firme y una C envolvente").
 *
 * Two letterform modules on a 64×64 viewBox: a firm L (vertical + foot) and
 * a proper 270° C arc opening to the right — readable as "LC" even at 16px.
 * The check/ticket consolidation from the guide's transition storyboard is
 * intentionally deferred: legibility of the LC monogram comes first.
 *
 * Single source of truth: Logo.tsx, Footer marks, the dynamic favicon and
 * the generated PWA icons all render these exact paths.
 */
export const MARK_SEGMENTS = [
  // L: firm vertical stroke with a foot.
  'M12 14 V48 H24',
  // C: 270° arc (large-arc through the left), opening to the right.
  'M52 22 A12 12 0 1 0 52 40',
];

/** Representative anchor per segment (for the mouse-proximity light effect). */
export const MARK_ANCHORS = [
  { x: 18, y: 34 },
  { x: 44, y: 31 },
];

export const MARK_STROKE_WIDTH = 8;

/** Gradient line across both glyphs (userSpaceOnUse). */
export const MARK_GRADIENT = { x1: 12, y1: 14, x2: 56, y2: 40 } as const;

/** Badge container radius for app icons / favicons (guide: rounded corners). */
export const BADGE_RADIUS = 14;

/** App-icon badge gradient (guide: #582694 → #1E1674 → #0E1B63). */
export const BADGE_GRADIENT_STOPS = [
  { offset: '0%', color: '#582694' },
  { offset: '55%', color: '#1e1674' },
  { offset: '100%', color: '#0e1b63' },
] as const;

/** The mark as one SVG fragment (paths share stroke attrs via a parent <g>). */
export function markPathsSvg(): string {
  return MARK_SEGMENTS.map((d) => `<path d="${d}"/>`).join('');
}
