/**
 * Miniature layout of the institution landing used by the admin editor:
 * each section card shows a literal mini-layout (header, hero, event cards,
 * history, authorities, contacts, footer) with the zone that form edits
 * glowing in the brand color — so the admin always sees WHERE the thing
 * being modified goes.
 */

export type WireZone =
  | 'site'
  | 'appearance'
  | 'hero'
  | 'events'
  | 'history'
  | 'authorities'
  | 'contacts';

interface LandingWireframeProps {
  zone: WireZone;
  className?: string;
}

const ZONE_LABEL: Record<WireZone, string> = {
  site: 'sitio completo',
  appearance: 'cabecera y marca',
  hero: 'portada',
  events: 'grilla de eventos',
  history: 'bloque de historia',
  authorities: 'autoridades',
  contacts: 'contactos',
};

const PRIMARY = 'var(--primary)';
const MUTED = 'var(--muted)';
const BORDER = 'var(--border)';

function fillFor(on: boolean, base: string): string {
  return on
    ? 'color-mix(in srgb, var(--primary) 18%, transparent)'
    : `color-mix(in srgb, ${base} 30%, transparent)`;
}

export function LandingWireframe({ zone, className = '' }: LandingWireframeProps) {
  const on = (z: WireZone) => zone === z;
  const stroke = (z: WireZone) => (on(z) ? PRIMARY : BORDER);
  const sw = (z: WireZone) => (on(z) ? 1.8 : 1);
  // Non-focused zones recede so the active one pops.
  const dim = (z: WireZone) => (zone === 'site' || on(z) ? 1 : 0.45);
  const cls = (z: WireZone) => (on(z) ? 'wire-active' : undefined);
  const ink = (z: WireZone) => (on(z) ? PRIMARY : MUTED);

  return (
    <svg
      viewBox="0 0 180 120"
      className={`rounded-lg border ${className}`}
      role="img"
      aria-label={`Vista previa de la landing: ${ZONE_LABEL[zone]}`}
      style={{ background: 'var(--card)' }}
    >
      {/* whole site frame (URL del sitio) */}
      <rect
        x="1"
        y="1"
        width="178"
        height="118"
        rx="8"
        fill={on('site') ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'transparent'}
        stroke={stroke('site')}
        strokeWidth={sw('site')}
      />

      {/* header: logo + wordmark + nav pills + CTA (apariencia) */}
      <g className={cls('appearance')} opacity={dim('appearance')}>
        <rect x="5" y="5" width="170" height="13" rx="3" fill={fillFor(on('appearance'), MUTED)} stroke={stroke('appearance')} strokeWidth={sw('appearance')} />
        <rect x="11" y="8.5" width="7" height="7" rx="2" fill={ink('appearance')} />
        <rect x="21" y="10" width="24" height="4" rx="2" fill={ink('appearance')} opacity="0.85" />
        <rect x="96" y="10.5" width="15" height="3" rx="1.5" fill={ink('appearance')} opacity="0.7" />
        <rect x="115" y="10.5" width="15" height="3" rx="1.5" fill={ink('appearance')} opacity="0.7" />
        <rect x="134" y="10.5" width="15" height="3" rx="1.5" fill={ink('appearance')} opacity="0.7" />
        <rect x="153" y="8" width="18" height="8" rx="4" fill={ink('appearance')} opacity="0.95" />
      </g>

      {/* hero: photo tint + headline + subtitle + CTA (portada) */}
      <g className={cls('hero')} opacity={dim('hero')}>
        <rect x="6" y="22" width="168" height="30" rx="3" fill={fillFor(on('hero'), MUTED)} stroke={stroke('hero')} strokeWidth={sw('hero')} />
        <rect x="14" y="28" width="62" height="7" rx="3.5" fill={ink('hero')} opacity="0.9" />
        <rect x="14" y="38" width="46" height="4" rx="2" fill={ink('hero')} opacity="0.55" />
        <rect x="14" y="45" width="30" height="6" rx="3" fill={ink('hero')} opacity="0.95" />
        <rect x="118" y="28" width="48" height="18" rx="3" fill={ink('hero')} opacity="0.25" />
      </g>

      {/* event cards: image + title lines (carteles) */}
      <g className={cls('events')} opacity={dim('events')}>
        <rect x="6" y="56" width="54" height="24" rx="3" fill={fillFor(on('events'), MUTED)} stroke={stroke('events')} strokeWidth={sw('events')} />
        <rect x="63" y="56" width="54" height="24" rx="3" fill={fillFor(on('events'), MUTED)} stroke={stroke('events')} strokeWidth={sw('events')} />
        <rect x="120" y="56" width="54" height="24" rx="3" fill={fillFor(on('events'), MUTED)} stroke={stroke('events')} strokeWidth={sw('events')} />
        <rect x="10" y="60" width="20" height="16" rx="2" fill={ink('events')} opacity="0.55" />
        <rect x="33" y="61" width="23" height="3.5" rx="1.75" fill={ink('events')} opacity="0.85" />
        <rect x="33" y="67" width="16" height="3" rx="1.5" fill={ink('events')} opacity="0.5" />
        <rect x="67" y="60" width="20" height="16" rx="2" fill={ink('events')} opacity="0.55" />
        <rect x="90" y="61" width="23" height="3.5" rx="1.75" fill={ink('events')} opacity="0.85" />
        <rect x="90" y="67" width="16" height="3" rx="1.5" fill={ink('events')} opacity="0.5" />
        <rect x="124" y="60" width="20" height="16" rx="2" fill={ink('events')} opacity="0.55" />
        <rect x="147" y="61" width="23" height="3.5" rx="1.75" fill={ink('events')} opacity="0.85" />
        <rect x="147" y="67" width="16" height="3" rx="1.5" fill={ink('events')} opacity="0.5" />
      </g>

      {/* history: paragraph lines */}
      <g className={cls('history')} opacity={dim('history')}>
        <rect x="6" y="84" width="52" height="16" rx="3" fill={fillFor(on('history'), MUTED)} stroke={stroke('history')} strokeWidth={sw('history')} />
        <rect x="11" y="88" width="42" height="3" rx="1.5" fill={ink('history')} opacity="0.75" />
        <rect x="11" y="93" width="32" height="3" rx="1.5" fill={ink('history')} opacity="0.5" />
      </g>

      {/* authorities: avatars row */}
      <g className={cls('authorities')} opacity={dim('authorities')}>
        <rect x="63" y="84" width="54" height="16" rx="3" fill={fillFor(on('authorities'), MUTED)} stroke={stroke('authorities')} strokeWidth={sw('authorities')} />
        <circle cx="75" cy="92" r="4" fill={ink('authorities')} opacity="0.85" />
        <circle cx="90" cy="92" r="4" fill={ink('authorities')} opacity="0.65" />
        <circle cx="105" cy="92" r="4" fill={ink('authorities')} opacity="0.45" />
      </g>

      {/* contacts: area blocks */}
      <g className={cls('contacts')} opacity={dim('contacts')}>
        <rect x="120" y="84" width="54" height="16" rx="3" fill={fillFor(on('contacts'), MUTED)} stroke={stroke('contacts')} strokeWidth={sw('contacts')} />
        <rect x="125" y="88" width="24" height="3" rx="1.5" fill={ink('contacts')} opacity="0.75" />
        <rect x="125" y="93" width="36" height="3" rx="1.5" fill={ink('contacts')} opacity="0.5" />
      </g>

      {/* footer strip */}
      <g opacity={zone === 'site' ? 1 : 0.5}>
        <rect x="6" y="104" width="168" height="12" rx="3" fill="color-mix(in srgb, var(--muted) 25%, transparent)" stroke={BORDER} strokeWidth="1" />
        <rect x="12" y="108.5" width="22" height="3" rx="1.5" fill={MUTED} opacity="0.7" />
        <rect x="38" y="108.5" width="22" height="3" rx="1.5" fill={MUTED} opacity="0.7" />
        <rect x="64" y="108.5" width="22" height="3" rx="1.5" fill={MUTED} opacity="0.7" />
        <rect x="128" y="108.5" width="40" height="3" rx="1.5" fill={MUTED} opacity="0.5" />
      </g>
    </svg>
  );
}
