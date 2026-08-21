/**
 * Signature ambient backdrop: three slow-drifting glow fields (signal /
 * flow / pulse) behind the glass panels. This is the one place motion is
 * spent deliberately — everything else in the UI stays still. Disabled
 * automatically under prefers-reduced-motion via the global CSS override in
 * globals.css (no per-component motion-safe checks needed).
 *
 * Purely decorative: aria-hidden, fixed, and behind everything else.
 */
export function AmbientBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-void">
      <div className="absolute inset-0 bg-grid-faint bg-[size:44px_44px] opacity-[0.05]" />
      <div className="animate-aurora absolute -left-1/4 -top-1/4 h-[60vw] w-[60vw] rounded-full bg-signal/20 blur-[120px]" />
      <div
        className="animate-aurora absolute -right-1/4 top-1/3 h-[55vw] w-[55vw] rounded-full bg-pulse/[0.16] blur-[130px]"
        style={{ animationDelay: "-6s" }}
      />
      <div
        className="animate-aurora absolute bottom-[-20%] left-1/4 h-[50vw] w-[50vw] rounded-full bg-flow/[0.14] blur-[130px]"
        style={{ animationDelay: "-11s" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-void/40 to-void" />
    </div>
  );
}
