"use client";

import { Search, ArrowDownRight, TriangleAlert } from "lucide-react";

// --- Mini Candlestick SVG ---
function MiniCandlestickChart() {
  // Small candlestick-like chart for the trade card
  const candles = [
    { o: 30, c: 20, h: 35, l: 15, up: false },
    { o: 22, c: 28, h: 32, l: 18, up: true },
    { o: 28, c: 18, h: 33, l: 14, up: false },
    { o: 20, c: 30, h: 35, l: 16, up: true },
    { o: 30, c: 26, h: 36, l: 22, up: false },
    { o: 24, c: 32, h: 37, l: 20, up: true },
    { o: 32, c: 22, h: 38, l: 18, up: false },
    { o: 24, c: 34, h: 39, l: 20, up: true },
    { o: 34, c: 28, h: 40, l: 24, up: false },
    { o: 26, c: 36, h: 41, l: 22, up: true },
  ];

  return (
    <svg viewBox="0 0 100 50" className="h-12 w-20">
      {candles.map((c, i) => {
        const x = 5 + i * 10;
        const bodyTop = Math.min(c.o, c.c);
        const bodyH = Math.abs(c.o - c.c);
        return (
          <g key={i}>
            {/* Wick */}
            <line
              x1={x}
              y1={50 - c.h}
              x2={x}
              y2={50 - c.l}
              stroke={c.up ? "#10b981" : "#ef4444"}
              strokeWidth={1}
            />
            {/* Body */}
            <rect
              x={x - 2.5}
              y={50 - bodyTop - bodyH}
              width={5}
              height={Math.max(bodyH, 1)}
              fill={c.up ? "#10b981" : "#ef4444"}
              rx={0.9}
            />
          </g>
        );
      })}
    </svg>
  );
}

// --- Stat Card ---
function StatCard({
  label,
  value,
  valueColor = "text-white",
  secondaryValue,
  secondaryColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
  secondaryValue?: string;
  secondaryColor?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-5 py-4">
      <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <p className={`text-2xl font-bold ${valueColor}`}>
        {value}
        {secondaryValue && (
          <span className={`ml-1 ${secondaryColor || "text-emerald-400"}`}>
            {secondaryValue}
          </span>
        )}
      </p>
    </div>
  );
}

export default function JournalPage() {
  return (
    <main className="flex-1 overflow-y-auto overflow-x-hidden">
      <div className="p-8">
        {/* Header */}
        <header className="mb-8 flex items-center justify-between border-b border-zinc-800 pb-4">
          <h3 className="text-xl font-bold text-white">Trading journal</h3>
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="USDT/GOLD"
                className="h-10 w-64 rounded-full bg-zinc-900 pl-10 pr-4 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-700"
              />
            </div>
          </div>
        </header>

        {/* Title */}
        <h1 className="mb-6 text-3xl font-bold text-white">
          Your week at a glance
        </h1>

        {/* Top Stats Row */}
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="R/R %" value="80%" />
          <StatCard label="Total P/L" value="+$12,500" />
          <StatCard
            label="Duration"
            value="$30 /"
            secondaryValue="$90"
            secondaryColor="text-emerald-400"
          />
          <StatCard label="Biggest Loss" value="-$330" />
        </div>

        {/* Trade Summary Row */}
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-9">
          {/* Trade Card */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 lg:col-span-3">
            <div className="mb-2 flex items-start justify-between">
              <div>
                <span className="text-sm font-bold text-white">SENT/USDT</span>
                <span className="ml-2 rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-red-400">
                  SELL 0.01
                </span>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-zinc-500">2025.07.29 22:57:03</p>
                <p className="text-sm font-medium text-zinc-400">7.63</p>
              </div>
            </div>
            <p className="mb-2 text-xs text-zinc-500">3 319.99 → 3 312.36</p>
            <div className="mb-3">
              <MiniCandlestickChart />
            </div>
            <button className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white">
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              View trade
            </button>
          </div>

          {/* Trades Logged */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-5 py-4 lg:col-span-2">
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              Trades Logged
            </p>
            <p className="text-3xl font-bold text-white">350</p>
            <p className="mt-1 text-xs text-emerald-400">18 losses last week</p>
          </div>

          {/* Win Rate */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-5 py-4 lg:col-span-2">
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              Win Rate %
            </p>
            <p className="text-3xl font-bold text-emerald-400">35%</p>
            <div className="mt-2 space-y-1">
              <p className="flex items-center gap-1 text-xs text-emerald-400">
                <span className="text-[10px]">▲</span> +$540 BTO/USD
              </p>
              <p className="flex items-center gap-1 text-xs text-red-400">
                <span className="text-[10px]">▼</span> -$303 ETH USD
              </p>
            </div>
          </div>

          {/* Total P/L */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-5 py-4 lg:col-span-2">
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              Total P/L
            </p>
            <p className="text-3xl font-bold text-emerald-400">+$12,500</p>
            <div className="mt-2 space-y-1">
              <p className="flex items-center gap-1 text-xs text-emerald-400">
                <span className="text-[10px]">▲</span> +$540 BTO/USD
              </p>
              <p className="flex items-center gap-1 text-xs text-red-400">
                <span className="text-[10px]">▼</span> -$303 ETH USD
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Section: Emotional Bias + AI Insights */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Emotional Bias Detection */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              Emotional Bias Detection
            </p>
            <h2 className="mb-6 text-xl font-bold text-white">
              Pattern Analysis
            </h2>

            <div className="mb-6 space-y-2">
              <p className="text-sm text-zinc-300">
                Total fields: +$2000 oN TSLA
              </p>
              <p className="text-sm text-zinc-300">
                Total fields: +$2000 oN TSLA
              </p>
              <p className="text-sm text-zinc-300">Win rate: +70%</p>
            </div>

            <ol className="list-decimal space-y-2 pl-5 text-sm text-zinc-400">
              <li>Stick on your trade for Mondays</li>
              <li>Refine existing strategy for showing trades.</li>
              <li>Refine existing strategy for showing trades.</li>
            </ol>
          </div>

          {/* AI Insights */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
            <div className="mb-1 flex items-center justify-between">
              <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                AI Insights
              </p>
              <span className="rounded-md border border-zinc-700 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                Upcoming
              </span>
            </div>
            <h2 className="mb-6 text-xl font-bold text-white">
              Pattern Analysis
            </h2>

            {/* Blurred / faded content to mimic upcoming/locked feel */}
            <div className="mb-6 space-y-2">
              <p className="text-sm text-rose-400/60 blur-[1.5px]">
                Total fields: +$2000 oN TSLA
              </p>
              <p className="text-sm text-rose-400/60 blur-[1.5px]">
                Total fields: +$2000 oN TSLA
              </p>
              <p className="text-sm text-rose-400/60 blur-[1.5px]">
                Win rate: +70%
              </p>
            </div>

            <div>
              <h4 className="mb-3 text-sm font-medium text-zinc-400">
                Highlights
              </h4>
              <ol className="list-decimal space-y-2 pl-5 text-sm text-zinc-400">
                <li>Stick on your trade for Mondays</li>
                <li>Refine existing strategy for showing trades.</li>
                <li>Refine existing strategy for showing trades.</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
