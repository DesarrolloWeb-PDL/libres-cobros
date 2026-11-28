interface WordmarkProps {
  className?: string;
  /** Fixed dark surfaces (e.g. the footer): light ink + luminous magenta. */
  onDark?: boolean;
}

/**
 * "Libres Cobros" logotype (branding guide S1): "Libres" in high-contrast
 * ink (#001A40 light / clear text on dark) and "Cobros" in the brand
 * magenta/violet. tracking-tight comes from the caller's classes.
 */
export function Wordmark({ className = '', onDark = false }: WordmarkProps) {
  return (
    <span className={className}>
      <span className={onDark ? 'text-white' : 'text-foreground'}>Libres</span>{' '}
      <span className={onDark ? 'text-[#ad42af]' : 'text-accent'}>Cobros</span>
    </span>
  );
}
