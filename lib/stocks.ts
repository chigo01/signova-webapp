import { API_URL } from "@/lib/config";
import { getAuthToken } from "@/lib/cookies";

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
