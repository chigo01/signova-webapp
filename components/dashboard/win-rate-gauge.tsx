"use client";

export function WinRateGauge({ value = 80 }: { value?: number }) {
  const accent = "#2DD4BF";
  const bg = "#0d0d0d";
  const track = "#2a2a2a";

  // Arc geometry
  const cx = 150;
  const cy = 148;
  const r = 120;
  const sw = 24;

  // Convert math-convention angle (degrees) to SVG point
  const pt = (deg: number, radius = r) => ({
    x: cx + radius * Math.cos((deg * Math.PI) / 180),
    y: cy - radius * Math.sin((deg * Math.PI) / 180),
  });

  // Build SVG arc path from one angle to another
  const arc = (from: number, to: number) => {
    const s = pt(from);
    const e = pt(to);
    const largeArc = from - to > 180 ? 1 : 0;
    return `M${s.x},${s.y} A${r},${r} 0 ${largeArc} 1 ${e.x},${e.y}`;
  };

  const v = Math.min(100, Math.max(0, value));
  const va = 180 - (v / 100) * 180;

  // Section divider tick angles (between each of 5 sections)
  const ticks = [144, 108, 72, 36];

  return (
    <div
      className="flex flex-col items-center rounded-3xl w-full"
      style={{ backgroundColor: bg, padding: "24px 24px 32px" }}
    >
      {/* "First 2 weeks FREE" badge */}
      <span className="mb-8 inline-block rounded bg-white px-5 py-2 text-sm font-black text-black tracking-wide">
        First 2 weeks FREE
      </span>

      {/* Gauge area */}
      <div className="relative w-full max-w-[400px]">
        {/* Labels positioned around the gauge */}
        <div className="absolute left-[-10%] bottom-[10%] text-[11px] font-bold text-white tracking-[0.15em] leading-tight">
          STRONG
          <br />
          SELL
        </div>
        <div className="absolute left-[15%] top-[16%] text-[11px] font-bold text-white tracking-[0.15em]">
          SELL
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 top-[1%] text-[11px] font-bold text-white tracking-[0.15em]">
          NEUTRAL
        </div>
        <div className="absolute right-[15%] top-[16%] text-[11px] font-bold text-white tracking-[0.15em]">
          BUY
        </div>
        <div className="absolute right-[-10%] bottom-[10%] text-[11px] font-bold text-zinc-400 tracking-[0.15em] leading-tight text-right">
          STRONG
          <br />
          BUY
        </div>

        {/* SVG gauge arc */}
        <svg viewBox="0 0 300 162" className="w-full h-auto">
          {/* Background track (full semicircle) */}
          <path
            d={arc(180, 0)}
            fill="none"
            stroke={track}
            strokeWidth={sw}
            strokeLinecap="round"
          />

          {/* Filled value track */}
          {v > 0 && (
            <path
              d={arc(180, va)}
              fill="none"
              stroke={accent}
              strokeWidth={sw}
              strokeLinecap="round"
            />
          )}

          {/* Section divider ticks */}
          {ticks.map((a) => {
            const p1 = pt(a, r - sw / 2 - 4);
            const p2 = pt(a, r + sw / 2 + 4);
            return (
              <line
                key={a}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke={bg}
                strokeWidth={5}
              />
            );
          })}
        </svg>

        {/* Center value display */}
        <div className="absolute inset-x-0 bottom-[2%] text-center">
          <p className="text-5xl font-bold text-white leading-none">{v}%</p>
          <p className="mt-2 text-base italic" style={{ color: accent }}>
            Favour&apos;s Win Rate
          </p>
        </div>
      </div>
    </div>
  );
}
