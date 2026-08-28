const nodePositions = [
  "left-[12%] top-[18%]",
  "left-[28%] top-[72%]",
  "left-[58%] top-[16%]",
  "left-[76%] top-[64%]",
  "left-[88%] top-[30%]"
];

export function MotionBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#050706]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(69,211,154,0.12),transparent_34rem),linear-gradient(180deg,#080b0a_0%,#050706_58%,#0d1110_100%)]" />
      <div className="landing-grid absolute inset-0 opacity-[0.22]" />
      <div className="landing-noise absolute inset-0 opacity-[0.045]" />
      <div className="landing-glow absolute left-1/2 top-24 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-primary/12 blur-3xl" />
      <div className="landing-signal-field absolute inset-0">
        {nodePositions.map((position, index) => (
          <span
            key={position}
            className={`landing-field-node absolute ${position} size-1.5 rounded-full bg-primary/70 shadow-[0_0_28px_rgba(69,211,154,0.44)]`}
            style={{ animationDelay: `${index * 1.6}s` }}
          />
        ))}
      </div>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
    </div>
  );
}
