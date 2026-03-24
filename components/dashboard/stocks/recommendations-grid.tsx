"use client";

import { useState } from "react";
import { StockRecommendation } from "@/lib/stocks";

interface Props {
  watchlist: StockRecommendation[];
  topMovers: StockRecommendation[];
}

const REC_STYLES = {
  BUY: "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20",
  HOLD: "text-zinc-300 bg-zinc-700/50 border border-zinc-600",
  SELL: "text-red-400 bg-red-500/10 border border-red-500/20",
} as const;

const BAR_COLORS = {
  BUY: "bg-emerald-500",
  HOLD: "bg-zinc-500",
  SELL: "bg-red-500",
} as const;

function RecommendationCard({ stock }: { stock: StockRecommendation }) {
  const changeColor =
    stock.changePercent >= 0 ? "text-emerald-400" : "text-red-400";
  const changePrefix = stock.changePercent >= 0 ? "↑" : "↓";

  return (
    <div className="relative flex flex-col gap-2 overflow-hidden rounded-lg border border-[#1D1D1D] bg-[#121212] p-4">
      {/* Confidence bar at top of card */}
      <div className="absolute top-0 left-0 h-1 w-full bg-zinc-800">
        <div
          className={`h-full ${BAR_COLORS[stock.recommendation]}`}
          style={{ width: `${stock.confidence}%` }}
        />
      </div>

      {/* Header: symbol + recommendation badge */}
      <div className="flex items-start justify-between pt-1">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-white">{stock.symbol}</span>
            <span className="text-zinc-600">·</span>
            <span className="text-xs text-zinc-400 truncate max-w-[110px]">
              {stock.name}
            </span>
          </div>
          <span className="text-xs text-zinc-600">{stock.sector}</span>
        </div>
        <span
          className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${
            REC_STYLES[stock.recommendation]
          }`}
        >
          {stock.recommendation}
        </span>
      </div>

      {/* Price row */}
      <div className="flex items-baseline gap-2">
        <span className="text-lg font-semibold text-white">
          ${stock.price.toFixed(2)}
        </span>
        <span className={`text-xs ${changeColor}`}>
          {changePrefix} {Math.abs(stock.changePercent).toFixed(2)}%
        </span>
      </div>

      {/* Range + confidence */}
      <div className="flex items-center justify-between text-xs text-zinc-600">
        <span>
          H ${stock.high.toFixed(2)} / L ${stock.low.toFixed(2)}
        </span>
        <span>{stock.confidence}% confidence</span>
      </div>

      {/* GPT reasons */}
      <ul className="space-y-0.5">
        {stock.reasons.map((reason, i) => (
          <li key={i} className="text-xs text-zinc-400 leading-snug">
            • {reason}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SkeletonCard() {
  return <div className="animate-pulse bg-zinc-800 rounded-2xl h-44" />;
}

export function RecommendationsGrid({ watchlist, topMovers }: Props) {
  const [activeTab, setActiveTab] = useState<"watchlist" | "movers">(
    "watchlist"
  );

  const isEmpty = watchlist.length === 0 && topMovers.length === 0;
  const activeStocks = activeTab === "watchlist" ? watchlist : topMovers;

  return (
    <div>
      {/* Tab selector */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab("watchlist")}
          className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
            activeTab === "watchlist"
              ? "bg-zinc-700 text-white"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Watchlist Signals ({watchlist.length})
        </button>
        <button
          onClick={() => setActiveTab("movers")}
          className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
            activeTab === "movers"
              ? "bg-zinc-700 text-white"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Today&apos;s Market Movers ({topMovers.length})
        </button>
      </div>

      {/* Grid */}
      {isEmpty ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {activeStocks.map((stock) => (
            <RecommendationCard key={stock.symbol} stock={stock} />
          ))}
        </div>
      )}
    </div>
  );
}
