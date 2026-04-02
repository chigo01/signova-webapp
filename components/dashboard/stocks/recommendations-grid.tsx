"use client";

import { useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StockRecommendation } from "@/lib/stocks";

interface Props {
  watchlist: StockRecommendation[];
  topMovers: StockRecommendation[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
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

function recommendationKey(
  r: StockRecommendation["recommendation"]
): keyof typeof REC_STYLES {
  if (r === "BUY" || r === "SELL" || r === "HOLD") return r;
  return "HOLD";
}

function RecommendationCard({ stock }: { stock: StockRecommendation }) {
  const changeColor =
    stock.changePercent >= 0 ? "text-emerald-400" : "text-red-400";
  const changePrefix = stock.changePercent >= 0 ? "↑" : "↓";

  return (
    <div className="relative flex flex-col gap-2 overflow-hidden rounded-lg border border-[#1D1D1D] bg-[#121212] p-4">
      {/* Confidence bar at top of card */}
      <div className="absolute top-0 left-0 h-1 w-full bg-zinc-800">
        <div
          className={`h-full ${BAR_COLORS[recommendationKey(stock.recommendation)]}`}
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
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
            REC_STYLES[recommendationKey(stock.recommendation)]
          }`}
        >
          {stock.recommendation}
        </span>
      </div>

      {/* Trend strength + technical mix */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-zinc-500">
        <span>
          ADX <span className="font-mono text-zinc-400">{stock.adx}</span>
        </span>
        {stock.trending ? (
          <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-300">
            Trending
          </span>
        ) : (
          <span className="rounded bg-zinc-800/60 px-1.5 py-0.5 text-zinc-500">
            Range
          </span>
        )}
        <span className="text-zinc-600">
          Signals {stock.technicalCount.buy}B · {stock.technicalCount.neutral}N
          · {stock.technicalCount.sell}S
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

export function RecommendationsGrid({
  watchlist,
  topMovers,
  loading = false,
  error = null,
  onRetry,
}: Props) {
  const [activeTab, setActiveTab] = useState<"watchlist" | "movers">(
    "watchlist"
  );

  const isEmpty = watchlist.length === 0 && topMovers.length === 0;
  const activeStocks = activeTab === "watchlist" ? watchlist : topMovers;

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("watchlist")}
          className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
            activeTab === "watchlist"
              ? "bg-zinc-700 text-white"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Watchlist Signals ({watchlist.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("movers")}
          className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
            activeTab === "movers"
              ? "bg-zinc-700 text-white"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Today&apos;s Market Movers ({topMovers.length})
        </button>
      </div>

      {error && (
        <div className="mb-4 flex flex-col items-center justify-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950/80 px-4 py-8 text-center sm:flex-row sm:justify-between sm:text-left">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
            <div>
              <p className="text-sm font-medium text-white">
                Couldn&apos;t load recommendations
              </p>
              <p className="mt-1 text-xs text-zinc-500">{error}</p>
            </div>
          </div>
          {onRetry && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="shrink-0 border-zinc-600 bg-transparent text-white hover:bg-zinc-800"
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Retry
            </Button>
          )}
        </div>
      )}

      {loading && !error ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : !error && isEmpty ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 px-4 py-12 text-center text-sm text-zinc-500">
          No stock recommendations in this list yet.
        </div>
      ) : !error && activeStocks.length === 0 ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 px-4 py-12 text-center text-sm text-zinc-500">
          {activeTab === "movers"
            ? "No market movers in the feed right now."
            : "No watchlist signals in the feed right now."}
        </div>
      ) : !error ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {activeStocks.map((stock) => (
            <RecommendationCard key={stock.symbol} stock={stock} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
