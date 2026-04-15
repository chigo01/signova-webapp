"use client";

import { useEffect, useState } from "react";
import { fetchWinRate } from "@/lib/signals";

export function WinRateGauge({ value = 80 }: { value?: number }) {
  const accent = "#2DD4BF";
  const bg = "#121212";
  const track = "#2a2a2a";

  const cx = 150;
  const cy = 130;
  const r = 104;
  const sw = 18;

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

  const [winRate, setWinRate] = useState<number>(value);

  useEffect(() => {
    let isMounted = true;

    const loadWinRate = async () => {
      try {
        const currentWinRate = await fetchWinRate();
        if (isMounted) {
          setWinRate(currentWinRate);
        }
      } catch {
        // Keep fallback value when request fails.
      }
    };

    loadWinRate();

    return () => {
      isMounted = false;
    };
  }, []);

  const v = Math.min(100, Math.max(0, winRate));
  const displayWinRate = Number.isInteger(v) ? `${v}` : v.toFixed(2);
  const va = 180 - (v / 100) * 180;

  const ticks = [144, 108, 72, 36];

  return (
    <div className="flex h-full min-h-0 w-full flex-col rounded-lg border border-[#1D1D1D] bg-[#121212] p-4">
      <div className="relative mx-auto flex min-h-[230px] w-full max-w-[760px] flex-1 items-end justify-center">
        <svg
          viewBox="0 0 300 160"
          className="w-full shrink-0 overflow-visible"
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

        <div className="absolute inset-x-0 bottom-12 z-10 px-2 text-center">
          <p className="text-4xl font-bold leading-none tracking-tight text-white">
            {displayWinRate}%
          </p>
          <p className="mt-1 text-xs font-medium leading-snug text-zinc-500">
            Signova&apos;s Win Rate
          </p>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-2 z-10 flex items-center justify-between px-4 text-xs font-semibold tracking-wide text-zinc-500 sm:px-8">
          <span>0%</span>
          <span className="text-zinc-300 [text-shadow:-1px_0_0_#121212,1px_0_0_#121212,0_-1px_0_#121212,0_1px_0_#121212]">
            50%
          </span>
          <span>100%</span>
        </div>
      </div>
    </div>
  );
}
