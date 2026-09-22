"use client";

import Link from "next/link";
import type { StockRecommendation } from "@/lib/stocks";
import { stockDetailPath, type StockMarket } from "@/lib/markets";
import { formatStockPrice, type StockCurrency } from "@/lib/stock-money";

interface BoardProps {
  title: string;
  description: string;
  badge: string;
  market: Exclude<StockMarket, "US">;
  currency: Exclude<StockCurrency, "USD">;
  emptyMessage: string;
  errorMessage: string;
  stocks: StockRecommendation[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

function BoardCard({
  stock,
  market,
  currency,
  badge,
}: {
  stock: StockRecommendation;
  market: Exclude<StockMarket, "US">;
  currency: Exclude<StockCurrency, "USD">;
  badge: string;
}) {
  const priced = stock.price > 0;
  const changeColor =
    stock.changePercent >= 0 ? "text-emerald-400" : "text-red-400";
  const changePrefix = stock.changePercent >= 0 ? "↑" : "↓";

  return (
    <Link
      href={stockDetailPath(stock.symbol, market)}
      className="flex flex-col gap-2 rounded-lg border border-[#1D1D1D] bg-[#121212] p-4 transition-colors hover:border-zinc-600 hover:bg-[#161616]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-white">{stock.symbol}</span>
            <span className="text-zinc-600">·</span>
            <span className="max-w-[140px] truncate text-xs text-zinc-400">
              {stock.name}
            </span>
          </div>
          <span className="text-xs text-zinc-600">{stock.sector}</span>
        </div>
        <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
          {badge}
        </span>
      </div>

      {priced ? (
        <>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-semibold text-white">
              {formatStockPrice(stock.price, currency)}
            </span>
            <span className={`text-xs ${changeColor}`}>
              {changePrefix} {Math.abs(stock.changePercent).toFixed(2)}%
            </span>
          </div>
          <div className="text-xs text-zinc-600">
            H {formatStockPrice(stock.high, currency)} / L{" "}
            {formatStockPrice(stock.low, currency)}
          </div>
        </>
      ) : (
        <p className="text-sm text-zinc-500">Price unavailable</p>
      )}
    </Link>
  );
}

export function ExchangeBoard({
  title,
  description,
  badge,
  market,
  currency,
  emptyMessage,
  errorMessage,
  stocks,
  loading = false,
  error = null,
  onRetry,
}: BoardProps) {
  return (
    <section className="mb-8">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <p className="mt-1 text-xs text-zinc-500">{description}</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-lg bg-zinc-800" />
          ))}
        </div>
      ) : stocks.length === 0 ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 px-4 py-10 text-center text-sm text-zinc-500">
          <p>{error ? errorMessage : emptyMessage}</p>
          {error && onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 text-sm text-white underline-offset-2 hover:underline"
            >
              Retry
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {stocks.map((stock) => (
            <BoardCard
              key={stock.symbol}
              stock={stock}
              market={market}
              currency={currency}
              badge={badge}
            />
          ))}
        </div>
      )}
    </section>
  );
}

const NIGERIA_BOARD = {
  title: "Nigerian Exchange",
  description: "Largest NGX listings, priced in naira. Open a name for its chart.",
  badge: "NGX",
  market: "NGX" as const,
  currency: "NGN" as const,
  emptyMessage: "Nigerian Exchange quotes are not in this feed yet.",
  errorMessage: "Couldn’t load the Nigerian Exchange.",
};

const KOREA_BOARD = {
  title: "Korea Exchange",
  description: "Largest KRX listings, priced in won. Open a name for its chart.",
  badge: "KRX",
  market: "KRX" as const,
  currency: "KRW" as const,
  emptyMessage: "Korea Exchange quotes are not in this feed yet.",
  errorMessage: "Couldn’t load the Korea Exchange.",
};

export function boardCopy(market: "NGX" | "KRX") {
  return market === "KRX" ? KOREA_BOARD : NIGERIA_BOARD;
}

export function NgxBoard(
  props: Omit<BoardProps, keyof typeof NIGERIA_BOARD>,
) {
  return <ExchangeBoard {...NIGERIA_BOARD} {...props} />;
}
