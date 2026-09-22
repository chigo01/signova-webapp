import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { StockRecommendation } from "@/lib/stocks";
import { NgxBoard } from "./ngx-board";

const dangcem: StockRecommendation = {
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
  recommendation: "HOLD",
  confidence: 0,
  reasons: [],
  market: "NGX",
  currency: "NGN",
};

describe("NgxBoard", () => {
  it("links a listing to the Nigerian chart and shows the naira price", () => {
    render(<NgxBoard stocks={[dangcem]} />);

    expect(screen.getByRole("link", { name: /DANGCEM/i })).toHaveAttribute(
      "href",
      "/dashboard/stock-detail?ticker=DANGCEM&market=ngx",
    );
    expect(screen.getByText("₦1,050.00")).toBeInTheDocument();
    expect(screen.queryByText("HOLD")).not.toBeInTheDocument();
  });

  it("keeps an unpriced listing openable", () => {
    render(<NgxBoard stocks={[{ ...dangcem, price: 0, high: 0, low: 0 }]} />);

    expect(screen.getByText("Price unavailable")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /DANGCEM/i })).toHaveAttribute(
      "href",
      "/dashboard/stock-detail?ticker=DANGCEM&market=ngx",
    );
    expect(screen.queryByText("₦0.00")).not.toBeInTheDocument();
  });

  it("says when the feed has no Nigerian board", () => {
    render(<NgxBoard stocks={[]} />);
    expect(
      screen.getByText(/not in this feed yet/i),
    ).toBeInTheDocument();
  });
});
