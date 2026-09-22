"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { HeatMap } from "@/components/dashboard/stocks/heat-map";
import { TopNewsList } from "@/components/dashboard/stocks/top-news-list";
import { TopGainers } from "@/components/dashboard/stocks/top-gainers";
import { RecommendationsGrid } from "@/components/dashboard/stocks/recommendations-grid";
import { PersonalWatchlist } from "@/components/dashboard/stocks/personal-watchlist";
import { ExchangeBoard, boardCopy } from "@/components/dashboard/stocks/ngx-board";
import { MarketMenu } from "@/components/dashboard/stocks/market-menu";
import { isNgxTicker } from "@/lib/ngx";
import { isKrxTicker } from "@/lib/krx";
import { stockDetailPath, type StockMarket } from "@/lib/markets";
import {
  fetchStockRecommendations,
  fetchTopNews,
  getStocksCache,
  isStocksCacheStale,
  setStocksNewsCache,
  setStocksRecommendationsCache,
  type NewsArticle,
  type StockRecommendation,
  type StockRecommendationsResponse,
} from "@/lib/stocks";
import { relativeTime } from "@/lib/time";

const emptyData: StockRecommendationsResponse = {
  watchlist: [],
  topMovers: [],
  ngx: [],
  krx: [],
  lastUpdated: new Date().toISOString(),
};

const MARKET_STORAGE_KEY = "signova.stockMarket";

function readStoredMarket(): StockMarket {
  if (typeof window === "undefined") return "US";
  const stored = window.sessionStorage.getItem(MARKET_STORAGE_KEY);
  return stored === "NGX" || stored === "KRX" ? stored : "US";
}

function filterStocks(
  list: StockRecommendation[],
  query: string
): StockRecommendation[] {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter(
    (s) =>
      s.symbol.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q)
  );
}

