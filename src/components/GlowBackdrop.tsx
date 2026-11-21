/**
 * Soft accent glow used as page backdrop (auth screens, portal selector).
 * Absolutely positioned: the parent must be `relative overflow-hidden`.
 */
export function GlowBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-accent/10 blur-3xl"
    />
  );
}
