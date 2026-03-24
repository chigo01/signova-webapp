import { cookies } from "next/headers";

import { API_URL } from "@/lib/config";

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
  technicalSignal: "buy" | "sell" | "neutral";
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

export async function fetchStockRecommendations(): Promise<StockRecommendationsResponse> {
  const cookieStore = cookies();
  const token = cookieStore.get("auth_token")?.value;

  const res = await fetch(`${API_URL}/stocks/recommendations`, {
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(
      `Failed to fetch stock recommendations: ${res.statusText}`
    );
  }

  return res.json();
}
