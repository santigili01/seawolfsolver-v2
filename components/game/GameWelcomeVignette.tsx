/**
 * Dark center spotlight over Sea Wolf biolum art so white welcome copy stays readable.
 * Place inside a `relative` full-viewport welcome container; stack content above with `z-10`.
 */
export function GameWelcomeVignette() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0"
      style={{
        background:
          "radial-gradient(ellipse 100% 95% at 50% 42%, rgba(4, 14, 32, 0.8) 0%, rgba(4, 14, 32, 0.55) 36%, rgba(4, 14, 32, 0.2) 54%, transparent 72%)",
      }}
    />
  )
}
