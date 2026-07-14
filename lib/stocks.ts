import { API_URL } from "@/lib/config";
import { getAuthToken } from "@/lib/cookies";
import type { SectorNode } from "@/lib/marketData";

export interface StockRecommendation {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  sector: string;
  marketCap: number;
  technicalSignal: string;
  technicalCount: { buy: number; neutral: number; sell: number };
  adx: number;
  trending: boolean;
  recommendation: "BUY" | "HOLD" | "SELL";
  confidence: number;
  reasons: string[];
}

export interface StockRecommendationsResponse {
  watchlist: StockRecommendation[];
  topMovers: StockRecommendation[];
  lastUpdated: string;
}

export interface NewsArticle {
  id: number;
  symbol: string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  image: string;
  datetime: number;
}

export interface TopNewsResponse {
  articles: NewsArticle[];
  lastUpdated: string;
}

export type StockNewsDeliveryMode = "off" | "immediate" | "daily";

export interface WatchlistItem {
  symbol: string;
  companyName?: string;
  status: "active" | "plan_paused";
  alertsActiveSince: string;
  addedAt: string;
}

export interface WatchlistResponse {
  items: WatchlistItem[];
  effectivePlan: "free" | "pro";
  limit: number | null;
  activeCount: number;
  preferences: {
    delivery: StockNewsDeliveryMode;
    timezone: string;
    changedAt: string;
  };
}

export class WatchlistApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
  }
}

async function watchlistRequest(
  path: string,
  init: RequestInit = {},
): Promise<WatchlistResponse> {
  const token = getAuthToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...init.headers,
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      message?: string;
      code?: string;
    };
    throw new WatchlistApiError(
      body.message || `Watchlist request failed (${res.status})`,
      res.status,
      body.code,
    );
  }
  return res.json();
}

export function fetchPersonalWatchlist(): Promise<WatchlistResponse> {
  return watchlistRequest("/stocks/watchlist");
}

export function addPersonalWatchlistStock(
  symbol: string,
  preferences?: { delivery: StockNewsDeliveryMode; timezone: string },
): Promise<WatchlistResponse> {
  return watchlistRequest("/stocks/watchlist", {
    method: "POST",
    body: JSON.stringify({ symbol, ...preferences }),
  });
}

export async function removePersonalWatchlistStock(
  symbol: string,
): Promise<void> {
  const token = getAuthToken();
  const res = await fetch(
    `${API_URL}/stocks/watchlist/${encodeURIComponent(symbol)}`,
    {
      method: "DELETE",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    },
  );
  if (!res.ok && res.status !== 404) {
    throw new WatchlistApiError("Could not remove stock", res.status);
  }
}

export function setActivePersonalWatchlistStocks(
  symbols: string[],
): Promise<WatchlistResponse> {
  return watchlistRequest("/stocks/watchlist/active", {
    method: "PUT",
    body: JSON.stringify({ symbols }),
  });
}

/**
 * In-memory stale-while-revalidate cache for the stocks page.
 *
 * Module-level state persists for the lifetime of the SPA bundle, so the data
 * survives client-side navigation (e.g. opening a stock detail and returning).
 * A full browser reload starts fresh, which is fine.
 */
const STOCKS_CACHE_TTL_MS = 2 * 60 * 1000; // 2 min — background revalidate after this

interface StocksCache {
  recommendations: StockRecommendationsResponse | null;
  news: NewsArticle[] | null;
  fetchedAt: number; // epoch ms of last successful load
}

let stocksCache: StocksCache = {
  recommendations: null,
  news: null,
  fetchedAt: 0,
};

export function getStocksCache(): StocksCache {
  return stocksCache;
}

export function isStocksCacheStale(): boolean {
  return Date.now() - stocksCache.fetchedAt > STOCKS_CACHE_TTL_MS;
}

export function setStocksRecommendationsCache(
  data: StockRecommendationsResponse
): void {
  stocksCache = { ...stocksCache, recommendations: data, fetchedAt: Date.now() };
}

export function setStocksNewsCache(news: NewsArticle[]): void {
  stocksCache = { ...stocksCache, news, fetchedAt: Date.now() };
}

/** GET /stocks/recommendations — requires auth in browser (static export). */
export async function fetchStockRecommendations(): Promise<StockRecommendationsResponse> {
  const token = getAuthToken();
  const res = await fetch(`${API_URL}/stocks/recommendations`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch stock recommendations: ${res.statusText}`);
  }

  return res.json();
}

/** GET /stocks/news — top headlines across the watchlist. */
export async function fetchTopNews(): Promise<TopNewsResponse> {
  const token = getAuthToken();
  const res = await fetch(`${API_URL}/stocks/news`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch top news: ${res.statusText}`);
  }

  return res.json();
}

/** Group watchlist by sector for treemap: box size ≈ marketCap, color from technicalSignal + change. */
export function watchlistToHeatMapSectors(
  stocks: StockRecommendation[]
): SectorNode[] {
  if (stocks.length === 0) return [];

  const map = new Map<string, StockRecommendation[]>();
  for (const s of stocks) {
    const key =
      !s.sector?.trim() || s.sector.trim() === "N/A"
        ? "Other / Index"
        : s.sector.trim();
    const list = map.get(key) ?? [];
    list.push(s);
    map.set(key, list);
  }

  const sectors: SectorNode[] = [];
  for (const [name, list] of map) {
    const sorted = [...list].sort((a, b) => b.marketCap - a.marketCap);
    sectors.push({
      name,
      children: sorted.map((item) => ({
        name: item.symbol,
        size: Math.max(item.marketCap, 1),
        change: item.changePercent,
        signal: item.technicalSignal,
      })),
    });
  }

  sectors.sort(
    (a, b) =>
      b.children.reduce((acc, c) => acc + c.size, 0) -
      a.children.reduce((acc, c) => acc + c.size, 0)
  );

  return sectors;
}
