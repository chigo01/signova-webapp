"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Bookmark, BookmarkCheck, Loader2, X } from "lucide-react";
import TradingViewWidget from "@/components/signals/tradingview-widget";
import {
  fetchStockRecommendations,
  addPersonalWatchlistStock,
  fetchPersonalWatchlist,
  removePersonalWatchlistStock,
  type StockNewsDeliveryMode,
  type WatchlistResponse,
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
  const [personalWatchlist, setPersonalWatchlist] =
    useState<WatchlistResponse | null>(null);
  const [watchlistLoading, setWatchlistLoading] = useState(true);
  const [watchlistSaving, setWatchlistSaving] = useState(false);
  const [watchlistError, setWatchlistError] = useState<string | null>(null);
  const [showAlertSetup, setShowAlertSetup] = useState(false);
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
    let cancelled = false;
    void fetchPersonalWatchlist()
      .then((result) => {
        if (!cancelled) setPersonalWatchlist(result);
      })
      .catch((error) => {
        console.error("Failed to load personal watchlist", error);
        if (!cancelled) setWatchlistError("Couldn’t load your watchlist.");
      })
      .finally(() => {
        if (!cancelled) setWatchlistLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
  const isSaved = Boolean(
    personalWatchlist?.items.some((item) => item.symbol === ticker),
  );

  const saveWithDelivery = async (delivery: StockNewsDeliveryMode) => {
    setWatchlistSaving(true);
    setWatchlistError(null);
    try {
      const timezone =
        Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      const result = await addPersonalWatchlistStock(ticker, {
        delivery,
        timezone,
      });
      setPersonalWatchlist(result);
      setShowAlertSetup(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Couldn’t update your watchlist.";
      setWatchlistError(message);
      setShowAlertSetup(false);
    } finally {
      setWatchlistSaving(false);
    }
  };

  const handleWatchlistClick = async () => {
    if (watchlistSaving || watchlistLoading) return;
    if (isSaved) {
      setWatchlistSaving(true);
      setWatchlistError(null);
      try {
        await removePersonalWatchlistStock(ticker);
        setPersonalWatchlist((current) =>
          current
            ? (() => {
                const removed = current.items.find((item) => item.symbol === ticker);
                return {
                ...current,
                items: current.items.filter((item) => item.symbol !== ticker),
                activeCount:
                  removed?.status === "active"
                    ? Math.max(0, current.activeCount - 1)
                    : current.activeCount,
                };
              })()
            : current,
        );
      } catch (error) {
        setWatchlistError(
          error instanceof Error ? error.message : "Couldn’t remove this stock.",
        );
      } finally {
        setWatchlistSaving(false);
      }
      return;
    }

    if (
      personalWatchlist?.items.length === 0 &&
      personalWatchlist.preferences.delivery === "off"
    ) {
      setShowAlertSetup(true);
      return;
    }

    setWatchlistSaving(true);
    setWatchlistError(null);
    try {
      setPersonalWatchlist(await addPersonalWatchlistStock(ticker));
    } catch (error) {
      setWatchlistError(
        error instanceof Error ? error.message : "Couldn’t add this stock.",
      );
    } finally {
      setWatchlistSaving(false);
    }
  };

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

            <div className="flex w-full max-w-xl flex-col items-stretch gap-4 lg:items-end">
              <button
                type="button"
                onClick={() => void handleWatchlistClick()}
                disabled={watchlistLoading || watchlistSaving}
                aria-pressed={isSaved}
                className={`inline-flex h-10 items-center justify-center gap-2 rounded-md border px-4 text-sm font-medium transition-colors disabled:opacity-60 ${
                  isSaved
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15"
                    : "border-zinc-700 bg-zinc-900 text-zinc-100 hover:border-zinc-500"
                }`}
              >
                {watchlistSaving || watchlistLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isSaved ? (
                  <BookmarkCheck className="h-4 w-4" />
                ) : (
                  <Bookmark className="h-4 w-4" />
                )}
                {isSaved ? "Saved to watchlist" : "Add to watchlist"}
              </button>

              {stockLoading ? (
                <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-14 animate-pulse rounded-md bg-zinc-800/80"
                  />
                ))}
                </div>
              ) : stock ? (
                <div className="grid w-full grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-3">
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
              {watchlistError && (
                <p className="text-sm text-red-400" role="alert">
                  {watchlistError}
                </p>
              )}
            </div>
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

      {showAlertSetup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="stock-alert-setup-title"
        >
          <div className="w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-950 p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="stock-alert-setup-title" className="text-lg font-semibold text-white">
                  How should we alert you about {ticker}?
                </h2>
                <p className="mt-1 text-sm text-zinc-400">
                  We only email important company developments. You can change this later in Settings.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void saveWithDelivery("off")}
                className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-white"
                aria-label="Save without email alerts"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-5 space-y-2">
              <button
                type="button"
                onClick={() => void saveWithDelivery("immediate")}
                disabled={watchlistSaving}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-left hover:border-zinc-500 disabled:opacity-60"
              >
                <span className="block text-sm font-medium text-white">Immediate</span>
                <span className="mt-0.5 block text-xs text-zinc-500">Email each important story as it is discovered.</span>
              </button>
              <button
                type="button"
                onClick={() => void saveWithDelivery("daily")}
                disabled={watchlistSaving}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-left hover:border-zinc-500 disabled:opacity-60"
              >
                <span className="block text-sm font-medium text-white">Daily at 8:00 AM</span>
                <span className="mt-0.5 block text-xs text-zinc-500">One combined digest in your current timezone.</span>
              </button>
              <button
                type="button"
                onClick={() => void saveWithDelivery("off")}
                disabled={watchlistSaving}
                className="w-full rounded-lg px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-900 hover:text-white disabled:opacity-60"
              >
                Not now, save without emails
              </button>
            </div>
          </div>
        </div>
      )}
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
