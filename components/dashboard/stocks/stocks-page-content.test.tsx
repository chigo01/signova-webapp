import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StocksPageContent } from "./stocks-page-content";

const stocksMocks = vi.hoisted(() => ({
  fetchStockRecommendations: vi.fn(),
  fetchTopNews: vi.fn(),
  getStocksCache: vi.fn(),
  isStocksCacheStale: vi.fn(),
  setStocksNewsCache: vi.fn(),
  setStocksRecommendationsCache: vi.fn(),
}));

vi.mock("@/lib/stocks", async () => {
  const actual = await vi.importActual<typeof import("@/lib/stocks")>("@/lib/stocks");
  return { ...actual, ...stocksMocks };
});

vi.mock("@/components/dashboard/stocks/personal-watchlist", () => ({
  PersonalWatchlist: () => null,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const sample = {
  watchlist: [
    {
      symbol: "AAPL",
      name: "Apple",
      price: 180,
      change: 1,
      changePercent: 0.5,
      high: 182,
      low: 178,
      sector: "Technology",
      marketCap: 3000000,
      technicalSignal: "buy",
      technicalCount: { buy: 4, neutral: 1, sell: 1 },
      adx: 28,
      trending: true,
      recommendation: "BUY" as const,
      confidence: 70,
      reasons: ["Trend"],
    },
  ],
  topMovers: [],
  ngx: [
    {
      symbol: "DANGCEM",
      name: "Dangote Cement PLC",
      price: 1050,
      change: 16,
      changePercent: 1.55,
      high: 1060,
      low: 1040,
      sector: "Non-Energy Minerals",
      marketCap: 17_414_465_332_031,
      technicalSignal: "neutral",
      technicalCount: { buy: 0, neutral: 0, sell: 0 },
      adx: 0,
      trending: false,
      recommendation: "HOLD" as const,
      confidence: 0,
      reasons: [],
      market: "NGX" as const,
      currency: "NGN" as const,
    },
  ],
  lastUpdated: "2026-09-22T10:00:00.000Z",
};

describe("Stocks page market menu", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    stocksMocks.getStocksCache.mockReturnValue({
      recommendations: sample,
      news: [],
      fetchedAt: Date.now(),
    });
    stocksMocks.isStocksCacheStale.mockReturnValue(false);
    stocksMocks.fetchStockRecommendations.mockResolvedValue(sample);
    stocksMocks.fetchTopNews.mockResolvedValue({ articles: [], lastUpdated: sample.lastUpdated });
  });

  it("shows the United States list until Nigeria is chosen", async () => {
    render(<StocksPageContent />);

    expect(await screen.findByRole("heading", { name: "AI Stock Signals" })).toBeInTheDocument();
    expect(screen.getAllByText("AAPL").length).toBeGreaterThan(0);
    expect(screen.queryByRole("heading", { name: "Nigerian Exchange" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Top News" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Market"), { target: { value: "NGX" } });

    expect(screen.getByRole("heading", { name: "Nigerian Exchange" })).toBeInTheDocument();
    expect(screen.getByText("DANGCEM")).toBeInTheDocument();
    expect(screen.getByText("₦1,050.00")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "AI Stock Signals" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Top News" })).not.toBeInTheDocument();
  });
});
