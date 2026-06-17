"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import TradingViewWidget from "@/components/signals/tradingview-widget";
import {
  fetchStockRecommendations,
  type StockRecommendation,
} from "@/lib/stocks";
import { fetchUsStockQuote, type StockQuoteResult } from "@/lib/stock-quote";
import { usTickerToTradingViewSymbol } from "@/lib/tradingview-us-stock";
import { cn } from "@/lib/utils";

const QUOTE_POLL_MS = 15_000;

/** Default chart interval when no timeframe UI (users can still change in TradingView). */
const CHART_INTERVAL = "D";

/** `marketCap` from API is in millions of USD */
function formatMarketCapMillions(millions: number): string {
  if (!Number.isFinite(millions) || millions <= 0) return "—";
  if (millions >= 1_000_000) {
    return `$${(millions / 1_000_000).toFixed(2)}T`;
  }
  if (millions >= 1_000) {
    return `$${(millions / 1_000).toFixed(2)}B`;
  }
  return `$${millions.toFixed(0)}M`;
}

interface Props {
  symbol: string;
}

export function StockDetailView({ symbol }: Props) {
  const ticker = useMemo(
    () => decodeURIComponent(symbol).trim().toUpperCase(),
    [symbol]
  );

  const [stock, setStock] = useState<StockRecommendation | null>(null);
  const [stockLoading, setStockLoading] = useState(true);
  const [quote, setQuote] = useState<StockQuoteResult | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(true);
  const tvSymbol = useMemo(() => usTickerToTradingViewSymbol(ticker), [ticker]);

  const loadStock = useCallback(async () => {
    if (!ticker) {
      setStock(null);
      setStockLoading(false);
      return;
    }
    try {
      setStockLoading(true);
      const data = await fetchStockRecommendations();
      const all = [...(data.watchlist ?? []), ...(data.topMovers ?? [])];
      const found =
        all.find((s) => s.symbol.toUpperCase() === ticker) ?? null;
      setStock(found);
    } catch {
      setStock(null);
    } finally {
      setStockLoading(false);
    }
  }, [ticker]);

  useEffect(() => {
    void loadStock();
  }, [loadStock]);

  useEffect(() => {
    if (!ticker) return;

    let cancelled = false;
    let first = true;

    const tick = async () => {
      try {
        const q = await fetchUsStockQuote(ticker);
        if (!cancelled && q) setQuote(q);
      } finally {
        if (first && !cancelled) {
          setQuoteLoading(false);
          first = false;
        }
      }
    };

    void tick();
    const id = window.setInterval(() => void tick(), QUOTE_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [ticker]);

  const displayPrice = quote?.price ?? stock?.price;
  const changeAbs = quote?.change ?? stock?.change;
  const changePct = quote?.changePercent ?? stock?.changePercent;

  const isPositive =
    changePct != null
      ? changePct >= 0
      : changeAbs != null
        ? changeAbs >= 0
        : true;
  const priceColor = isPositive ? "text-emerald-400" : "text-red-400";
  const hasLiveQuote = quote != null;

  if (!ticker) {
    return (
      <div className="min-h-screen bg-black px-4 py-16 text-center text-zinc-500">
        Invalid ticker.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black px-4 pb-10 pt-4 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <Link
            href="/dashboard/stocks"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to stocks
          </Link>
        </div>

        <header className="mb-6 border-b border-zinc-800 pb-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                {stock?.sector && stock.sector !== "N/A"
                  ? stock.sector
                  : "US equity"}
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                <span className="text-white">{ticker}</span>
                {stock?.name && (
                  <span className="ml-2 font-medium text-zinc-400">
                    {stock.name}
                  </span>
                )}
              </h1>

              <div className="mt-3 flex flex-col gap-1">
                <div className="flex flex-wrap items-baseline gap-3">
                  {displayPrice != null ? (
                    <>
                      <span
                        className="text-3xl font-semibold tabular-nums text-white sm:text-4xl"
                        aria-live="polite"
                        aria-atomic="true"
                      >
                        ${displayPrice.toFixed(2)}
                      </span>
                      {changeAbs != null && changePct != null && (
                        <span className={`text-sm font-medium ${priceColor}`}>
                          {isPositive ? "+" : ""}
                          {changeAbs.toFixed(2)} ({isPositive ? "+" : ""}
                          {changePct.toFixed(2)}%)
                        </span>
                      )}
                    </>
                  ) : quoteLoading ? (
                    <span className="flex items-center gap-2 text-zinc-500">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Loading price…
                    </span>
                  ) : (
                    <span className="text-zinc-500">Price unavailable</span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-600">
                  {hasLiveQuote && (
                    <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 font-medium text-emerald-400/90">
                      Live
                    </span>
                  )}
                  <span>Refreshes every {QUOTE_POLL_MS / 1000}s</span>
                </div>
              </div>

              {!stock && !stockLoading && (
                <p className="mt-2 text-sm text-zinc-500">
                  No recommendations row for {ticker}. Chart and live quote
                  still load.
                </p>
              )}
            </div>

            {stockLoading ? (
              <div className="grid w-full max-w-xl grid-cols-2 gap-3 sm:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-14 animate-pulse rounded-md bg-zinc-800/80"
                  />
                ))}
              </div>
            ) : stock ? (
              <div className="grid w-full max-w-xl grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-3">
                <Stat label="Day high" value={`$${stock.high.toFixed(2)}`} />
                <Stat label="Day low" value={`$${stock.low.toFixed(2)}`} />
                <Stat
                  label="Market cap"
                  value={formatMarketCapMillions(stock.marketCap)}
                />
                <Stat label="ADX" value={String(stock.adx)} />
                <Stat
                  label="Trend"
                  value={stock.trending ? "Trending" : "Range"}
                />
                <Stat
                  label="Signal"
                  value={stock.recommendation}
                  valueClass={
                    stock.recommendation === "BUY"
                      ? "text-emerald-400"
                      : stock.recommendation === "SELL"
                        ? "text-red-400"
                        : "text-zinc-300"
                  }
                />
              </div>
            ) : null}
          </div>
        </header>

        <div className="h-[min(62vh,720px)] min-h-[380px] w-full overflow-hidden rounded-lg border border-zinc-800 bg-[#0f0f0f]">
          <TradingViewWidget
            symbol={tvSymbol}
            interval={CHART_INTERVAL}
            className="h-full"
          />
        </div>

        {stock && stock.reasons.length > 0 && (
          <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950/50 p-5">
            <h2 className="mb-3 text-sm font-semibold text-zinc-300">
              Analysis notes
            </h2>
            <ul className="space-y-2 text-sm leading-relaxed text-zinc-400">
              {stock.reasons.map((r, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-zinc-600">•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p className={cn("font-medium tabular-nums text-white", valueClass)}>
        {value}
      </p>
    </div>
  );
}
