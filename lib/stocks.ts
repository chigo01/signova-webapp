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
