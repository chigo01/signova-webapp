"use client";

import { ChartComponent } from "@/components/charts/chart";
import { MarketOverview } from "@/components/dashboard/market-overview";
import { TechnicalIndicators } from "@/components/dashboard/technical-indicators";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Grid, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { Top5RefinedResponse } from "@/types/api";

interface ChartData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface FrankfurterTimeSeriesResponse {
  rates: Record<string, Record<string, number>>;
  start_date: string;
  end_date: string;
}

// Map pair symbols to Frankfurter currency codes
const PAIR_CONFIG: Record<string, { base: string; quote: string }> = {
  EURUSD: { base: "EUR", quote: "USD" },
  GBPUSD: { base: "GBP", quote: "USD" },
  USDJPY: { base: "USD", quote: "JPY" },
  AUDUSD: { base: "AUD", quote: "USD" },
  USDCAD: { base: "USD", quote: "CAD" },
  USDCHF: { base: "USD", quote: "CHF" },
};

export default function AnalyticsPage() {
  const [signalsData, setSignalsData] = useState<Top5RefinedResponse | null>(
    null
  );
  const [signalsLoading, setSignalsLoading] = useState(true);
  const [selectedPair, setSelectedPair] = useState<string>("EURUSD");
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [chartLoading, setChartLoading] = useState(true);

  // Fetch signals from backend
  useEffect(() => {
    const fetchSignals = async () => {
      try {
        const res = await fetch("http://localhost:8000/top5-refined");
        if (!res.ok) throw new Error("Failed to fetch signals");
        const json: Top5RefinedResponse = await res.json();
        setSignalsData(json);
      } catch (err) {
        console.error(err);
      } finally {
        setSignalsLoading(false);
      }
    };
    fetchSignals();
  }, []);

  // Fetch historical data for selected pair
  const fetchHistoricalData = useCallback(async (pair: string) => {
    setChartLoading(true);
    try {
      const config = PAIR_CONFIG[pair];
      if (!config) {
        console.error("Unknown pair:", pair);
        return;
      }

      // Calculate date range (last 150 days)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 150);

      const startStr = startDate.toISOString().split("T")[0];
      const endStr = endDate.toISOString().split("T")[0];

      // Fetch time series from Frankfurter
      const url = `https://api.frankfurter.dev/v1/${startStr}..${endStr}?to=${config.base},${config.quote}`;
      const res = await fetch(url);
      const data: FrankfurterTimeSeriesResponse = await res.json();

      // Convert to candlestick data
      // Note: Frankfurter provides end-of-day rates, so we simulate OHLC with small variations
      const dates = Object.keys(data.rates).sort();
      const eurRates = data.rates;

      const candleData: ChartData[] = dates.map((date, idx) => {
        const dayRates = { EUR: 1, ...eurRates[date] };
        const baseRate = dayRates[config.base as keyof typeof dayRates] || 1;
        const quoteRate = dayRates[config.quote as keyof typeof dayRates] || 1;
        const closePrice = quoteRate / baseRate;

        // Simulate realistic OHLC from daily close
        // Use previous day's close as today's open
        let openPrice = closePrice;
        if (idx > 0) {
          const prevDayRates = { EUR: 1, ...eurRates[dates[idx - 1]] };
          const prevBase =
            prevDayRates[config.base as keyof typeof prevDayRates] || 1;
          const prevQuote =
            prevDayRates[config.quote as keyof typeof prevDayRates] || 1;
          openPrice = prevQuote / prevBase;
        }

        // Simulate high/low with small random variations (±0.2%)
        const volatility = closePrice * 0.002;
        const high =
          Math.max(openPrice, closePrice) + Math.random() * volatility;
        const low =
          Math.min(openPrice, closePrice) - Math.random() * volatility;

        return {
          time: date,
          open: openPrice,
          high,
          low,
          close: closePrice,
        };
      });

      setChartData(candleData);
    } catch (err) {
      console.error("Failed to fetch historical data:", err);
      // Generate fallback mock data
      setChartData(
        Array.from({ length: 150 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (150 - i));
          const time = date.toISOString().split("T")[0];
          const base = 1.08 + Math.sin(i / 15) * 0.03;
          const vol = Math.random() * 0.005;
          const open = base;
          const close = base + (Math.random() - 0.5) * vol;
          const high = Math.max(open, close) + Math.random() * vol;
          const low = Math.min(open, close) - Math.random() * vol;
          return { time, open, high, low, close };
        })
      );
    } finally {
      setChartLoading(false);
    }
  }, []);

  // Fetch data when pair changes
  useEffect(() => {
    fetchHistoricalData(selectedPair);
  }, [selectedPair, fetchHistoricalData]);

  const handleSelectPair = (pair: string) => {
    setSelectedPair(pair);
  };

  return (
    <div className="flex h-screen flex-col bg-zinc-950 text-foreground overflow-hidden">
      {/* Dense Header */}
      <header className="flex h-12 items-center justify-between border-b border-border bg-card px-4 text-sm shadow-sm">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="h-4 w-px bg-border" />
          <nav className="flex gap-4">
            <button className="text-primary font-medium">
              Market Overview
            </button>
            <button className="text-zinc-500 hover:text-zinc-300">
              News Feed
            </button>
            <button className="text-zinc-500 hover:text-zinc-300">
              Screener
            </button>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-7 text-xs">
            <Grid className="mr-1 h-3 w-3" /> Customize Grid
          </Button>
          <Button size="sm" className="h-7 text-xs">
            Alerts
          </Button>
        </div>
      </header>

      {/* Main Grid */}
      <div className="flex flex-1 gap-1 overflow-hidden p-1 bg-zinc-900/50">
        {/* Left Col: Main Chart + Analysis */}
        <div className="flex flex-[3] flex-col gap-1 overflow-hidden">
          {/* Main Chart */}
          <div className="flex-[2] rounded-lg border border-border bg-card relative min-h-[300px]">
            <div className="absolute top-2 left-2 z-10 flex gap-1">
              <span className="rounded bg-black/50 px-2 py-1 text-xs font-bold text-white backdrop-blur">
                {selectedPair}
              </span>
            </div>
            {chartLoading ? (
              <div className="flex items-center justify-center h-full text-zinc-500">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                Loading chart...
              </div>
            ) : (
              <ChartComponent
                data={chartData}
                type="candlestick"
                colors={{
                  backgroundColor: "transparent",
                  textColor: "#71717a",
                }}
              />
            )}
          </div>

          {/* Bottom Analysis Panel */}
          <div className="flex-1 rounded-lg border border-border bg-card overflow-y-auto">
            <TechnicalIndicators />
          </div>
        </div>

        {/* Right Col: Watchlist & Correlations */}
        <div className="flex flex-1 flex-col gap-1 overflow-hidden">
          <div className="flex-[2] rounded-lg border border-border bg-card">
            <MarketOverview
              selectedPair={selectedPair}
              onSelectPair={handleSelectPair}
            />
          </div>
          <div className="flex-1 rounded-lg border border-border bg-card p-4 overflow-y-auto">
            <h3 className="text-xs font-semibold uppercase text-zinc-500 mb-2">
              Top 5 Signals
            </h3>
            {signalsLoading ? (
              <div className="text-xs text-zinc-500">Loading signals...</div>
            ) : signalsData &&
              signalsData.signals.filter((s) => s.screenshot?.isApproved)
                .length > 0 ? (
              <ul className="space-y-3">
                {signalsData.signals
                  .filter((s) => s.screenshot?.isApproved)
                  .map((signal, idx) => (
                    <li
                      key={idx}
                      className="flex justify-between text-xs border-b border-white/5 pb-2 last:border-0"
                    >
                      <div className="flex flex-col">
                        <span className="font-bold text-zinc-300">
                          {signal.pair}
                        </span>
                        <span
                          className={
                            signal.direction === "BUY"
                              ? "text-green-500"
                              : "text-red-500"
                          }
                        >
                          {signal.direction} @ {signal.entry}
                        </span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="font-mono text-zinc-400">
                          {signal.confidence}% Conf.
                        </span>
                        <span className="text-zinc-500">
                          {signal.timeframe}
                        </span>
                      </div>
                    </li>
                  ))}
              </ul>
            ) : (
              <div className="text-xs text-zinc-500">No signals available</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