export function StocksPageContent() {
  const router = useRouter();
  // Seed from the in-memory cache so returning to this page (e.g. from a stock
  // detail) renders instantly without a loading flash.
  const [data, setData] = useState<StockRecommendationsResponse>(
    () => getStocksCache().recommendations ?? emptyData
  );
  const [loading, setLoading] = useState(
    () => getStocksCache().recommendations === null
  );
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [market, setMarket] = useState<StockMarket>(readStoredMarket);
  const [news, setNews] = useState<NewsArticle[]>(
    () => getStocksCache().news ?? []
  );
  const [newsLoading, setNewsLoading] = useState(
    () => getStocksCache().news === null
  );

  const filtered = useMemo(() => {
    return {
      watchlist: filterStocks(data.watchlist, searchQuery),
      topMovers: filterStocks(data.topMovers, searchQuery),
      ngx: filterStocks(data.ngx ?? [], searchQuery),
      krx: filterStocks(data.krx ?? [], searchQuery),
    };
  }, [data.watchlist, data.topMovers, data.ngx, data.krx, searchQuery]);

  const load = useCallback(async ({ background = false } = {}) => {
    // Background refreshes keep the cached data on screen (no spinner).
    if (!background) {
      setLoading(true);
      setNewsLoading(true);
    }
    setError(null);

    const [recsResult, newsResult] = await Promise.allSettled([
      fetchStockRecommendations(),
      fetchTopNews(),
    ]);

    if (recsResult.status === "fulfilled") {
      setStocksRecommendationsCache(recsResult.value);
      setData(recsResult.value);
    } else {
      console.error(recsResult.reason);
      // Keep any cached data on screen; only surface an error when we have none.
      if (getStocksCache().recommendations === null) {
        setError(
          recsResult.reason instanceof Error
            ? recsResult.reason.message
            : "Couldn’t load stock recommendations."
        );
        setData(emptyData);
      }
    }
    setLoading(false);

    if (newsResult.status === "fulfilled") {
      setStocksNewsCache(newsResult.value.articles);
      setNews(newsResult.value.articles);
    } else {
      console.error(newsResult.reason);
      if (getStocksCache().news === null) {
        setNews([]);
      }
    }
    setNewsLoading(false);
  }, []);

  const chooseMarket = useCallback((next: StockMarket) => {
    setMarket(next);
    window.sessionStorage.setItem(MARKET_STORAGE_KEY, next);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const cache = getStocksCache();
      const hasCache = cache.recommendations !== null && cache.news !== null;
      if (!hasCache) {
        void load(); // first load — show spinner, full fetch
      } else if (isStocksCacheStale()) {
        void load({ background: true }); // stale-while-revalidate, no spinner
      }
      // fresh cache → render as-is, skip the fetch
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const openTickerFromSearch = useCallback(() => {
    const raw = searchQuery.trim();
    const q = raw.toLowerCase();
    const pools = [
      ...(data.krx ?? []).map((stock) => ({ ...stock, market: "KRX" as const })),
      ...(data.ngx ?? []).map((stock) => ({ ...stock, market: "NGX" as const })),
      ...data.watchlist.map((stock) => ({
        ...stock,
        market:
          stock.market === "NGX" || stock.market === "KRX" ? stock.market : ("US" as const),
      })),
      ...data.topMovers.map((stock) => ({
        ...stock,
        market:
          stock.market === "NGX" || stock.market === "KRX" ? stock.market : ("US" as const),
      })),
    ];
    const hit =
      pools.find((stock) => stock.symbol.toLowerCase() === q) ??
      pools.find((stock) => stock.name.toLowerCase() === q);
    if (hit) {
      router.push(stockDetailPath(hit.symbol, hit.market));
      return;
    }
    const ticker = raw.toUpperCase().replace(/[^A-Z0-9.-]/g, "");
    if (!ticker) return;
    router.push(
      stockDetailPath(
        ticker,
        isKrxTicker(ticker) ? "KRX" : isNgxTicker(ticker) ? "NGX" : "US",
      ),
    );
  }, [data.krx, data.ngx, data.topMovers, data.watchlist, router, searchQuery]);

  const visibleCount =
    market === "KRX"
      ? filtered.krx.length
      : market === "NGX"
        ? filtered.ngx.length
        : filtered.watchlist.length + filtered.topMovers.length;
  const otherMarkets = (
    [
      { next: "US" as const, label: "Show United States", count: filtered.watchlist.length + filtered.topMovers.length },
      { next: "NGX" as const, label: "Show Nigeria", count: filtered.ngx.length },
      { next: "KRX" as const, label: "Show South Korea", count: filtered.krx.length },
    ] as const
  ).filter((option) => option.next !== market && option.count > 0);
  const otherMarket =
    searchQuery.trim() && visibleCount === 0 ? otherMarkets[0] ?? null : null;

  return (
    <div className="min-h-screen flex-1 overflow-y-auto overflow-x-hidden bg-black px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-white">Stock options</h1>
          <MarketMenu value={market} onChange={chooseMarket} />
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                openTickerFromSearch();
              }
            }}
            placeholder="Search symbol or name"
            aria-label="Search stocks by symbol or company name"
            className="w-full border-0 bg-zinc-900 pl-10 text-white placeholder:text-zinc-500"
          />
        </div>
      </div>
      {otherMarket && (
        <button
          type="button"
          onClick={() => chooseMarket(otherMarket.next)}
          className="mb-4 text-sm text-zinc-300 underline-offset-2 hover:text-white hover:underline"
        >
          {otherMarket.label}
        </button>
      )}

      <PersonalWatchlist />

      {market === "NGX" || market === "KRX" ? (
        <ExchangeBoard
          {...boardCopy(market)}
          stocks={market === "KRX" ? filtered.krx : filtered.ngx}
          loading={loading}
          error={error}
          onRetry={() => void load()}
        />
      ) : (
        <section className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">AI Stock Signals</h2>
            <span className="text-xs text-zinc-500">
              {loading && !error
                ? "Loading…"
                : `Updated ${relativeTime(data.lastUpdated)}`}
            </span>
          </div>
          <RecommendationsGrid
            watchlist={filtered.watchlist}
            topMovers={filtered.topMovers}
            loading={loading}
            error={error}
            onRetry={() => void load()}
          />
        </section>
      )}

      {market === "US" && (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <HeatMap watchlist={filtered.watchlist} loading={loading} />
        </div>
        <div className="lg:col-span-4">
          <TopNewsList articles={news} loading={newsLoading} />
        </div>
        <div className="lg:col-span-4">
          <TopGainers stocks={filtered.watchlist} />
        </div>
      </div>
      )}
    </div>
  );
}
