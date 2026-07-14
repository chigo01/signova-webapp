import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StockDetailView } from "./stock-detail-view";

const stocksMocks = vi.hoisted(() => ({
  fetchStockRecommendations: vi.fn(),
  fetchPersonalWatchlist: vi.fn(),
  addPersonalWatchlistStock: vi.fn(),
  removePersonalWatchlistStock: vi.fn(),
}));

vi.mock("@/lib/stocks", () => stocksMocks);
vi.mock("@/lib/stock-quote", () => ({
  fetchUsStockQuote: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/lib/tradingview-us-stock", () => ({
  usTickerToTradingViewSymbol: (symbol: string) => `NASDAQ:${symbol}`,
}));
vi.mock("@/components/signals/tradingview-widget", () => ({
  default: () => <div data-testid="chart" />,
}));

describe("StockDetailView personal watchlist", () => {
  beforeEach(() => {
    stocksMocks.fetchStockRecommendations.mockResolvedValue({
      watchlist: [
        {
          symbol: "META",
          name: "Meta Platforms",
          price: 500,
          change: 1,
          changePercent: 0.2,
          high: 505,
          low: 490,
          sector: "Technology",
          marketCap: 1000,
          technicalSignal: "buy",
          technicalCount: { buy: 4, neutral: 2, sell: 1 },
          adx: 30,
          trending: true,
          recommendation: "BUY",
          confidence: 80,
          reasons: ["Strong trend"],
        },
      ],
      topMovers: [],
      lastUpdated: new Date().toISOString(),
    });
    stocksMocks.fetchPersonalWatchlist.mockResolvedValue({
      items: [],
      effectivePlan: "free",
      limit: 3,
      activeCount: 0,
      preferences: {
        delivery: "off",
        timezone: "UTC",
        changedAt: new Date().toISOString(),
      },
    });
    stocksMocks.addPersonalWatchlistStock.mockResolvedValue({
      items: [
        {
          symbol: "META",
          status: "active",
          alertsActiveSince: new Date().toISOString(),
          addedAt: new Date().toISOString(),
        },
      ],
      effectivePlan: "free",
      limit: 3,
      activeCount: 1,
      preferences: {
        delivery: "immediate",
        timezone: "UTC",
        changedAt: new Date().toISOString(),
      },
    });
  });

  it("asks for delivery on the first saved stock and persists the choice", async () => {
    render(<StockDetailView symbol="meta" />);
    fireEvent.click(
      await screen.findByRole("button", { name: /add to watchlist/i }),
    );
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^immediate/i }));
    await waitFor(() => {
      expect(stocksMocks.addPersonalWatchlistStock).toHaveBeenCalledWith(
        "META",
        expect.objectContaining({ delivery: "immediate" }),
      );
    });
    expect(
      await screen.findByRole("button", { name: /saved to watchlist/i }),
    ).toBeInTheDocument();
  });
});
