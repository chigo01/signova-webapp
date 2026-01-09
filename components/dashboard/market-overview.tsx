"use client";

import { useEffect, useState } from "react";
import { ArrowUp, ArrowDown, Loader2 } from "lucide-react";

interface MarketData {
  symbol: string;
  price: number;
  change: number;
}

interface FrankfurterResponse {
  rates: Record<string, number>;
  date: string;
}

// Define which pairs to display. We'll calculate cross rates from EUR base.
const FOREX_PAIRS = [
  { symbol: "EURUSD", base: "EUR", quote: "USD" },
  { symbol: "GBPUSD", base: "GBP", quote: "USD" },
  { symbol: "USDJPY", base: "USD", quote: "JPY" },
  { symbol: "AUDUSD", base: "AUD", quote: "USD" },
  { symbol: "USDCAD", base: "USD", quote: "CAD" },
  { symbol: "USDCHF", base: "USD", quote: "CHF" },
];

interface MarketOverviewProps {
  selectedPair?: string;
  onSelectPair?: (symbol: string) => void;
}

export function MarketOverview({
  selectedPair,
  onSelectPair,
}: MarketOverviewProps) {
  const [markets, setMarkets] = useState<MarketData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRates = async () => {
      try {
        // Fetch today's rates
        const res = await fetch("https://api.frankfurter.dev/v1/latest");
        const data: FrankfurterResponse = await res.json();

        // Fetch yesterday's rates for change calculation
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];
        const prevRes = await fetch(
          `https://api.frankfurter.dev/v1/${yesterdayStr}`
        );
        const prevData: FrankfurterResponse = await prevRes.json();

        // Calculate rates for each pair
        // Frankfurter returns rates with EUR as base (e.g., EUR/USD = 1.09)
        const eurRates = { EUR: 1, ...data.rates };
        const prevEurRates = { EUR: 1, ...prevData.rates };

        const calculated: MarketData[] = FOREX_PAIRS.map((pair) => {
          // Cross rate: BASE/QUOTE = (EUR/QUOTE) / (EUR/BASE)
          const baseRate = eurRates[pair.base as keyof typeof eurRates] || 1;
          const quoteRate = eurRates[pair.quote as keyof typeof eurRates] || 1;
          const price = quoteRate / baseRate;

          const prevBaseRate =
            prevEurRates[pair.base as keyof typeof prevEurRates] || 1;
          const prevQuoteRate =
            prevEurRates[pair.quote as keyof typeof prevEurRates] || 1;
          const prevPrice = prevQuoteRate / prevBaseRate;

          const change = ((price - prevPrice) / prevPrice) * 100;

          return {
            symbol: pair.symbol,
            price,
            change: parseFloat(change.toFixed(2)),
          };
        });

        setMarkets(calculated);
      } catch (err) {
        console.error("Failed to fetch forex rates:", err);
        // Fallback to static data on error
        setMarkets([
          { symbol: "EURUSD", price: 1.0924, change: 0 },
          { symbol: "GBPUSD", price: 1.275, change: 0 },
          { symbol: "USDJPY", price: 144.8, change: 0 },
          { symbol: "AUDUSD", price: 0.654, change: 0 },
          { symbol: "USDCAD", price: 1.342, change: 0 },
          { symbol: "USDCHF", price: 0.88, change: 0 },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchRates();
  }, []);

  return (
    <div className="h-full rounded-xl border border-border bg-card p-4 shadow-sm">
      <h3 className="mb-4 font-semibold text-card-foreground">Market Watch</h3>
      {loading ? (
        <div className="flex items-center justify-center py-8 text-zinc-500">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Loading rates...
        </div>
      ) : (
        <div className="space-y-1">
          {markets.map((m) => (
            <div
              key={m.symbol}
              onClick={() => onSelectPair?.(m.symbol)}
              className={`flex items-center justify-between rounded-lg p-2 cursor-pointer transition-colors ${
                selectedPair === m.symbol
                  ? "bg-primary/10 ring-1 ring-primary"
                  : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              }`}
            >
              <div className="flex flex-col">
                <span className="font-bold text-sm text-foreground">
                  {m.symbol}
                </span>
                <span className="text-xs text-zinc-500">Forex</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="font-mono text-sm font-medium">
                  {m.price.toFixed(m.symbol.includes("JPY") ? 2 : 4)}
                </span>
                <span
                  className={`flex items-center text-xs ${
                    m.change >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {m.change >= 0 ? (
                    <ArrowUp className="w-3 h-3 mr-0.5" />
                  ) : (
                    <ArrowDown className="w-3 h-3 mr-0.5" />
                  )}
                  {Math.abs(m.change)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
