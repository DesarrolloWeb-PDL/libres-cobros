/**
 * Brand isotipo — "LC → check" (branding guide S7).
 *
 * Modular monogram on a 64×64 viewBox: a firm L (vertical + foot) followed
 * by a deliberate gap and a continuous C-flavored swoosh that consolidates
 * into an ascending confirmation check ("cobro automatizado y comprobante
 * verificado"). Two segments keep the guide's modular DNA and let the
 * interactive logo light each zone independently.
 *
 * Single source of truth: Logo.tsx, Footer marks, the dynamic favicon and
 * the generated PWA icons all render these exact paths.
 */
export const MARK_SEGMENTS = [
  // L: firm vertical stroke with a short foot.
  'M14 13 V45 H25',
  // C bowl rising into the check arm (one smooth quadratic, tangent-continuous).
  'M37 45 Q52 47 57 14',
];

/** Representative anchor per segment (for the mouse-proximity light effect). */
export const MARK_ANCHORS = [
  { x: 19, y: 32 },
  { x: 47, y: 38 },
];

export const MARK_STROKE_WIDTH = 8;

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
