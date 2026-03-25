"use client";

export function WinRateGauge({ value = 80 }: { value?: number }) {
  const accent = "#2DD4BF";
  const bg = "#121212";
  const track = "#2a2a2a";

  const cx = 150;
  const cy = 148;
  const r = 118;
  const sw = 20;

  const pt = (deg: number, radius = r) => ({
    x: cx + radius * Math.cos((deg * Math.PI) / 180),
    y: cy - radius * Math.sin((deg * Math.PI) / 180),
  });

  const arc = (from: number, to: number) => {
    const s = pt(from);
    const e = pt(to);
    const largeArc = from - to > 180 ? 1 : 0;
    return `M${s.x},${s.y} A${r},${r} 0 ${largeArc} 1 ${e.x},${e.y}`;
  };

  const v = Math.min(100, Math.max(0, value));
  const va = 180 - (v / 100) * 180;

  const ticks = [144, 108, 72, 36];

  return (
    <div className="flex h-full min-h-0 w-full flex-col rounded-lg border border-[#1D1D1D] bg-[#121212] p-4">
      <span className="mx-auto inline-flex shrink-0 rounded-md bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-black">
        First 2 weeks FREE
      </span>

      <div className="relative mt-3 flex min-h-[168px] w-full flex-1 flex-col justify-end overflow-visible px-1 sm:px-2">
        <div className="pointer-events-none absolute inset-x-1 top-0 z-10 flex h-[58px] justify-between sm:inset-x-2">
          <div className="flex w-12 flex-col items-center justify-end text-center">
            <span className="text-[9px] font-bold leading-tight tracking-wide text-zinc-500">
              STRONG
            </span>
            <span className="text-[9px] font-bold leading-tight tracking-wide text-zinc-500">
              SELL
            </span>
          </div>
          <div className="absolute left-[26%] top-[28%] text-[9px] font-bold tracking-wide text-zinc-400">
            SELL
          </div>
          <div className="absolute left-1/2 top-0 -translate-x-1/2 text-[9px] font-bold tracking-wide text-zinc-300">
            NEUTRAL
          </div>
          <div className="absolute right-[26%] top-[28%] text-[9px] font-bold tracking-wide text-zinc-400">
            BUY
          </div>
          <div className="flex w-12 flex-col items-center justify-end text-center">
            <span className="text-[9px] font-bold leading-tight tracking-wide text-zinc-500">
              STRONG
            </span>
            <span className="text-[9px] font-bold leading-tight tracking-wide text-zinc-500">
              BUY
            </span>
          </div>
        </div>

        <svg
          viewBox="0 0 300 162"
          className="relative z-0 mt-1 max-h-[132px] w-full shrink-0"
          aria-hidden
        >
          <path
            d={arc(180, 0)}
            fill="none"
            stroke={track}
            strokeWidth={sw}
            strokeLinecap="round"
          />
          {v > 0 && (
            <path
              d={arc(180, va)}
              fill="none"
              stroke={accent}
              strokeWidth={sw}
              strokeLinecap="round"
            />
          )}
          {ticks.map((a) => {
            const p1 = pt(a, r - sw / 2 - 3);
            const p2 = pt(a, r + sw / 2 + 3);
            return (
              <line
                key={a}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke={bg}
                strokeWidth={3}
              />
            );
          })}
        </svg>

        <div className="absolute inset-x-0 bottom-0 z-10 px-2 text-center">
          <p className="text-4xl font-bold leading-none tracking-tight text-white">
            {v}%
          </p>
          <p className="mt-1 text-xs font-medium leading-snug text-zinc-500">
            Favour&apos;s Win Rate
          </p>
        </div>
      </div>
    </div>
  );
}
