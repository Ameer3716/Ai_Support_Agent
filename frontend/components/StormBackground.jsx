export default function StormBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-bg">
      {/* base vignette so edges stay pure black */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(20,16,4,0.55),transparent_60%)]" />

      {/* drifting chic-glow orbs */}
      <div className="absolute -left-40 top-[-10%] h-[520px] w-[520px] rounded-full bg-bg-border blur-[120px] animate-drift" />
      <div className="absolute right-[-10%] top-[8%] h-[420px] w-[420px] rounded-full bg-accent/20 blur-[110px] animate-drift-slow" />
      <div className="absolute left-[20%] bottom-[-15%] h-[460px] w-[460px] rounded-full bg-accent/10 blur-[130px] animate-drift" />

      {/* occasional lightning flicker sheet */}
      <div className="absolute inset-0 bg-accent/[0.06] mix-blend-screen animate-flicker" />

      {/* fine grain so card has texture to refract */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.05]">
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </div>
  );
}
